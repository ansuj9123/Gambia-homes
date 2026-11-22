"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { notifyNewEnquiry } from "@/lib/notify";
import { requestOrigin } from "@/lib/request-origin";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { AREA_COORDS, REGIONS, TENURES, TYPES, VERIFICATION_PRODUCTS, regionForArea } from "@/lib/constants";
import { slugify } from "@/lib/format";
import { normalizePhone } from "@/lib/phone";
import { addPhotos } from "@/lib/photos";
import { paymentsEnabled } from "@/lib/stripe";
import { createVerificationCheckout } from "@/lib/payments";

export type FormState = { ok: boolean; message: string; redirectUrl?: string } | null;

const fail = (message: string): FormState => ({ ok: false, message });
const firstError = (e: z.ZodError) => e.issues[0]?.message ?? "Please check the form.";
const opt = (v: FormDataEntryValue | null) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined);
const fields = (fd: FormData, keys: string[]) => Object.fromEntries(keys.map((k) => [k, opt(fd.get(k))]));

async function liveProperty(id: unknown) {
  if (typeof id !== "string") return null;
  return db.property.findFirst({ where: { id, status: "LIVE" }, select: { id: true } });
}

// ---------- Buyer actions ----------

const enquirySchema = z.object({
  propertyId: z.string(),
  kind: z.enum(["MESSAGE", "VIDEO_VIEWING"]),
  name: z.string({ required_error: "Please enter your name." }).min(2, "Please enter your name.").max(100),
  email: z.string({ required_error: "Please enter your email." }).email("Please enter a valid email."),
  phone: z.string().max(30).optional(),
  country: z.string().max(60).optional(),
  message: z.string({ required_error: "Please write a short message." }).min(5, "Please write a short message.").max(2000),
});

export async function sendEnquiry(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = enquirySchema.safeParse(fields(fd, ["propertyId", "kind", "name", "email", "phone", "country", "message"]));
  if (!parsed.success) return fail(firstError(parsed.error));
  if (!(await liveProperty(parsed.data.propertyId))) return fail("This listing is no longer available.");
  const userId = (await auth())?.user?.id;
  const enquiry = await db.enquiry.create({ data: { ...parsed.data, userId } });
  // Send the agent alert and buyer receipt after responding, so the buyer isn't kept waiting.
  const origin = await requestOrigin();
  after(() => notifyNewEnquiry(enquiry.id, origin));
  revalidatePath("/agent");
  return {
    ok: true,
    message:
      parsed.data.kind === "VIDEO_VIEWING"
        ? "Request sent. The agent will contact you to arrange a live video viewing."
        : "Message sent. The agent will reply by email or WhatsApp.",
  };
}

const verificationSchema = z.object({
  propertyId: z.string(),
  level: z.enum(["BASIC", "FULL"]),
  name: z.string({ required_error: "Please enter your name." }).min(2, "Please enter your name.").max(100),
  email: z.string({ required_error: "Please enter your email." }).email("Please enter a valid email."),
  country: z.string().max(60).optional(),
});

export async function orderVerification(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = verificationSchema.safeParse(fields(fd, ["propertyId", "level", "name", "email", "country"]));
  if (!parsed.success) return fail(firstError(parsed.error));
  if (!(await liveProperty(parsed.data.propertyId))) return fail("This listing is no longer available.");
  const product = VERIFICATION_PRODUCTS.find((p) => p.value === parsed.data.level)!;
  const userId = (await auth())?.user?.id;
  const order = await db.verificationOrder.create({ data: { ...parsed.data, priceGbp: product.priceGbp, userId } });

  if (!paymentsEnabled()) {
    return {
      ok: true,
      message: `${product.label} requested (£${product.priceGbp}). We'll email you a secure payment link and start checks once paid.`,
    };
  }
  const checkout = await createVerificationCheckout(order.id, await requestOrigin());
  if (!checkout.ok) {
    return { ok: false, message: `${checkout.error} Your request is saved; you can pay later from your account.` };
  }
  return { ok: true, message: "Taking you to secure payment…", redirectUrl: checkout.url };
}

const scamSchema = z.object({
  propertyId: z.string(),
  reason: z.string({ required_error: "Please tell us what looks wrong." }).min(5, "Please tell us what looks wrong.").max(2000),
  contact: z.string().max(100).optional(),
});

export async function reportScam(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = scamSchema.safeParse(fields(fd, ["propertyId", "reason", "contact"]));
  if (!parsed.success) return fail(firstError(parsed.error));
  if (!(await liveProperty(parsed.data.propertyId))) return fail("This listing is no longer available.");
  await db.scamReport.create({ data: parsed.data });
  return { ok: true, message: "Thank you. Our team will review this listing within 24 hours." };
}

// ---------- Listing submission ----------

const typeValues = TYPES.map((t) => t.value) as [string, ...string[]];
const tenureValues = TENURES.map((t) => t.value) as [string, ...string[]];
const allAreas = Object.values(REGIONS).flat() as [string, ...string[]];
const int = (msg: string) => z.coerce.number({ invalid_type_error: msg }).int(msg).nonnegative(msg);

const listingSchema = z
  .object({
    title: z.string({ required_error: "Please add a title." }).min(8, "Title should be at least 8 characters.").max(120),
    description: z.string({ required_error: "Please add a description." }).min(20, "Description should be at least 20 characters.").max(5000),
    purpose: z.enum(["SALE", "RENT"]),
    type: z.enum(typeValues),
    area: z.enum(allAreas, { errorMap: () => ({ message: "Please choose an area." }) }),
    priceGmd: int("Please enter the price in dalasi.").min(1, "Please enter the price in dalasi."),
    rentPeriod: z.enum(["MONTH", "NIGHT"]).optional(),
    bedrooms: int("Bedrooms must be a whole number.").max(50).optional(),
    bathrooms: int("Bathrooms must be a whole number.").max(50).optional(),
    plotSqm: int("Plot size must be a whole number.").max(10_000_000).optional(),
    tenure: z.enum(tenureValues).optional(),
    lat: z.coerce.number().min(13).max(13.9).optional(),
    lng: z.coerce.number().min(-16.9).max(-13.7).optional(),
    contactName: z.string({ required_error: "Please enter your name." }).min(2, "Please enter your name.").max(100),
    agency: z.string().max(100).optional(),
    phone: z
      .string({ required_error: "Please enter your WhatsApp number." })
      .regex(/^\+?[0-9 ]{7,16}$/, "Please enter a valid phone number, e.g. +220 700 0000."),
    email: z.string().email("Please enter a valid email.").optional(),
  })
  .refine((d) => d.purpose === "SALE" || d.rentPeriod, { message: "Choose monthly or nightly rent.", path: ["rentPeriod"] });

export async function createListing(_prev: FormState, fd: FormData): Promise<FormState> {
  const keys = Object.keys(listingSchema._def.schema.shape);
  const parsed = listingSchema.safeParse(fields(fd, keys));
  if (!parsed.success) return fail(firstError(parsed.error));
  const d = parsed.data;

  const phone = normalizePhone(d.phone);
  if (!phone) return fail("Please enter a valid phone number, e.g. +220 700 0000.");

  // Signed-in agents list under their own profile. Otherwise match by phone, or create
  // a new profile (linked to the account when the submitter is signed in).
  const userId = (await auth())?.user?.id;
  let agent = userId ? await db.agent.findUnique({ where: { userId } }) : null;
  agent ??= await db.agent.findFirst({ where: { phone } });
  if (!agent) {
    agent = await db.agent.create({ data: { name: d.contactName, agency: d.agency, phone, email: d.email, userId } });
    if (userId) await db.user.updateMany({ where: { id: userId, role: "USER" }, data: { role: "AGENT" } });
  }

  const fallback = AREA_COORDS[d.area];
  const base = slugify(`${d.title} ${d.area}`);
  const property = await db.property.create({
    data: {
      slug: `${base}-${Date.now().toString(36)}`,
      title: d.title,
      description: d.description,
      purpose: d.purpose,
      type: d.type,
      region: regionForArea(d.area)!,
      area: d.area,
      priceGmd: d.priceGmd,
      rentPeriod: d.purpose === "RENT" ? d.rentPeriod : null,
      bedrooms: d.bedrooms,
      bathrooms: d.bathrooms,
      plotSqm: d.plotSqm,
      tenure: d.tenure ?? "UNKNOWN",
      lat: d.lat ?? fallback[0],
      lng: d.lng ?? fallback[1],
      agentId: agent.id,
    },
  });
  const photos = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  let photoNote = "";
  if (photos.length) {
    try {
      await addPhotos(property.id, photos);
    } catch (e) {
      photoNote = ` Some photos couldn't be saved (${(e as Error).message}) — our team can add them later.`;
    }
  }

  revalidatePath("/admin");
  revalidatePath("/agent");
  return {
    ok: true,
    message: `Thank you. Your listing is under review. Our team will contact you on WhatsApp to arrange verification.${photoNote}`,
  };
}

// ---------- Admin ----------

async function requireAdmin() {
  if ((await auth())?.user?.role !== "ADMIN") throw new Error("Not authorised");
}

const adminSchema = z.object({
  id: z.string(),
  status: z.enum(["PENDING", "LIVE", "REJECTED", "SOLD", "WITHDRAWN"]),
  trustLevel: z.coerce.number().int().min(0).max(4),
  featured: z.enum(["on"]).optional(),
});

export async function updateListing(fd: FormData) {
  await requireAdmin();
  const d = adminSchema.parse(fields(fd, ["id", "status", "trustLevel", "featured"]));
  await db.property.update({
    where: { id: d.id },
    data: { status: d.status, trustLevel: d.trustLevel, featured: d.featured === "on" },
  });
  revalidatePath("/admin");
  revalidatePath("/search");
  revalidatePath("/");
}

export async function updateVerificationStatus(fd: FormData) {
  await requireAdmin();
  const d = z
    .object({ id: z.string(), status: z.enum(["AWAITING_PAYMENT", "IN_PROGRESS"]) })
    .parse(fields(fd, ["id", "status"]));
  // Published reports can't be reopened from here.
  await db.verificationOrder.updateMany({ where: { id: d.id, status: { not: "COMPLETE" } }, data: { status: d.status } });
  revalidatePath("/admin");
}
