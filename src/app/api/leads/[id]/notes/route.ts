// POST /api/leads/:id/notes — הוספת הערה לליד.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await req.json()) as { body?: string; author?: string };
  if (!body.body?.trim()) {
    return NextResponse.json({ error: "empty note" }, { status: 400 });
  }
  const note = await prisma.note.create({
    data: { leadId: id, body: body.body.trim(), author: body.author || null },
  });
  return NextResponse.json({ note });
}
