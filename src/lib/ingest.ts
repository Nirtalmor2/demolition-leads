// צינור ה-ingest האחיד (סעיף 7): fetchRaw → toLead → validate → score → upsert(dedup).
// כולל לוג ריצה (IngestRun) וטיפול בשגיאות פר-רשומה.
import { prisma } from "@/lib/db";
import {
  NormalizedLeadSchema,
  expectedMonthsForStage,
  scoreLead,
  type NormalizedLead,
} from "@/lib/domain";
import type { Connector } from "@/lib/connectors/types";

export interface IngestResult {
  source: string;
  created: number;
  updated: number;
  errors: number;
  total: number;
  message?: string;
}

/** upsert של ליד מנורמל יחיד לפי (source, externalId). מחזיר 'created' | 'updated'. */
async function upsertLead(lead: NormalizedLead): Promise<"created" | "updated"> {
  const score = scoreLead(lead.stage, lead.units);
  const expectedMonths = expectedMonthsForStage(lead.stage);

  const existing = await prisma.lead.findUnique({
    where: {
      source_externalId: { source: lead.source, externalId: lead.externalId },
    },
    select: { id: true },
  });

  const data = {
    title: lead.title,
    url: lead.url ?? null,
    address: lead.address ?? null,
    city: lead.city ?? null,
    block: lead.block ?? null,
    parcel: lead.parcel ?? null,
    lat: lead.lat ?? null,
    lng: lead.lng ?? null,
    stage: lead.stage,
    units: lead.units ?? null,
    expectedMonths,
    score,
    rawData: JSON.stringify(lead.rawData ?? {}),
  };

  if (existing) {
    // קיים — מעדכנים שלב/score/מיקום ו-lastSeenAt (לא נוגעים ב-status/assignee/notes).
    await prisma.lead.update({ where: { id: existing.id }, data });
    return "updated";
  }

  await prisma.lead.create({
    data: { source: lead.source, externalId: lead.externalId, ...data },
  });
  return "created";
}

/** מריץ connector בודד מקצה לקצה, עם לוג IngestRun. */
export async function runConnector(connector: Connector): Promise<IngestResult> {
  const run = await prisma.ingestRun.create({
    data: { source: connector.source },
  });

  let created = 0;
  let updated = 0;
  let errors = 0;
  let total = 0;
  let message: string | undefined;

  try {
    const raws = await connector.fetchRaw();
    total = raws.length;

    for (const raw of raws) {
      try {
        const normalized = connector.toLead(raw);
        if (!normalized) continue; // לא רלוונטי — דילוג שקט

        const parsed = NormalizedLeadSchema.safeParse(normalized);
        if (!parsed.success) {
          errors++;
          continue;
        }

        const result = await upsertLead(parsed.data);
        if (result === "created") created++;
        else updated++;
      } catch {
        errors++;
      }
    }
    message = `נמשכו ${total} רשומות`;
  } catch (err) {
    errors++;
    message = `כשל במשיכה: ${String(err)}`;
  }

  await prisma.ingestRun.update({
    where: { id: run.id },
    data: { finished: new Date(), created, updated, errors, message },
  });

  return { source: connector.source, created, updated, errors, total, message };
}

/** מריץ רשימת connectors ברצף ומחזיר סיכום לכל אחד. */
export async function runConnectors(
  connectors: Connector[]
): Promise<IngestResult[]> {
  const results: IngestResult[] = [];
  for (const c of connectors) {
    results.push(await runConnector(c));
  }
  return results;
}
