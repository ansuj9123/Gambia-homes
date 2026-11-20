import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";

// GET /api/properties?ids=a,b,c — public card data for live listings (used by Saved).
export async function GET(req: NextRequest) {
  const ids = (req.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 100);
  if (ids.length === 0) return NextResponse.json([]);
  const rows = await db.property.findMany({ where: { id: { in: ids }, status: "LIVE" } });
  return NextResponse.json(rows);
}
