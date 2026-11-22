import Link from "next/link";
import { db } from "@/lib/db";
import { TENURES, TYPES, labelFor } from "@/lib/constants";
import { formatMoney, rentSuffix } from "@/lib/format";
import { REGISTRY_OUTCOMES, STAGES, gpsToLines, parseGps, type Stage } from "@/lib/verification";
import { Map } from "./MapLoader";
import { EvidencePanel, StageForm } from "./VerificationForms";

const when = (d: Date | null) => (d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null);

/** The working view of one verification case. Editing is limited to the stages `can` allows. */
export async function CaseView({ orderId, can, viewerId, isAdmin }: { orderId: string; can: Record<Stage, boolean>; viewerId: string; isAdmin: boolean }) {
  const o = await db.verificationOrder.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      property: { include: { agent: true } },
      fieldAgent: { select: { name: true, email: true, phone: true } },
      lawyer: { select: { name: true, email: true, phone: true } },
      surveyor: { select: { name: true, email: true, phone: true } },
      evidence: { include: { uploadedBy: { select: { name: true, email: true, phone: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  const p = o.property;
  const closed = o.status === "COMPLETE";
  const unpaid = o.status === "AWAITING_PAYMENT";
  const gps = parseGps(o.gpsPoints);
  const who = (u: { name: string | null; email: string | null; phone: string | null } | null) => (u ? u.name ?? u.email ?? u.phone ?? "Someone" : null);

  const stages: { key: Stage; doneAt: Date | null; person: string | null; needed: boolean }[] = [
    { key: "REGISTRY", doneAt: o.registrySearchedAt, person: who(o.lawyer), needed: true },
    { key: "SITE", doneAt: o.siteVisitedAt, person: who(o.fieldAgent), needed: o.level === "FULL" },
    { key: "SURVEY", doneAt: o.surveyedAt, person: who(o.surveyor), needed: o.level === "FULL" },
  ];

  const evidenceFor = (stage: Stage) =>
    o.evidence
      .filter((e) => e.stage === stage)
      .map((e) => ({ id: e.id, kind: e.kind, fileName: e.fileName, caption: e.caption, by: who(e.uploadedBy) ?? "", mine: e.uploadedById === viewerId }));

  const section = "rounded-xl border border-slate-200 bg-white p-5";

  return (
    <div className="space-y-6">
      {unpaid && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">The buyer hasn&apos;t paid yet. Don&apos;t start checks until payment is confirmed.</p>}
      {closed && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">Report published {when(o.reportPublishedAt)}. This case is closed.</p>}

      <section className={section}>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-1 text-sm">
            <h2 className="mb-2 text-lg font-semibold">{p.title}</h2>
            <p><strong>Where:</strong> {p.area}, {p.region} · listed point {p.lat.toFixed(5)}, {p.lng.toFixed(5)}</p>
            <p><strong>Type:</strong> {labelFor(TYPES, p.type)}{p.plotSqm ? ` · ${p.plotSqm.toLocaleString("en-GB")} sqm` : ""}{p.tenure ? ` · ${labelFor(TENURES, p.tenure)}` : ""}</p>
            <p><strong>Price:</strong> {formatMoney(p.priceGmd, "GMD")}{rentSuffix(p.rentPeriod)}</p>
            <p><strong>Lister:</strong> {p.agent.agency ?? p.agent.name} · {p.agent.phone} · {p.agent.verified ? "ID verified" : "ID not verified"}</p>
            <p><strong>Report:</strong> {o.level === "FULL" ? "Full (registry, site visit, GPS survey)" : "Basic (registry search)"}{o.dueDate ? ` · due ${when(o.dueDate)}` : ""}</p>
            {isAdmin && <p><strong>Buyer:</strong> {o.name} · {o.email}{o.country ? ` · ${o.country}` : ""}</p>}
            {p.status === "LIVE" && <Link href={`/property/${p.slug}`} target="_blank" className="text-brand-700 hover:underline">Open listing ↗</Link>}
          </div>
          <Map
            height={240}
            points={[
              { id: p.id, slug: p.slug, title: "Listed location", lat: p.lat, lng: p.lng, priceGmd: p.priceGmd, rentPeriod: p.rentPeriod, trustLevel: 0 },
              ...gps.map((g, i) => ({ id: `gps-${i}`, slug: p.slug, title: g.label ?? `Point ${i + 1}`, lat: g.lat, lng: g.lng, priceGmd: p.priceGmd, rentPeriod: p.rentPeriod, trustLevel: 4 })),
            ]}
          />
        </div>
      </section>

      <ol className="grid gap-3 sm:grid-cols-3">
        {stages.map((s) => (
          <li key={s.key} className={`rounded-xl border p-4 text-sm ${s.doneAt ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"}`}>
            <p className="font-semibold">{s.doneAt ? "✓ " : ""}{STAGES[s.key].label}</p>
            <p className="text-slate-600">{s.needed ? (s.doneAt ? `Done ${when(s.doneAt)}` : "Not done yet") : "Not needed for a basic report"}</p>
            <p className="text-slate-500">{s.person ? `Assigned: ${s.person}` : "Not assigned"}</p>
          </li>
        ))}
      </ol>

      {stages.map((s) => {
        const editable = can[s.key] && !closed && !unpaid;
        const values = {
          siteNotes: o.siteNotes,
          surveyNotes: o.surveyNotes,
          gps: gpsToLines(gps),
          registryFindings: o.registryFindings,
          registryOutcome: o.registryOutcome,
          complete: Boolean(s.doneAt),
        };
        if (!editable && !s.doneAt && !isAdmin && !can[s.key]) return null;
        return (
          <section key={s.key} className={section}>
            <h2 className="mb-3 text-lg font-semibold">{STAGES[s.key].label}</h2>
            <StageForm orderId={o.id} stage={s.key} values={values} registryOutcomes={REGISTRY_OUTCOMES} disabled={!editable} />
            <h3 className="mb-2 mt-5 text-sm font-semibold text-slate-700">Files</h3>
            <EvidencePanel orderId={o.id} stage={s.key} items={evidenceFor(s.key)} canUpload={editable} canDeleteAny={isAdmin} />
          </section>
        );
      })}
    </div>
  );
}
