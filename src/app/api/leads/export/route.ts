// GET /api/leads/export — מייצא את כל הלידים המסוננים ל-CSV.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import {
  SOURCE_LABELS,
  STAGE_LABELS,
  STATUS_LABELS,
} from "@/lib/domain";
import type { Source, Stage, LeadStatus } from "@/lib/domain";

export const dynamic = "force-dynamic";

const HEADER =
  "כותרת,מקור,עיר,כתובת,שלב,דחיפות,יח״ד,סטטוס,נצפה לאחרונה,מוקצה,הערות\n";

function esc(v: unknown): string {
  if (v == null) return "";
  const s = String(v).replace(/"/g, '""');
  return /[",\n\r]/.test(s) ? `"${s}"` : s;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const source = sp.get("source") || undefined;
  const city = sp.get("city") || undefined;
  const status = sp.get("status") || undefined;
  const minScore = sp.get("minScore");
  const q = sp.get("q") || undefined;
  const sort = sp.get("sort") || "score";
  const dir = sp.get("dir") === "asc" ? "asc" : "desc";

  const where: Prisma.LeadWhereInput = { dupeOfId: null };
  if (source) where.source = source;
  if (status) where.status = status;
  if (city) where.city = { contains: city };
  if (minScore) where.score = { gte: Number(minScore) };
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { address: { contains: q } },
      { block: { contains: q } },
      { parcel: { contains: q } },
    ];
  }

  const orderBy: Prisma.LeadOrderByWithRelationInput =
    sort === "lastSeenAt"
      ? { lastSeenAt: dir }
      : sort === "city"
        ? { city: dir }
        : { score: dir };

  try {
    const leads = await prisma.lead.findMany({
      where,
      orderBy,
      take: 10000,
      select: {
        title: true,
        source: true,
        city: true,
        address: true,
        stage: true,
        score: true,
        units: true,
        status: true,
        lastSeenAt: true,
        assignee: true,
        _count: { select: { notes: true } },
      },
    });

    const rows = leads.map((l) =>
      [
        esc(l.title),
        esc(SOURCE_LABELS[l.source as Source] ?? l.source),
        esc(l.city),
        esc(l.address),
        esc(STAGE_LABELS[l.stage as Stage] ?? l.stage),
        l.score,
        l.units ?? "",
        esc(STATUS_LABELS[l.status as LeadStatus] ?? l.status),
        esc(fmtDate(l.lastSeenAt.toISOString())),
        esc(l.assignee),
        l._count.notes,
      ].join(",")
    );

    const csv = HEADER + rows.join("\n");
    const bom = "\uFEFF"; // BOM for Excel Hebrew

    return new NextResponse(bom + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="niro-leads.csv"',
      },
    });
  } catch (error) {
    console.error("Export failed", error);
    return NextResponse.json({ error: "export-failed" }, { status: 500 });
  }
}
