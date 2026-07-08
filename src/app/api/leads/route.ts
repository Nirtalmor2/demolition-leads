// GET /api/leads — רשימת לידים עם סינון (מקור/עיר/סטטוס/score) ומיון.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const source = sp.get("source") || undefined;
  const city = sp.get("city") || undefined;
  const status = sp.get("status") || undefined;
  const minScore = sp.get("minScore");
  const q = sp.get("q") || undefined;
  const sort = sp.get("sort") || "score"; // score | lastSeenAt | city
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
      take: 5000,
      // לא מחזירים rawData ברשימה (מטען כבד) — הוא נטען רק בכרטיס ליד בודד.
      select: {
        id: true,
        source: true,
        externalId: true,
        title: true,
        url: true,
        address: true,
        city: true,
        block: true,
        parcel: true,
        lat: true,
        lng: true,
        stage: true,
        expectedMonths: true,
        units: true,
        score: true,
        status: true,
        assignee: true,
        firstSeenAt: true,
        lastSeenAt: true,
        _count: { select: { notes: true } },
      },
    });

    return NextResponse.json({ count: leads.length, leads });
  } catch (error) {
    console.error("Failed to load leads from database", error);
    return NextResponse.json(
      { count: 0, leads: [], warning: "database-unavailable" },
      { status: 200 }
    );
  }
}
