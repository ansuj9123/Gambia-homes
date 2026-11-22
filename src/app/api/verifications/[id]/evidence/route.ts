import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { caseAccess, saveEvidence, STAGES, type Stage } from "@/lib/verification";

// Upload evidence to a case: multipart "files" (photos or PDFs), "stage", optional "caption".
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await caseAccess(id);
  if (!access) return NextResponse.json({ error: "You don't have access to this case." }, { status: 403 });

  const form = await req.formData();
  const stage = String(form.get("stage") ?? "") as Stage;
  if (!(stage in STAGES)) return NextResponse.json({ error: "Unknown stage." }, { status: 400 });
  if (!access.can[stage]) return NextResponse.json({ error: "This stage isn't assigned to you." }, { status: 403 });
  if (access.order.status === "COMPLETE") return NextResponse.json({ error: "This report is already published." }, { status: 400 });

  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return NextResponse.json({ error: "Choose at least one file." }, { status: 400 });
  try {
    await saveEvidence(id, stage, files, access.user.id, String(form.get("caption") ?? "").trim() || undefined);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "Upload failed." }, { status: 400 });
  }
  revalidatePath(`/work/${id}`);
  revalidatePath(`/admin/verifications/${id}`);
  return NextResponse.json({ ok: true });
}
