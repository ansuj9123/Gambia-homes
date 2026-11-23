import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";

// GET /api/properties?ids=a,b,c — public data for live listings (used by Saved and Compare).
export async function GET(req: NextRequest) {
  const ids = (req.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 100);
  if (ids.length === 0) return NextResponse.json([]);
  const rows = await db.property.findMany({
    where: { id: { in: ids }, status: "LIVE" },
    include: { agent: { select: { name: true, agency: true, phone: true, verified: true } } },
  });
  return NextResponse.json(rows);
}
