"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { saveFile } from "@/lib/storage";
import { buildReportPdf } from "@/lib/report-pdf";
import { notifyReportReady } from "@/lib/notify";
import { requestOrigin } from "@/lib/request-origin";
import { OUTCOMES, REGISTRY_OUTCOMES, STAFF_ROLES, caseAccess, parseGpsLines, type Stage } from "@/lib/verification";
import type { FormState } from "./actions";

const val = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};
const fail = (message: string): FormState => ({ ok: false, message });

function refresh(orderId: string) {
  revalidatePath(`/admin/verifications/${orderId}`);
  revalidatePath(`/work/${orderId}`);
  revalidatePath("/work");
  revalidatePath("/admin");
  revalidatePath("/account");
}

async function requireAdmin() {
  const session = await auth();
  return session?.user?.role === "ADMIN" ? session.user : null;
}

// ---------- Team ----------

/** Gives an existing account a staff role (or takes it away). Accounts are found by email or phone. */
export async function setStaffRole(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  if (!admin) return fail("Admins only.");
  const identifier = val(fd, "identifier");
  const role = val(fd, "role");
  if (![...STAFF_ROLES.map((r) => r.value), "USER", "AGENT"].includes(role)) return fail("Choose a role.");
  const phone = normalizePhone(identifier);
  const user = await db.user.findFirst({
    where: identifier.includes("@") ? { email: identifier.toLowerCase() } : phone ? { phone } : { id: "__none__" },
  });
  if (!user) return fail("No account with that email or phone. Ask them to create an account first, then try again.");
  if (user.role === "ADMIN") return fail("That account is an admin. Admin roles can only be changed from the terminal.");
  if (user.id === admin.id) return fail("You can't change your own role.");
  await db.user.update({ where: { id: user.id }, data: { role } });
  revalidatePath("/admin");
  return { ok: true, message: `${user.name ?? user.email ?? user.phone} is now ${STAFF_ROLES.find((r) => r.value === role)?.label ?? role.toLowerCase()}.` };
}

// ---------- Assigning a case ----------

export async function assignCase(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!(await requireAdmin())) return fail("Admins only.");
  const id = val(fd, "id");
  const order = await db.verificationOrder.findUnique({ where: { id } });
  if (!order) return fail("Case not found.");
  if (order.status === "COMPLETE") return fail("This report is already published.");

  const pick = async (key: string, role: string) => {
    const userId = val(fd, key);
    if (!userId) return null;
    const ok = await db.user.count({ where: { id: userId, role } });
    if (!ok) throw new Error("Pick someone with the right role.");
    return userId;
  };
  try {
    const due = val(fd, "dueDate");
    await db.verificationOrder.update({
      where: { id },
      data: {
        fieldAgentId: await pick("fieldAgentId", "FIELD_AGENT"),
        lawyerId: await pick("lawyerId", "LAWYER"),
        surveyorId: await pick("surveyorId", "SURVEYOR"),
        dueDate: due ? new Date(`${due}T17:00:00Z`) : null,
      },
    });
  } catch (e) {
    return fail((e as Error).message);
  }
  refresh(id);
  return { ok: true, message: "Assignments saved. Each person sees the case under Work when they sign in." };
}

// ---------- Recording findings ----------

export async function saveStage(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = val(fd, "id");
  const stage = val(fd, "stage") as Stage;
  const access = await caseAccess(id);
  if (!access || !(stage in access.can) || !access.can[stage]) return fail("This stage isn't assigned to you.");
  if (access.order.status === "COMPLETE") return fail("This report is already published.");
  if (access.order.status === "AWAITING_PAYMENT") return fail("Wait until the buyer has paid before starting checks.");

  const complete = fd.get("complete") === "on";
  const now = new Date();
  const data: Record<string, unknown> = {};

  // GPS points belong to the survey stage only (one source of truth for the boundary).
  if (stage === "SURVEY") {
    if (fd.has("gps")) {
      const gps = parseGpsLines(val(fd, "gps"));
      if ("error" in gps) return fail(gps.error);
      data.gpsPoints = JSON.stringify(gps.points);
    }
  }
  if (stage === "SITE") {
    data.siteNotes = val(fd, "siteNotes").slice(0, 5000) || null;
    if (complete && !data.siteNotes) return fail("Add your observations before marking the site visit complete.");
    data.siteVisitedAt = complete ? now : null;
  }
  if (stage === "SURVEY") {
    data.surveyNotes = val(fd, "surveyNotes").slice(0, 5000) || null;
    if (complete && data.gpsPoints === "[]") return fail("Add the boundary GPS points before marking the survey complete.");
    data.surveyedAt = complete ? now : null;
  }
  if (stage === "REGISTRY") {
    const outcome = val(fd, "registryOutcome");
    data.registryFindings = val(fd, "registryFindings").slice(0, 5000) || null;
    data.registryOutcome = REGISTRY_OUTCOMES.some((r) => r.value === outcome) ? outcome : null;
    if (complete && (!data.registryOutcome || !data.registryFindings)) return fail("Choose a result and write your findings before marking the search complete.");
    data.registrySearchedAt = complete ? now : null;
  }

  await db.verificationOrder.update({ where: { id }, data });
  refresh(id);
  return { ok: true, message: complete ? "Saved and marked complete." : "Saved as a draft." };
}

// ---------- Publishing ----------

export async function publishReport(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!(await requireAdmin())) return fail("Admins only.");
  const id = val(fd, "id");
  const order = await db.verificationOrder.findUnique({ where: { id }, include: { property: true } });
  if (!order) return fail("Case not found.");
  if (order.status !== "IN_PROGRESS") return fail(order.status === "COMPLETE" ? "Already published." : "The buyer hasn't paid yet.");

  const outcome = val(fd, "outcome");
  const summary = val(fd, "summary").slice(0, 3000);
  if (!OUTCOMES.some((o) => o.value === outcome)) return fail("Choose the overall outcome.");
  if (summary.length < 30) return fail("Write a short summary for the buyer (at least 30 characters).");
  if (!order.registrySearchedAt) return fail("The registry search isn't complete yet.");
  if (order.level === "FULL" && (!order.siteVisitedAt || !order.surveyedAt)) return fail("A full report needs the site visit and GPS survey completed.");

  await db.verificationOrder.update({ where: { id }, data: { outcome, summary } });
  const { pdf } = await buildReportPdf(id);
  const key = `reports/${id}/${randomUUID().replace(/-/g, "")}.pdf`;
  await saveFile(key, pdf);
  await db.verificationOrder.update({ where: { id }, data: { reportKey: key, reportPublishedAt: new Date(), status: "COMPLETE" } });

  // Optionally raise the listing's public trust level to reflect the checks.
  const trust = Number(val(fd, "trustLevel"));
  if (outcome === "VERIFIED" && Number.isInteger(trust) && trust > order.property.trustLevel && trust <= 4) {
    await db.property.update({ where: { id: order.propertyId }, data: { trustLevel: trust } });
    revalidatePath(`/property/${order.property.slug}`);
  }

  const origin = await requestOrigin();
  after(() => notifyReportReady(id, origin));
  refresh(id);
  return { ok: true, message: "Report published. The buyer has been sent a download link." };
}
