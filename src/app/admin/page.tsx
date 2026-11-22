import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { TRUST_LEVELS, TYPES, labelFor } from "@/lib/constants";
import { formatMoney, rentSuffix } from "@/lib/format";
import { updateListing, updateVerificationStatus } from "@/app/actions";
import { STAFF_ROLES } from "@/lib/verification";
import { TeamRoleForm } from "@/components/VerificationForms";

export const metadata: Metadata = { title: "Admin — Gambia Homes" };
export const dynamic = "force-dynamic";

type Tab = "pending" | "live" | "verifications" | "enquiries" | "reports" | "messages" | "team";
const TABS: { id: Tab; label: string }[] = [
  { id: "pending", label: "Pending listings" },
  { id: "live", label: "Live listings" },
  { id: "verifications", label: "Verification orders" },
  { id: "enquiries", label: "Enquiries" },
  { id: "reports", label: "Scam reports" },
  { id: "messages", label: "Messages sent" },
  { id: "team", label: "Team" },
];

const when = (d: Date) => d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const cell = "px-3 py-2 align-top";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/signin?callbackUrl=/admin");
  if (session.user.role !== "ADMIN") notFound();

  const requested = (await searchParams).tab;
  const tab = TABS.find((t) => t.id === requested)?.id ?? "pending";

  const [pendingCount, verifCount, reportCount] = await Promise.all([
    db.property.count({ where: { status: "PENDING" } }),
    db.verificationOrder.count({ where: { status: { not: "COMPLETE" } } }),
    db.scamReport.count(),
  ]);
  const badge: Partial<Record<Tab, number>> = { pending: pendingCount, verifications: verifCount, reports: reportCount };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold">Operations</h1>
      <nav className="my-4 flex flex-wrap gap-2 text-sm">
        {TABS.map((t) => (
          <Link key={t.id} href={`/admin?tab=${t.id}`} className={`rounded-full px-3 py-1.5 ${tab === t.id ? "bg-slate-900 text-white" : "bg-white ring-1 ring-slate-300"}`}>
            {t.label}
            {badge[t.id] ? <span className="ml-1.5 rounded-full bg-red-600 px-1.5 text-xs text-white">{badge[t.id]}</span> : null}
          </Link>
        ))}
      </nav>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        {tab === "pending" || tab === "live" ? <Listings status={tab === "pending" ? "PENDING" : "LIVE"} /> : null}
        {tab === "verifications" ? <Verifications /> : null}
        {tab === "enquiries" ? <Enquiries /> : null}
        {tab === "reports" ? <Reports /> : null}
        {tab === "messages" ? <Messages /> : null}
        {tab === "team" ? <Team /> : null}
      </div>
    </div>
  );
}

async function Listings({ status }: { status: "PENDING" | "LIVE" }) {
  const rows = await db.property.findMany({ where: { status }, include: { agent: true }, orderBy: { createdAt: "desc" }, take: 200 });
  if (rows.length === 0) return <p className="p-6 text-slate-500">Nothing here.</p>;
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
        <tr><th className={cell}>Listing</th><th className={cell}>Lister</th><th className={cell}>Price</th><th className={cell}>Review</th></tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((p) => (
          <tr key={p.id}>
            <td className={cell}>
              <p className="font-medium">{p.title}</p>
              <p className="text-slate-500">{labelFor(TYPES, p.type)} · {p.area} · {when(p.createdAt)}</p>
              <p className="mt-1 max-w-md text-slate-600 line-clamp-2">{p.description}</p>
              <span className="flex gap-3">
                <Link href={`/admin/listings/${p.id}`} className="text-brand-700 hover:underline">Photos &amp; details ({JSON.parse(p.photos || "[]").length})</Link>
                {status === "LIVE" && <Link href={`/property/${p.slug}`} className="text-brand-700 hover:underline">View</Link>}
              </span>
            </td>
            <td className={cell}>
              <p>{p.agent.agency ?? p.agent.name}</p>
              <p className="text-slate-500">{p.agent.phone}</p>
              <p className="text-xs">{p.agent.verified ? "ID verified" : "Not verified"}</p>
            </td>
            <td className={cell}>{formatMoney(p.priceGmd, "GMD")}{rentSuffix(p.rentPeriod)}</td>
            <td className={cell}>
              <form action={updateListing} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={p.id} />
                <select name="status" defaultValue={p.status === "PENDING" ? "LIVE" : p.status} className="rounded border border-slate-300 px-2 py-1">
                  <option value="LIVE">Live</option>
                  <option value="PENDING">Pending</option>
                  <option value="REJECTED">Rejected</option>
                </select>
                <select name="trustLevel" defaultValue={p.trustLevel} className="rounded border border-slate-300 px-2 py-1">
                  {TRUST_LEVELS.map((t) => <option key={t.level} value={t.level}>{t.level} · {t.label}</option>)}
                </select>
                <label className="flex items-center gap-1"><input type="checkbox" name="featured" defaultChecked={p.featured} /> Featured</label>
                <button className="rounded bg-slate-900 px-3 py-1 text-white">Save</button>
              </form>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

async function Verifications() {
  const rows = await db.verificationOrder.findMany({
    include: { property: true, payments: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  if (rows.length === 0) return <p className="p-6 text-slate-500">No verification orders yet.</p>;
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
        <tr><th className={cell}>Buyer</th><th className={cell}>Property</th><th className={cell}>Report</th><th className={cell}>Payment</th><th className={cell}>Status</th></tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((v) => (
          <tr key={v.id}>
            <td className={cell}><p className="font-medium">{v.name}</p><p className="text-slate-500">{v.email}{v.country ? ` · ${v.country}` : ""}</p><p className="text-xs text-slate-500">{when(v.createdAt)}</p></td>
            <td className={cell}>
              <Link href={`/property/${v.property.slug}`} className="text-brand-700 hover:underline">{v.property.title}</Link>
              <p><Link href={`/admin/verifications/${v.id}`} className="font-semibold text-slate-900 hover:underline">Open case →</Link></p>
              <p className="text-xs text-slate-500">
                {[v.registrySearchedAt && "registry ✓", v.siteVisitedAt && "site ✓", v.surveyedAt && "survey ✓"].filter(Boolean).join(" · ") || "no checks recorded yet"}
              </p>
            </td>
            <td className={cell}>{v.level === "FULL" ? "Full" : "Basic"} · £{v.priceGbp}</td>
            <td className={cell}>
              {v.payments[0] ? (
                <>
                  <span className={`rounded px-1.5 text-xs font-medium ${v.payments[0].status === "PAID" ? "bg-emerald-100 text-emerald-800" : v.payments[0].status === "REFUNDED" ? "bg-amber-100 text-amber-900" : "bg-slate-100"}`}>
                    {v.payments[0].status}
                  </span>
                  {v.payments[0].providerPaymentId && <p className="mt-1 font-mono text-xs text-slate-500">{v.payments[0].providerPaymentId}</p>}
                </>
              ) : (
                <span className="text-xs text-slate-500">Not started</span>
              )}
            </td>
            <td className={cell}>
              {v.status === "COMPLETE" ? (
                <span className="rounded bg-emerald-100 px-1.5 text-xs font-medium text-emerald-800">Report published</span>
              ) : (
                // Manual override for payments taken outside Stripe (e.g. bank transfer). Completing happens by publishing a report.
                <form action={updateVerificationStatus} className="flex gap-2">
                  <input type="hidden" name="id" value={v.id} />
                  <select name="status" defaultValue={v.status} className="rounded border border-slate-300 px-2 py-1">
                    <option value="AWAITING_PAYMENT">Awaiting payment</option>
                    <option value="IN_PROGRESS">Paid, checks in progress</option>
                  </select>
                  <button className="rounded bg-slate-900 px-3 py-1 text-white">Save</button>
                </form>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

async function Enquiries() {
  const rows = await db.enquiry.findMany({ include: { property: true }, orderBy: { createdAt: "desc" }, take: 200 });
  if (rows.length === 0) return <p className="p-6 text-slate-500">No enquiries yet.</p>;
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
        <tr><th className={cell}>From</th><th className={cell}>Property</th><th className={cell}>Message</th></tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((e) => (
          <tr key={e.id}>
            <td className={cell}><p className="font-medium">{e.name}</p><p className="text-slate-500">{e.email}</p><p className="text-slate-500">{[e.phone, e.country].filter(Boolean).join(" · ")}</p><p className="text-xs text-slate-500">{when(e.createdAt)}</p></td>
            <td className={cell}><Link href={`/property/${e.property.slug}`} className="text-brand-700 hover:underline">{e.property.title}</Link></td>
            <td className={cell}><span className="mr-1 rounded bg-slate-100 px-1.5 text-xs">{e.kind === "VIDEO_VIEWING" ? "Video viewing" : "Message"}</span>{e.message}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

async function Reports() {
  const rows = await db.scamReport.findMany({ include: { property: true }, orderBy: { createdAt: "desc" }, take: 200 });
  if (rows.length === 0) return <p className="p-6 text-slate-500">No scam reports.</p>;
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
        <tr><th className={cell}>Property</th><th className={cell}>Reason</th><th className={cell}>Reporter</th></tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((r) => (
          <tr key={r.id}>
            <td className={cell}><Link href={`/property/${r.property.slug}`} className="text-brand-700 hover:underline">{r.property.title}</Link><p className="text-xs text-slate-500">{when(r.createdAt)}</p></td>
            <td className={cell}>{r.reason}</td>
            <td className={cell}>{r.contact ?? "Anonymous"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

async function Messages() {
  const rows = await db.notification.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  if (rows.length === 0) return <p className="p-6 text-slate-500">No messages yet. Enquiries create an agent alert and a buyer receipt.</p>;
  const style: Record<string, string> = { SENT: "bg-emerald-100 text-emerald-800", LOGGED: "bg-slate-100 text-slate-700", FAILED: "bg-red-100 text-red-800" };
  return (
    <>
      <p className="border-b border-slate-100 px-3 py-2 text-xs text-slate-500">
        LOGGED = recorded but not sent, because no provider is configured (set SMTP_URL for email). WhatsApp needs the WhatsApp Business Platform.
      </p>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr><th className={cell}>When</th><th className={cell}>To</th><th className={cell}>Message</th><th className={cell}>Status</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((n) => (
            <tr key={n.id}>
              <td className={`${cell} whitespace-nowrap`}>{when(n.createdAt)}</td>
              <td className={cell}><span className="rounded bg-slate-100 px-1.5 text-xs">{n.channel}</span> {n.to}<p className="text-xs text-slate-500">{n.kind}</p></td>
              <td className={cell}>
                <details>
                  <summary className="cursor-pointer">{n.subject ?? n.body.slice(0, 80)}</summary>
                  <pre className="mt-2 max-w-xl whitespace-pre-wrap font-sans text-xs text-slate-700">{n.body}</pre>
                </details>
              </td>
              <td className={cell}><span className={`rounded px-1.5 text-xs font-medium ${style[n.status] ?? ""}`}>{n.status}</span>{n.error && <p className="text-xs text-red-700">{n.error}</p>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

async function Team() {
  const staff = await db.user.findMany({
    where: { role: { in: ["ADMIN", "FIELD_AGENT", "LAWYER", "SURVEYOR"] } },
    select: { id: true, name: true, email: true, phone: true, role: true, _count: { select: { fieldCases: true, lawyerCases: true, surveyorCases: true } } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
  const label = (r: string) => (r === "ADMIN" ? "Admin" : STAFF_ROLES.find((s) => s.value === r)?.label ?? r);
  return (
    <div className="space-y-4 p-4">
      <div>
        <p className="mb-2 text-sm text-slate-600">
          Give a role to someone who already has an account (they sign up first with email or phone). Field agents, lawyers and
          surveyors only see the cases you assign them, under <strong>Work</strong>.
        </p>
        <TeamRoleForm roles={STAFF_ROLES} />
      </div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr><th className={cell}>Person</th><th className={cell}>Role</th><th className={cell}>Cases assigned</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {staff.map((u) => (
            <tr key={u.id}>
              <td className={cell}><p className="font-medium">{u.name ?? "—"}</p><p className="text-slate-500">{[u.email, u.phone].filter(Boolean).join(" · ")}</p></td>
              <td className={cell}>{label(u.role)}</td>
              <td className={cell}>{u._count.fieldCases + u._count.lawyerCases + u._count.surveyorCases}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
