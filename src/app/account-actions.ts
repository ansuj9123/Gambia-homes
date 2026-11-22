"use server";

import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth, safeRedirect, signIn, signOut, socialProviders } from "@/auth";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { maskPhone, normalizePhone } from "@/lib/phone";
import { requestOtp } from "@/lib/otp";
import { createVerificationCheckout } from "@/lib/payments";
import { isLocalRequest, requestOrigin } from "@/lib/request-origin";

export type AuthState = { ok: boolean; message: string; devCode?: string; phone?: string } | null;

const fail = (message: string): AuthState => ({ ok: false, message });
const val = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};

async function requireUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

// ---------- Email + password ----------

const signUpSchema = z.object({
  name: z.string().min(2, "Please enter your name.").max(100),
  email: z.string().email("Please enter a valid email."),
  password: z.string().min(8, "Use at least 8 characters for your password.").max(200),
  country: z.string().max(60).optional(),
});

export async function signUpWithPassword(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({
    name: val(fd, "name"),
    email: val(fd, "email").toLowerCase(),
    password: (fd.get("password") as string) ?? "",
    country: val(fd, "country") || undefined,
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { name, email, password, country } = parsed.data;

  if (await db.user.findUnique({ where: { email } })) {
    return fail("An account with this email already exists. Sign in instead.");
  }
  await db.user.create({ data: { name, email, country, passwordHash: await hashPassword(password) } });

  // Throws a redirect on success, which Next.js handles.
  await signIn("password", { email, password, redirectTo: safeRedirect(val(fd, "callbackUrl")) });
  return null;
}

export async function signInWithPassword(_prev: AuthState, fd: FormData): Promise<AuthState> {
  try {
    await signIn("password", {
      email: val(fd, "email").toLowerCase(),
      password: (fd.get("password") as string) ?? "",
      redirectTo: safeRedirect(val(fd, "callbackUrl")),
    });
    return null;
  } catch (e) {
    if (e instanceof AuthError) return fail("Wrong email or password.");
    throw e;
  }
}

// ---------- Phone / WhatsApp code ----------

export async function requestPhoneCode(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const phone = normalizePhone(val(fd, "phone"));
  if (!phone) return fail("Please enter your number with country code, e.g. +220 700 0000 or +44 7700 900123.");
  const result = await requestOtp(phone);
  if (!result.ok) return { ok: false, message: result.error, phone };
  // Never show the development code to someone reaching the site through a public link.
  const devCode = (await isLocalRequest()) ? result.devCode : undefined;
  return { ok: true, message: `We sent a 6-digit code to ${maskPhone(phone)}.`, phone, devCode };
}

export async function signInWithPhone(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const phone = normalizePhone(val(fd, "phone"));
  if (!phone) return fail("Please enter your phone number again.");
  try {
    await signIn("phone", {
      phone,
      code: val(fd, "code"),
      name: val(fd, "name"),
      redirectTo: safeRedirect(val(fd, "callbackUrl")),
    });
    return null;
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: "That code is wrong or has expired.", phone };
    throw e;
  }
}

// ---------- Social + sign out ----------

export async function signInWithProvider(fd: FormData) {
  const provider = val(fd, "provider");
  if (!(provider === "google" && socialProviders.google) && !(provider === "apple" && socialProviders.apple)) return;
  await signIn(provider, { redirectTo: safeRedirect(val(fd, "callbackUrl")) });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

// ---------- Profile ----------

export async function updateProfile(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const userId = await requireUserId();
  if (!userId) return fail("Please sign in again.");
  const parsed = z
    .object({ name: z.string().min(2, "Please enter your name.").max(100), country: z.string().max(60).optional() })
    .safeParse({ name: val(fd, "name"), country: val(fd, "country") || undefined });
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  await db.user.update({ where: { id: userId }, data: { name: parsed.data.name, country: parsed.data.country ?? null } });
  revalidatePath("/account");
  return { ok: true, message: "Profile saved." };
}

export async function changePassword(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const userId = await requireUserId();
  if (!userId) return fail("Please sign in again.");
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, passwordHash: true } });
  if (!user?.email) return fail("Add an email to your account before setting a password.");

  const current = (fd.get("currentPassword") as string) ?? "";
  const next = (fd.get("newPassword") as string) ?? "";
  const confirm = (fd.get("confirmPassword") as string) ?? "";

  // Accounts created with Google/Apple have no password yet and can set one without a current password.
  if (user.passwordHash && !(await verifyPassword(current, user.passwordHash))) {
    return fail("Your current password is wrong.");
  }
  if (next.length < 8) return fail("Use at least 8 characters for your new password.");
  if (next.length > 200) return fail("That password is too long.");
  if (next !== confirm) return fail("The new passwords don't match.");
  if (user.passwordHash && current === next) return fail("Choose a password different from your current one.");

  await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(next) } });
  return { ok: true, message: "Password changed. Use it next time you sign in." };
}

// ---------- Saved properties ----------

/** Returns the new saved state, or null when signed out (caller falls back to this device). */
export async function toggleSavedProperty(propertyId: string): Promise<boolean | null> {
  const userId = await requireUserId();
  if (!userId) return null;
  const key = { userId_propertyId: { userId, propertyId } };
  const existing = await db.savedProperty.findUnique({ where: key });
  if (existing) {
    await db.savedProperty.delete({ where: key });
  } else {
    const exists = await db.property.count({ where: { id: propertyId, status: "LIVE" } });
    if (!exists) return false;
    await db.savedProperty.create({ data: { userId, propertyId } });
  }
  revalidatePath("/saved");
  revalidatePath("/account");
  return !existing;
}

/** Moves listings saved on this device into the account after signing in. */
export async function mergeLocalSaved(ids: string[]): Promise<string[]> {
  const userId = await requireUserId();
  if (!userId) return [];
  const live = await db.property.findMany({
    where: { id: { in: ids.slice(0, 200) }, status: "LIVE" },
    select: { id: true },
  });
  for (const { id } of live) {
    await db.savedProperty.upsert({
      where: { userId_propertyId: { userId, propertyId: id } },
      update: {},
      create: { userId, propertyId: id },
    });
  }
  const all = await db.savedProperty.findMany({ where: { userId }, select: { propertyId: true } });
  return all.map((s) => s.propertyId);
}

// ---------- Saved searches ----------

const ALLOWED_PARAMS = ["q", "purpose", "type", "region", "area", "cur", "min", "max", "beds", "minPlot", "trust", "sort"];

export async function saveSearch(query: string, name: string): Promise<{ ok: boolean; message: string }> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, message: "Please sign in to save searches." };
  const params = new URLSearchParams(query);
  const clean = new URLSearchParams();
  for (const k of ALLOWED_PARAMS) {
    const v = params.get(k);
    if (v) clean.set(k, v.slice(0, 80));
  }
  const count = await db.savedSearch.count({ where: { userId } });
  if (count >= 20) return { ok: false, message: "You can save up to 20 searches. Delete one first." };
  await db.savedSearch.create({ data: { userId, name: name.slice(0, 120) || "My search", query: clean.toString() } });
  revalidatePath("/account");
  return { ok: true, message: "Search saved. Manage alerts in your account." };
}

export async function updateSavedSearch(fd: FormData) {
  const userId = await requireUserId();
  if (!userId) return;
  await db.savedSearch.updateMany({
    where: { id: val(fd, "id"), userId },
    data: { alertEmail: fd.get("alertEmail") === "on", alertWhatsApp: fd.get("alertWhatsApp") === "on" },
  });
  revalidatePath("/account");
}

export async function deleteSavedSearch(fd: FormData) {
  const userId = await requireUserId();
  if (!userId) return;
  await db.savedSearch.deleteMany({ where: { id: val(fd, "id"), userId } });
  revalidatePath("/account");
}

// ---------- Payments ----------

export async function payVerificationOrder(fd: FormData) {
  const userId = await requireUserId();
  if (!userId) redirect("/signin?callbackUrl=/account");
  const order = await db.verificationOrder.findFirst({
    where: { id: val(fd, "id"), userId, status: "AWAITING_PAYMENT" },
    select: { id: true },
  });
  if (!order) redirect("/account");
  const checkout = await createVerificationCheckout(order.id, await requestOrigin());
  redirect(checkout.ok ? checkout.url : "/account?payment=error");
}
