import { NextResponse, type NextRequest } from "next/server";
import { readStoredFile } from "@/lib/storage";

const TYPES: Record<string, string> = { webp: "image/webp", jpg: "image/jpeg", png: "image/png" };

// Serves uploaded photos from storage. File names are random and never reused,
// so they can be cached forever. (Private files such as reports must not go here.)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  if (!key.startsWith("photos/")) return new NextResponse("Not found", { status: 404 });
  const ext = key.split(".").pop() ?? "";
  const data = TYPES[ext] ? await readStoredFile(key) : null;
  if (!data) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "content-type": TYPES[ext],
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
