"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentAgent } from "@/lib/permissions";
import type { FormState } from "./actions";

const val = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
};

async function ownedListing(id: string | undefined) {
  const agent = await currentAgent();
  if (!agent || !id) return null;
  return db.property.findFirst({ where: { id, agentId: agent.id } });
}

const int = (msg: string) => z.coerce.number({ invalid_type_error: msg }).int(msg).nonnegative(msg);
const editSchema = z.object({
  title: z.string().min(8, "Title should be at least 8 characters.").max(120),
  description: z.string().min(20, "Description should be at least 20 characters.").max(5000),
  priceGmd: int("Please enter the price in dalasi.").min(1, "Please enter the price in dalasi."),
  rentPeriod: z.enum(["MONTH", "NIGHT"]).optional(),
  bedrooms: int("Bedrooms must be a whole number.").max(50).optional(),
  bathrooms: int("Bathrooms must be a whole number.").max(50).optional(),
  plotSqm: int("Size must be a whole number.").max(10_000_000).optional(),
});

/**
 * Price changes go live straight away. Changes to the title, description or
 * details of a live listing send it back for review, so a verified badge can't
 * be carried over to a different property.
 */
export async function updateAgentListing(_prev: FormState, fd: FormData): Promise<FormState> {
  const listing = await ownedListing(val(fd, "id"));
  if (!listing) return { ok: false, message: "You can't edit this listing." };
  if (listing.status === "SOLD" || listing.status === "WITHDRAWN" || listing.status === "REJECTED") {
    return { ok: false, message: "This listing is closed. Relist it first." };
  }

  const parsed = editSchema.safeParse({
    title: val(fd, "title"),
    description: val(fd, "description"),
    priceGmd: val(fd, "priceGmd"),
    rentPeriod: listing.purpose === "RENT" ? val(fd, "rentPeriod") : undefined,
    bedrooms: val(fd, "bedrooms"),
    bathrooms: val(fd, "bathrooms"),
    plotSqm: val(fd, "plotSqm"),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const d = parsed.data;

  const detailsChanged =
    d.title !== listing.title ||
    d.description !== listing.description ||
    (d.bedrooms ?? null) !== listing.bedrooms ||
    (d.bathrooms ?? null) !== listing.bathrooms ||
    (d.plotSqm ?? null) !== listing.plotSqm ||
    (listing.purpose === "RENT" && (d.rentPeriod ?? null) !== listing.rentPeriod);
  const needsReview = detailsChanged && listing.status === "LIVE";

  await db.property.update({
    where: { id: listing.id },
    data: {
      title: d.title,
      description: d.description,
      priceGmd: d.priceGmd,
      rentPeriod: listing.purpose === "RENT" ? (d.rentPeriod ?? listing.rentPeriod) : null,
      bedrooms: d.bedrooms ?? null,
      bathrooms: d.bathrooms ?? null,
      plotSqm: d.plotSqm ?? null,
      ...(needsReview ? { status: "PENDING" } : {}),
    },
  });
  revalidatePath("/agent", "layout");
  revalidatePath(`/property/${listing.slug}`);
  revalidatePath("/admin");
  return {
    ok: true,
    message: needsReview
      ? "Saved. Because the details changed, the listing is back in review and will reappear once approved (usually within a day)."
      : "Saved.",
  };
}

export async function setListingAvailability(fd: FormData) {
  const listing = await ownedListing(val(fd, "id"));
  const action = val(fd, "action");
  if (!listing) return;
  let status: string | null = null;
  if ((action === "SOLD" || action === "WITHDRAWN") && ["LIVE", "PENDING"].includes(listing.status)) status = action;
  if (action === "RELIST" && ["SOLD", "WITHDRAWN"].includes(listing.status)) status = "PENDING";
  if (!status) return;
  await db.property.update({ where: { id: listing.id }, data: { status } });
  revalidatePath("/agent", "layout");
  revalidatePath("/admin");
  revalidatePath("/search");
}

export async function updateLeadStatus(fd: FormData) {
  const agent = await currentAgent();
  const id = val(fd, "id");
  const status = val(fd, "status");
  if (!agent || !id || !status || !["NEW", "CONTACTED", "CLOSED"].includes(status)) return;
  await db.enquiry.updateMany({ where: { id, property: { agentId: agent.id } }, data: { status } });
  revalidatePath("/agent");
}
