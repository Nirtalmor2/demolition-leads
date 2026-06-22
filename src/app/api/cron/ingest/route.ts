// GET /api/cron/ingest — מריץ את כל ה-connectors + dedup חוצה-מקורות.
// מיועד לטריגר חיצוני יומי (Vercel Cron / GitHub Actions).
// אבטחה אופציונלית: header `Authorization: Bearer <CRON_SECRET>` אם הוגדר.
import { NextRequest, NextResponse } from "next/server";
import { CONNECTORS, getConnector } from "@/lib/connectors";
import { runConnectors } from "@/lib/ingest";
import { runCrossSourceDedup } from "@/lib/dedup";
import type { Source } from "@/lib/domain";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // שניות (serverless)

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  // ?source=URBAN_RENEWAL להרצת מקור בודד (debug)
  const sourceParam = req.nextUrl.searchParams.get("source") as Source | null;
  const connectors = sourceParam
    ? [getConnector(sourceParam)].filter(Boolean as unknown as <T>(x: T) => x is NonNullable<T>)
    : CONNECTORS;

  const results = await runConnectors(connectors);
  const dedup = await runCrossSourceDedup();

  return NextResponse.json({ ok: true, results, dedup });
}
