import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { db } from "./db";

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_AFTER_MS = 60 * 1000;
const MAX_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

export const isDev = process.env.NODE_ENV !== "production";

const hashCode = (phone: string, code: string) =>
  createHash("sha256").update(`${phone}:${code}:${process.env.AUTH_SECRET ?? ""}`).digest();

// Delivery is pluggable. In development the code is logged and shown on screen;
// in production this must call an SMS or WhatsApp Business API provider.
async function deliverCode(phone: string, code: string) {
  if (isDev) {
    console.log(`[otp] sign-in code for ${phone}: ${code}`);
    return;
  }
  throw new Error("No SMS/WhatsApp provider configured for sign-in codes.");
}

export type OtpRequestResult = { ok: true; devCode?: string } | { ok: false; error: string };

export async function requestOtp(phone: string): Promise<OtpRequestResult> {
  const now = Date.now();
  const recent = await db.otpCode.findMany({
    where: { phone, createdAt: { gt: new Date(now - 60 * 60 * 1000) } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (recent[0] && now - recent[0].createdAt.getTime() < RESEND_AFTER_MS) {
    return { ok: false, error: "Please wait a minute before asking for another code." };
  }
  if (recent.length >= MAX_PER_HOUR) {
    return { ok: false, error: "Too many codes requested. Please try again in an hour." };
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  await db.otpCode.create({
    data: { phone, codeHash: hashCode(phone, code).toString("hex"), expiresAt: new Date(now + CODE_TTL_MS) },
  });
  await deliverCode(phone, code);
  return { ok: true, devCode: isDev ? code : undefined };
}

export async function verifyOtp(phone: string, code: string) {
  if (!/^\d{6}$/.test(code)) return false;
  const otp = await db.otpCode.findFirst({
    where: { phone, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp || otp.attempts >= MAX_ATTEMPTS) return false;

  const expected = Buffer.from(otp.codeHash, "hex");
  const actual = hashCode(phone, code);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    await db.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return false;
  }
  await db.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });
  return true;
}
