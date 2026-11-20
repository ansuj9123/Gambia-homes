import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { db } from "./db";
import { deleteFile, mediaUrl, saveFile } from "./storage";

export const MAX_PHOTOS = 20;
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const ACCEPTED = new Set(["jpeg", "png", "webp", "heif", "avif"]);

export type PhotoJson = { id: string; src: string; thumb: string; w: number; h: number };

/**
 * Resizes, auto-rotates and re-encodes as WebP. Re-encoding drops all metadata,
 * including EXIF GPS, so public photos never reveal where they were taken.
 */
async function processImage(input: Buffer) {
  const meta = await sharp(input).metadata();
  if (!meta.format || !ACCEPTED.has(meta.format)) throw new Error("Please upload JPEG, PNG, WebP or HEIC photos.");
  if ((meta.width ?? 0) < 400 || (meta.height ?? 0) < 300) throw new Error("Photos must be at least 400 × 300 pixels.");

  const base = sharp(input, { failOn: "error" }).rotate();
  const large = await base.clone().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
  const thumb = await base.clone().resize({ width: 640, height: 480, fit: "cover" }).webp({ quality: 72 }).toBuffer();
  return { large: large.data, width: large.info.width, height: large.info.height, thumb };
}

/** Rebuilds the cached Property.photos JSON from PropertyPhoto rows. */
export async function syncPhotoCache(propertyId: string) {
  const rows = await db.propertyPhoto.findMany({ where: { propertyId }, orderBy: { position: "asc" } });
  const json: PhotoJson[] = rows.map((r) => ({ id: r.id, src: mediaUrl(r.key), thumb: mediaUrl(r.thumbKey), w: r.width, h: r.height }));
  await db.property.update({ where: { id: propertyId }, data: { photos: JSON.stringify(json) } });
  return json;
}

export async function addPhotos(propertyId: string, files: File[]) {
  const existing = await db.propertyPhoto.count({ where: { propertyId } });
  if (existing + files.length > MAX_PHOTOS) throw new Error(`A listing can have up to ${MAX_PHOTOS} photos.`);

  let position = existing;
  for (const file of files) {
    if (file.size > MAX_UPLOAD_BYTES) throw new Error(`"${file.name}" is too large (max 12 MB).`);
    const processed = await processImage(Buffer.from(await file.arrayBuffer()));
    const id = randomUUID().replace(/-/g, "");
    const key = `photos/${propertyId}/${id}-lg.webp`;
    const thumbKey = `photos/${propertyId}/${id}-sm.webp`;
    await saveFile(key, processed.large);
    await saveFile(thumbKey, processed.thumb);
    await db.propertyPhoto.create({
      data: { propertyId, key, thumbKey, width: processed.width, height: processed.height, position: position++ },
    });
  }
  return syncPhotoCache(propertyId);
}

export async function deletePhoto(propertyId: string, photoId: string) {
  const photo = await db.propertyPhoto.findFirst({ where: { id: photoId, propertyId } });
  if (!photo) return syncPhotoCache(propertyId);
  await db.propertyPhoto.delete({ where: { id: photo.id } });
  await Promise.all([deleteFile(photo.key), deleteFile(photo.thumbKey)]);
  const rest = await db.propertyPhoto.findMany({ where: { propertyId }, orderBy: { position: "asc" } });
  await db.$transaction(rest.map((r, i) => db.propertyPhoto.update({ where: { id: r.id }, data: { position: i } })));
  return syncPhotoCache(propertyId);
}

/** Saves a new order. The first id becomes the cover photo. */
export async function reorderPhotos(propertyId: string, orderedIds: string[]) {
  const rows = await db.propertyPhoto.findMany({ where: { propertyId }, select: { id: true } });
  const known = new Set(rows.map((r) => r.id));
  const ordered = orderedIds.filter((id) => known.has(id));
  const rest = rows.map((r) => r.id).filter((id) => !ordered.includes(id));
  await db.$transaction([...ordered, ...rest].map((id, i) => db.propertyPhoto.update({ where: { id }, data: { position: i } })));
  return syncPhotoCache(propertyId);
}

export function parsePhotos(json: string | null | undefined): PhotoJson[] {
  try {
    const v = JSON.parse(json ?? "[]");
    return Array.isArray(v) ? v.filter((p) => p && typeof p.src === "string") : [];
  } catch {
    return [];
  }
}
