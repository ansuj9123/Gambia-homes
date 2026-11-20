import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { userWhoCanManage } from "@/lib/permissions";
import { addPhotos, deletePhoto, reorderPhotos } from "@/lib/photos";

type Ctx = { params: Promise<{ id: string }> };

const forbidden = () => NextResponse.json({ error: "You can't edit this listing." }, { status: 403 });
const done = (photos: unknown) => {
  revalidatePath("/", "layout");
  return NextResponse.json({ photos });
};

// Upload one or more photos (multipart field "photos").
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!(await userWhoCanManage(id))) return forbidden();
  const files = (await req.formData()).getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return NextResponse.json({ error: "Choose at least one photo." }, { status: 400 });
  try {
    return done(await addPhotos(id, files));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "Upload failed." }, { status: 400 });
  }
}

// Reorder: { order: [photoId, ...] }; the first becomes the cover.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!(await userWhoCanManage(id))) return forbidden();
  const body = (await req.json().catch(() => null)) as { order?: unknown } | null;
  if (!Array.isArray(body?.order) || !body.order.every((x) => typeof x === "string")) {
    return NextResponse.json({ error: "Invalid order." }, { status: 400 });
  }
  return done(await reorderPhotos(id, body.order as string[]));
}

// Delete: /api/listings/<id>/photos?photoId=<photoId>
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!(await userWhoCanManage(id))) return forbidden();
  const photoId = req.nextUrl.searchParams.get("photoId");
  if (!photoId) return NextResponse.json({ error: "Missing photoId." }, { status: 400 });
  return done(await deletePhoto(id, photoId));
}
