import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

// Local-disk storage for development. Swap these three functions for S3,
// Azure Blob or Cloudflare R2 in production; nothing else needs to change.
const ROOT = path.resolve(process.env.STORAGE_DIR ?? "storage");

/** Keys look like "photos/<propertyId>/<id>-lg.webp". Rejects anything else. */
function resolveKey(key: string) {
  if (!/^[a-z0-9]+(\/[a-z0-9_-]+)*\/[a-z0-9_-]+\.(webp|jpg|png|pdf)$/i.test(key)) throw new Error("Invalid storage key");
  const full = path.resolve(ROOT, key);
  if (!full.startsWith(ROOT + path.sep)) throw new Error("Invalid storage key");
  return full;
}

export async function saveFile(key: string, data: Buffer) {
  const full = resolveKey(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
}

export async function readStoredFile(key: string) {
  try {
    return await readFile(resolveKey(key));
  } catch {
    return null;
  }
}

export async function deleteFile(key: string) {
  try {
    await rm(resolveKey(key), { force: true });
  } catch {}
}

export const mediaUrl = (key: string) => `/media/${key}`;
