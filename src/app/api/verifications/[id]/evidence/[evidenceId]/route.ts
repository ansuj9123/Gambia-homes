import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { deleteFile, readStoredFile } from "@/lib/storage";
import { caseAccess } from "@/lib/verification";

type Ctx = { params: Promise<{ id: string; evidenceId: string }> };

async function load(id: string, evidenceId: string) {
  const access = await caseAccess(id);
  if (!access) return null;
  const item = await db.verificationEvidence.findFirst({ where: { id: evidenceId, orderId: id } });
  return item ? { access, item } : null;
}

// View or download one evidence file (admins and partners on the case only).
export async function GET(req: NextRequest, { params }: Ctx) {
  const { id, evidenceId } = await params;
  const found = await load(id, evidenceId);
  if (!found) return new NextResponse("Not found", { status: 404 });
  const data = await readStoredFile(found.item.key);
  if (!data) return new NextResponse("File missing", { status: 404 });
  const pdf = found.item.kind === "DOCUMENT";
  const download = req.nextUrl.searchParams.has("download");
  const name = found.item.fileName.replace(/[^\w.\- ]/g, "_");
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "content-type": pdf ? "application/pdf" : "image/jpeg",
      "content-disposition": `${download ? "attachment" : "inline"}; filename="${name}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

// Remove a file before the report is published (the uploader or an admin).
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id, evidenceId } = await params;
  const found = await load(id, evidenceId);
  if (!found) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const { access, item } = found;
  if (!access.isAdmin && item.uploadedById !== access.user.id) return NextResponse.json({ error: "Only the uploader can remove this." }, { status: 403 });
  if (access.order.status === "COMPLETE") return NextResponse.json({ error: "This report is already published." }, { status: 400 });
  await db.verificationEvidence.delete({ where: { id: item.id } });
  await deleteFile(item.key);
  revalidatePath(`/work/${id}`);
  revalidatePath(`/admin/verifications/${id}`);
  return NextResponse.json({ ok: true });
}
