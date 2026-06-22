// GET /api/admin/purge?source=GOV_TENDER&token=... — מחיקת לידים של מקור שהוסר.
// משמש לניקוי חד-פעמי כשמסירים connector מהפרויקט.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const expected = process.env.ADMIN_TOKEN || "niro-setup";
  if (token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const source = req.nextUrl.searchParams.get("source");
  if (!source) {
    return NextResponse.json({ error: "missing source" }, { status: 400 });
  }

  const deleted = await prisma.lead.deleteMany({ where: { source } });
  return NextResponse.json({ ok: true, source, deleted: deleted.count });
}
