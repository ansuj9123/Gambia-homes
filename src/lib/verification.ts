import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { auth } from "@/auth";
import { db } from "./db";
import { saveFile } from "./storage";

export const STAFF_ROLES = [
  { value: "FIELD_AGENT", label: "Field agent" },
  { value: "LAWYER", label: "Partner lawyer" },
  { value: "SURVEYOR", label: "Surveyor" },
] as const;
export type StaffRole = (typeof STAFF_ROLES)[number]["value"];

export const STAGES = {
  SITE: { label: "Site visit", role: "FIELD_AGENT" },
  SURVEY: { label: "GPS survey", role: "SURVEYOR" },
  REGISTRY: { label: "Registry search", role: "LAWYER" },
} as const;
export type Stage = keyof typeof STAGES;

export const OUTCOMES = [
  { value: "VERIFIED", label: "Verified: no problems found", tone: "good" },
  { value: "ISSUES_FOUND", label: "Issues found", tone: "bad" },
  { value: "COULD_NOT_VERIFY", label: "Could not verify", tone: "warn" },
] as const;

export const REGISTRY_OUTCOMES = [
  { value: "CLEAR", label: "Clear: seller's right to sell confirmed" },
  { value: "ISSUES", label: "Issues found" },
  { value: "UNABLE", label: "Unable to confirm" },
] as const;

export type GpsPoint = { lat: number; lng: number; label?: string };

export function parseGps(json: string | null | undefined): GpsPoint[] {
  try {
    const v = JSON.parse(json ?? "[]");
    return Array.isArray(v) ? v.filter((p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lng)) : [];
  } catch {
    return [];
  }
}

/** "13.27, -16.65, NE corner" per line → points. Returns an error message for bad lines. */
export function parseGpsLines(text: string): { points: GpsPoint[] } | { error: string } {
  const points: GpsPoint[] = [];
  for (const [i, raw] of text.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line) continue;
    const [latS, lngS, ...rest] = line.split(",");
    const lat = Number(latS);
    const lng = Number(lngS);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 13 || lat > 13.9 || lng < -16.9 || lng > -13.7) {
      return { error: `Line ${i + 1}: use "latitude, longitude, label" with a point inside The Gambia, e.g. 13.2745, -16.6512, NE corner` };
    }
    points.push({ lat, lng, label: rest.join(",").trim() || undefined });
  }
  if (points.length > 50) return { error: "Up to 50 GPS points." };
  return { points };
}

export const gpsToLines = (points: GpsPoint[]) => points.map((p) => `${p.lat}, ${p.lng}${p.label ? `, ${p.label}` : ""}`).join("\n");

/**
 * Who is looking at this case and what they may do. Admins can do everything;
 * partners only see cases assigned to them, and only edit their own stage.
 */
export async function caseAccess(orderId: string) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return null;
  const order = await db.verificationOrder.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, fieldAgentId: true, lawyerId: true, surveyorId: true },
  });
  if (!order) return null;
  const isAdmin = user.role === "ADMIN";
  const can = {
    SITE: isAdmin || order.fieldAgentId === user.id,
    SURVEY: isAdmin || order.surveyorId === user.id,
    REGISTRY: isAdmin || order.lawyerId === user.id,
  } satisfies Record<Stage, boolean>;
  if (!isAdmin && !can.SITE && !can.SURVEY && !can.REGISTRY) return null;
  return { user, order, isAdmin, can };
}

const MAX_EVIDENCE_PER_CASE = 60;
const MAX_FILE_BYTES = 15 * 1024 * 1024;

/** Stores evidence privately. Photos keep their EXIF (GPS, time) as proof of the visit. */
export async function saveEvidence(orderId: string, stage: Stage, files: File[], userId: string, caption?: string) {
  const existing = await db.verificationEvidence.count({ where: { orderId } });
  if (existing + files.length > MAX_EVIDENCE_PER_CASE) throw new Error(`Up to ${MAX_EVIDENCE_PER_CASE} files per case.`);

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) throw new Error(`"${file.name}" is too large (max 15 MB).`);
    const buf = Buffer.from(await file.arrayBuffer());
    const id = randomUUID().replace(/-/g, "");
    let kind: "PHOTO" | "DOCUMENT";
    let key: string;
    if (buf.subarray(0, 5).toString("latin1") === "%PDF-") {
      kind = "DOCUMENT";
      key = `evidence/${orderId}/${id}.pdf`;
      await saveFile(key, buf);
    } else {
      const meta = await sharp(buf).metadata().catch(() => null);
      if (!meta?.format || !["jpeg", "png", "webp", "heif", "avif"].includes(meta.format)) {
        throw new Error(`"${file.name}" isn't a photo or PDF.`);
      }
      kind = "PHOTO";
      key = `evidence/${orderId}/${id}.jpg`;
      const jpeg = await sharp(buf).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).keepExif().jpeg({ quality: 85 }).toBuffer();
      await saveFile(key, jpeg);
    }
    await db.verificationEvidence.create({
      data: { orderId, stage, kind, key, fileName: file.name.slice(0, 200), caption: caption?.slice(0, 300) || null, uploadedById: userId },
    });
  }
}
