// GET /api/admin/init?token=... — יצירת סכמת ה-DB פעם אחת מתוך ה-runtime של Vercel
// (ה-runtime מגיע ל-Neon; ה-build ורשת מקומית חסומים בפורט 5432). אידמפוטנטי.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// משפטי DDL אידמפוטנטיים (תואמים ל-prisma/migrations/0_init).
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "Lead" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "address" TEXT,
    "city" TEXT,
    "block" TEXT,
    "parcel" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "stage" TEXT NOT NULL,
    "expectedMonths" INTEGER,
    "units" INTEGER,
    "score" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "assignee" TEXT,
    "dupeOfId" TEXT,
    "rawData" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "Note" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "author" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "IngestRun" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished" TIMESTAMP(3),
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    CONSTRAINT "IngestRun_pkey" PRIMARY KEY ("id")
  )`,
  // העשרת יזם (מדלן) — נוסף אחרי הסכמה המקורית, לכן ALTER אידמפוטנטי.
  `ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "developer" TEXT`,
  `ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "developerUrl" TEXT`,
  `ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "developerSource" TEXT`,
  `CREATE INDEX IF NOT EXISTS "Lead_city_idx" ON "Lead"("city")`,
  `CREATE INDEX IF NOT EXISTS "Lead_status_idx" ON "Lead"("status")`,
  `CREATE INDEX IF NOT EXISTS "Lead_source_idx" ON "Lead"("source")`,
  `CREATE INDEX IF NOT EXISTS "Lead_score_idx" ON "Lead"("score")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Lead_source_externalId_key" ON "Lead"("source", "externalId")`,
  `CREATE INDEX IF NOT EXISTS "Note_leadId_idx" ON "Note"("leadId")`,
];

// ה-FK בנפרד — Postgres לא תומך ב-IF NOT EXISTS ל-ADD CONSTRAINT, לכן עוטפים ב-DO.
const FK_STATEMENT = `DO $$ BEGIN
  ALTER TABLE "Note" ADD CONSTRAINT "Note_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;`;

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const expected = process.env.ADMIN_TOKEN || "niro-setup";
  if (token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const done: string[] = [];
  try {
    for (const sql of STATEMENTS) {
      await prisma.$executeRawUnsafe(sql);
      done.push(sql.slice(0, 48).replace(/\s+/g, " "));
    }
    await prisma.$executeRawUnsafe(FK_STATEMENT);
    done.push("FK Note_leadId_fkey");

    const leadCount = await prisma.lead.count();
    return NextResponse.json({ ok: true, statements: done.length, leadCount });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err), completed: done },
      { status: 500 }
    );
  }
}
