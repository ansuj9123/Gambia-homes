import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { readStoredFile } from "@/lib/storage";

const sameToken = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * Download a published report. Allowed for the buyer's account, admins, or anyone
 * holding the private link from the "report ready" email (?token=...), so buyers
 * who ordered without an account can still get it.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const order = await db.verificationOrder.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, accessToken: true, reportKey: true, reportPublishedAt: true, property: { select: { slug: true } } },
  });
  if (!order?.reportKey || !order.reportPublishedAt) return new NextResponse("Report not available", { status: 404 });

  const token = req.nextUrl.searchParams.get("token") ?? "";
  const session = await auth();
  const allowed =
    (token && sameToken(token, order.accessToken)) ||
    session?.user?.role === "ADMIN" ||
    (order.userId !== null && session?.user?.id === order.userId);
  if (!allowed) return new NextResponse("Not found", { status: 404 });

  const data = await readStoredFile(order.reportKey);
  if (!data) return new NextResponse("Report file missing", { status: 404 });
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="gambia-homes-verification-${order.property.slug}.pdf"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
