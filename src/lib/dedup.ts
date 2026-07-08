// dedup חוצה-מקורות (סעיף 7.5). ב-PostGIS זה spatial query; כאן (SQLite) ברמת האפליקציה:
// מסמנים לידים שונים שמתייחסים לאותו נכס לפי (א) גוש/חלקה זהים, או (ב) קרבה גאוגרפית.
// הליד הראשי = ה-score הגבוה ביותר; השאר מקבלים dupeOfId ומוסתרים מהרשימה.
import { prisma } from "@/lib/db";
import { haversineMeters } from "@/lib/geo";

const PROXIMITY_METERS = 60; // לידים בתוך 60מ' זה מזה = מועמדים לכפילות חוצת-מקורות

export interface DedupResult {
  groups: number;
  marked: number;
}

/**
 * סורק את כל הלידים, מאחד כפילויות חוצות-מקורות, ומסמן dupeOfId.
 * רץ אחרי כל ה-ingest (idempotent — מאפס סימונים ומחשב מחדש).
 */
export async function runCrossSourceDedup(): Promise<DedupResult> {
  // איפוס סימונים קודמים
  await prisma.lead.updateMany({ data: { dupeOfId: null } });

  const leads = await prisma.lead.findMany({
    select: {
      id: true,
      source: true,
      block: true,
      parcel: true,
      lat: true,
      lng: true,
      score: true,
    },
  });

  // Union-Find לאיחוד קבוצות כפילות
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    let c = x;
    while (parent.get(c) !== r) {
      const next = parent.get(c)!;
      parent.set(c, r);
      c = next;
    }
    return r;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const l of leads) parent.set(l.id, l.id);

  // אינדקס גוש/חלקה
  const byParcel = new Map<string, string[]>();
  for (const l of leads) {
    if (l.block && l.parcel) {
      const key = `${l.block.trim()}/${l.parcel.trim()}`;
      (byParcel.get(key) ?? byParcel.set(key, []).get(key)!).push(l.id);
    }
  }
  for (const ids of byParcel.values()) {
    for (let i = 1; i < ids.length; i++) union(ids[0], ids[i]);
  }

  // קרבה גאוגרפית — O(n²) על מי שיש לו מיקום (ל-POC מספיק; ב-PostGIS index מרחבי)
  const geo = leads.filter(
    (l) => typeof l.lat === "number" && typeof l.lng === "number"
  );
  for (let i = 0; i < geo.length; i++) {
    for (let j = i + 1; j < geo.length; j++) {
      const a = geo[i];
      const b = geo[j];
      if (a.source === b.source) continue; // dedup חוצה-מקורות בלבד
      const d = haversineMeters(
        { lat: a.lat!, lng: a.lng! },
        { lat: b.lat!, lng: b.lng! }
      );
      if (d <= PROXIMITY_METERS) union(a.id, b.id);
    }
  }

  // לכל קבוצה: הראשי = score הגבוה ביותר; השאר → dupeOfId
  const groups = new Map<string, string[]>();
  for (const l of leads) {
    const root = find(l.id);
    (groups.get(root) ?? groups.set(root, []).get(root)!).push(l.id);
  }

  const scoreById = new Map(leads.map((l) => [l.id, l.score]));
  let marked = 0;
  let groupCount = 0;

  for (const ids of groups.values()) {
    if (ids.length < 2) continue;
    groupCount++;
    const primary = ids.reduce((best, id) =>
      (scoreById.get(id) ?? 0) > (scoreById.get(best) ?? 0) ? id : best
    );
    const dupes = ids.filter((id) => id !== primary);
    await prisma.lead.updateMany({
      where: { id: { in: dupes } },
      data: { dupeOfId: primary },
    });
    marked += dupes.length;
  }

  return { groups: groupCount, marked };
}
