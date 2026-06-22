// POST /api/leads/:id/madlan — חילוץ שם היזם ושמירתו על הליד.
//   ללא body         → מדלן קודם: איתור דף הפרויקט במדלן לפי כתובת (מקור מאומת).
//   { web: true }    → הרחבה: חיפוש כללי ברשת + Gemini (מקור לא-מאומת, אופציונלי).
//   { url: "<proj>" } → הדבקה ידנית של דף פרויקט במדלן (מקור מאומת).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  fetchMadlanDeveloper,
  isMadlanProjectUrl,
  resolveMadlanByAddress,
  MadlanBlockedError,
} from "@/lib/madlan";
import { lookupDeveloper } from "@/lib/developerLookup";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // בקשות דרך ScraperAPI איטיות יותר (עקיפת אנטי-בוט)

type Body = { url?: string; web?: boolean };
type Saved = { name: string; url: string | null; source: "madlan" | "web" };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { url, web } = (await req.json().catch(() => ({}))) as Body;

  const lead = await prisma.lead.findUnique({
    where: { id },
    select: { id: true, address: true, city: true },
  });
  if (!lead) return NextResponse.json({ error: "ליד לא נמצא" }, { status: 404 });

  let dev: Saved | null = null;

  if (url) {
    // ── מסלול ידני — URL מודבק לדף פרויקט במדלן ──
    if (!isMadlanProjectUrl(url)) {
      return NextResponse.json(
        { error: "נדרש קישור תקין לדף פרויקט במדלן (madlan.co.il/projects/...)" },
        { status: 400 }
      );
    }
    let m;
    try {
      m = await fetchMadlanDeveloper(url);
    } catch {
      return NextResponse.json(
        { error: "מדלן חסם את הבקשה או שהדף לא נגיש כרגע. נסה שוב מאוחר יותר." },
        { status: 502 }
      );
    }
    if (!m) {
      return NextResponse.json({ error: "לא נמצא יזם מוגדר בדף הזה." }, { status: 404 });
    }
    dev = { name: m.name, url: m.url, source: "madlan" };
  } else if (web) {
    // ── מסלול הרחבה — חיפוש כללי ברשת (לא מאומת), רק בבקשה מפורשת ──
    if (!lead.address) {
      return NextResponse.json({ error: "לליד אין כתובת לחיפוש." }, { status: 422 });
    }
    let hit;
    try {
      hit = await lookupDeveloper(lead.address, lead.city);
    } catch (e) {
      console.error("[developer web] lookup failed:", e);
      return NextResponse.json(
        { error: "החיפוש נכשל כרגע (חסימה/מכסה). נסה שוב מאוחר יותר." },
        { status: 502 }
      );
    }
    if (!hit) {
      return NextResponse.json(
        { error: "לא נמצא יזם לכתובת הזו גם בחיפוש הרשת." },
        { status: 404 }
      );
    }
    dev = { name: hit.name, url: hit.sourceUrl, source: "web" };
  } else {
    // ── מסלול ברירת-מחדל — מדלן קודם (מקור מאומת) ──
    if (!lead.address) {
      return NextResponse.json(
        { error: "לליד אין כתובת לאיתור. הדבק קישור ידנית." },
        { status: 422 }
      );
    }
    let resolved;
    try {
      resolved = await resolveMadlanByAddress(lead.address, lead.city);
    } catch (e) {
      if (e instanceof MadlanBlockedError) {
        return NextResponse.json(
          { error: "מדלן חסם את הבקשה כרגע. נסה שוב מאוחר יותר." },
          { status: 502 }
        );
      }
      console.error("[madlan auto] resolve failed:", e);
      return NextResponse.json(
        { error: "החיפוש נכשל כרגע. נסה שוב מאוחר יותר." },
        { status: 502 }
      );
    }
    if (!resolved) {
      // לא נמצא פרויקט במדלן — סימון שמאפשר ל-UI להציע הרחבה לחיפוש רשת.
      return NextResponse.json(
        {
          error: "לא נמצא פרויקט במדלן לכתובת זו.",
          notFoundInMadlan: true,
        },
        { status: 404 }
      );
    }
    dev = { name: resolved.developer.name, url: resolved.developer.url, source: "madlan" };
  }

  const updated = await prisma.lead.update({
    where: { id },
    data: { developer: dev.name, developerUrl: dev.url, developerSource: dev.source },
    select: { developer: true, developerUrl: true, developerSource: true },
  });

  return NextResponse.json(updated);
}
