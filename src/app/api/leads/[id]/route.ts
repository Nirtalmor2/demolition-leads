// GET    /api/leads/:id        — ליד בודד + הערות
// PATCH  /api/leads/:id        — עדכון status / assignee
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/domain";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: { notes: { orderBy: { createdAt: "desc" } } },
    });
    if (!lead) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ lead });
  } catch (error) {
    console.error("Failed to load lead from database", error);
    return NextResponse.json({ error: "database-unavailable" }, { status: 503 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as { status?: string; assignee?: string | null };

    const data: { status?: string; assignee?: string | null } = {};
    if (body.status !== undefined) {
      if (!LEAD_STATUSES.includes(body.status as LeadStatus)) {
        return NextResponse.json({ error: "invalid status" }, { status: 400 });
      }
      data.status = body.status;
    }
    if (body.assignee !== undefined) data.assignee = body.assignee || null;

    const lead = await prisma.lead.update({ where: { id }, data });
    return NextResponse.json({ lead });
  } catch (error) {
    console.error("Failed to update lead in database", error);
    return NextResponse.json({ error: "database-unavailable" }, { status: 503 });
  }
}
