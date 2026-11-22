import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { TRUST_LEVELS } from "@/lib/constants";
import { OUTCOMES, caseAccess } from "@/lib/verification";
import { CaseView } from "@/components/CaseView";
import { AssignForm, PublishForm } from "@/components/VerificationForms";

export const metadata: Metadata = { title: "Verification case — Admin" };

const STATUS: Record<string, string> = { AWAITING_PAYMENT: "Awaiting payment", IN_PROGRESS: "Checks in progress", COMPLETE: "Report published" };

export default async function AdminCasePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/signin?callbackUrl=/admin");
  if (session.user.role !== "ADMIN") notFound();
  const id = (await params).id;
  const access = await caseAccess(id);
  if (!access) notFound();

  const [o, staff] = await Promise.all([
    db.verificationOrder.findUniqueOrThrow({ where: { id }, include: { property: true } }),
    db.user.findMany({ where: { role: { in: ["FIELD_AGENT", "LAWYER", "SURVEYOR"] } }, select: { id: true, name: true, email: true, phone: true, role: true }, orderBy: { name: "asc" } }),
  ]);
  const people = { FIELD_AGENT: [] as { id: string; name: string }[], LAWYER: [] as { id: string; name: string }[], SURVEYOR: [] as { id: string; name: string }[] };
  for (const s of staff) people[s.role as keyof typeof people]?.push({ id: s.id, name: s.name ?? s.email ?? s.phone ?? s.id });
  const closed = o.status === "COMPLETE";
  const section = "rounded-xl border border-slate-200 bg-white p-5";

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <Link href="/admin?tab=verifications" className="text-sm text-slate-500 hover:underline">← All verification orders</Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Verification case GH-{o.id.slice(-8).toUpperCase()}</h1>
          <p className="text-slate-600">{STATUS[o.status] ?? o.status} · £{o.priceGbp} {o.level === "FULL" ? "full" : "basic"} report</p>
        </div>
        {closed && (
          <a href={`/api/reports/${o.id}`} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Download published PDF</a>
        )}
      </div>

      <section className={section}>
        <h2 className="mb-1 text-lg font-semibold">Team</h2>
        <p className="mb-3 text-sm text-slate-500">
          {staff.length === 0 ? "No staff yet. Add field agents, lawyers and surveyors under Admin → Team." : "Assign the people doing the checks. They see the case under Work."}
        </p>
        <AssignForm
          orderId={o.id}
          current={{ fieldAgentId: o.fieldAgentId, lawyerId: o.lawyerId, surveyorId: o.surveyorId }}
          people={people}
          dueDate={o.dueDate ? o.dueDate.toISOString().slice(0, 10) : ""}
          disabled={closed}
        />
      </section>

      <CaseView orderId={o.id} can={access.can} viewerId={access.user.id} isAdmin />

      {!closed && (
        <section className={section}>
          <h2 className="mb-1 text-lg font-semibold">Publish the report</h2>
          <p className="mb-3 text-sm text-slate-500">
            Creates the PDF from the findings above, stores it privately, and emails the buyer a download link. The case then closes.
          </p>
          <PublishForm
            orderId={o.id}
            outcomes={OUTCOMES}
            defaults={{ outcome: o.outcome ?? "", summary: o.summary ?? "" }}
            trustOptions={TRUST_LEVELS.filter((t) => t.level > o.property.trustLevel).map((t) => ({ level: t.level, label: t.label }))}
          />
        </section>
      )}
    </div>
  );
}
