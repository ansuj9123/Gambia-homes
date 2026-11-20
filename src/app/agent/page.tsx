import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { currentAgent } from "@/lib/permissions";
import { TYPES, labelFor } from "@/lib/constants";
import { formatMoney, rentSuffix, whatsappLink } from "@/lib/format";
import { updateLeadStatus } from "@/app/agent-actions";
import { PropertyImage } from "@/components/PropertyImage";
import { TrustBadge } from "@/components/TrustBadge";

export const metadata: Metadata = { title: "Agent portal — Gambia Homes" };

const STATUS_STYLE: Record<string, string> = {
  LIVE: "bg-emerald-100 text-emerald-800",
  PENDING: "bg-amber-100 text-amber-900",
  REJECTED: "bg-red-100 text-red-800",
  SOLD: "bg-slate-200 text-slate-700",
  WITHDRAWN: "bg-slate-200 text-slate-700",
};
const STATUS_LABEL: Record<string, string> = { LIVE: "Live", PENDING: "In review", REJECTED: "Rejected", SOLD: "Sold / let", WITHDRAWN: "Withdrawn" };
const LEAD_STYLE: Record<string, string> = { NEW: "bg-red-600 text-white", CONTACTED: "bg-sky-100 text-sky-800", CLOSED: "bg-slate-100 text-slate-600" };
const when = (d: Date) => d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function AgentPortal({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/signin?callbackUrl=/agent");
  const agent = await currentAgent();

  if (!agent) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-bold">Agent portal</h1>
        <p className="mt-3 text-slate-700">Your account isn&apos;t linked to an agent profile yet. Two ways to get access:</p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-slate-700">
          <li>
            <strong>Already listing with us?</strong> Sign out, then sign in with a code sent to the WhatsApp number on your listings. Your
            listings will appear here automatically.
          </li>
          <li>
            <strong>New to Gambia Homes?</strong>{" "}
            <Link href="/list-property" className="font-semibold text-brand-700 hover:underline">List your first property</Link> while
            signed in, and this portal opens for you.
          </li>
        </ol>
      </div>
    );
  }

  const tab = (await searchParams).tab === "leads" ? "leads" : "listings";
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [listings, leads, newLeads, leads30] = await Promise.all([
    db.property.findMany({
      where: { agentId: agent.id },
      include: { _count: { select: { enquiries: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    tab === "leads"
      ? db.enquiry.findMany({ where: { property: { agentId: agent.id } }, include: { property: true }, orderBy: { createdAt: "desc" }, take: 200 })
      : Promise.resolve([]),
    db.enquiry.count({ where: { property: { agentId: agent.id }, status: "NEW" } }),
    db.enquiry.count({ where: { property: { agentId: agent.id }, createdAt: { gte: since } } }),
  ]);

  const stats = [
    { label: "Live listings", value: listings.filter((l) => l.status === "LIVE").length },
    { label: "In review", value: listings.filter((l) => l.status === "PENDING").length },
    { label: "New leads", value: newLeads },
    { label: "Leads, last 30 days", value: leads30 },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Agent portal</h1>
          <p className="text-sm text-slate-500">
            {agent.agency ?? agent.name} · {agent.phone} · {agent.verified ? "ID verified" : "Not yet verified"}
          </p>
        </div>
        <Link href="/list-property" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Add a listing</Link>
      </div>

      <dl className="my-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <dt className="text-xs uppercase tracking-wide text-slate-500">{s.label}</dt>
            <dd className="text-2xl font-bold">{s.value}</dd>
          </div>
        ))}
      </dl>

      <nav className="mb-4 flex gap-2 text-sm">
        <Link href="/agent" className={`rounded-full px-3 py-1.5 ${tab === "listings" ? "bg-slate-900 text-white" : "bg-white ring-1 ring-slate-300"}`}>Listings ({listings.length})</Link>
        <Link href="/agent?tab=leads" className={`rounded-full px-3 py-1.5 ${tab === "leads" ? "bg-slate-900 text-white" : "bg-white ring-1 ring-slate-300"}`}>
          Leads {newLeads > 0 && <span className="ml-1 rounded-full bg-red-600 px-1.5 text-xs text-white">{newLeads}</span>}
        </Link>
      </nav>

      {tab === "listings" ? (
        listings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">No listings yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {listings.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-4 p-3">
                <PropertyImage type={l.type} area={l.area} photos={l.photos} className="h-16 w-24 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{l.title}</p>
                  <p className="text-sm text-slate-500">
                    {labelFor(TYPES, l.type)} · {l.area} · {formatMoney(l.priceGmd, "GMD")}{rentSuffix(l.rentPeriod)} · {JSON.parse(l.photos || "[]").length} photos
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[l.status] ?? ""}`}>{STATUS_LABEL[l.status] ?? l.status}</span>
                <TrustBadge level={l.trustLevel} />
                <span className="text-sm text-slate-600">{l._count.enquiries} leads</span>
                <span className="flex gap-3 text-sm">
                  <Link href={`/agent/listings/${l.id}`} className="font-medium text-brand-700 hover:underline">Edit</Link>
                  {l.status === "LIVE" && <Link href={`/property/${l.slug}`} className="text-slate-600 hover:underline">View</Link>}
                </span>
              </li>
            ))}
          </ul>
        )
      ) : leads.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">No leads yet. Listings with photos and a higher trust level get more enquiries.</p>
      ) : (
        <ul className="space-y-3">
          {leads.map((e) => (
            <li key={e.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {e.name}
                    {e.country && <span className="font-normal text-slate-500"> · {e.country}</span>}
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${LEAD_STYLE[e.status] ?? ""}`}>{e.status === "NEW" ? "New" : e.status === "CONTACTED" ? "Contacted" : "Closed"}</span>
                  </p>
                  <p className="text-sm text-slate-500">
                    {e.kind === "VIDEO_VIEWING" ? "Video viewing request" : "Message"} about{" "}
                    <Link href={`/property/${e.property.slug}`} className="text-brand-700 hover:underline">{e.property.title}</Link> · {when(e.createdAt)}
                  </p>
                </div>
                <form action={updateLeadStatus} className="flex items-center gap-2 text-sm">
                  <input type="hidden" name="id" value={e.id} />
                  <select name="status" defaultValue={e.status} className="rounded border border-slate-300 px-2 py-1">
                    <option value="NEW">New</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                  <button className="rounded bg-slate-900 px-2.5 py-1 text-white">Update</button>
                </form>
              </div>
              <p className="mt-2 whitespace-pre-line text-slate-700">{e.message}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                {e.phone && (
                  <a href={whatsappLink(e.phone, `Hello ${e.name}, thank you for your enquiry about "${e.property.title}" on Gambia Homes.`)} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-[#25d366] px-3 py-1.5 font-semibold text-white">
                    WhatsApp {e.phone}
                  </a>
                )}
                <a href={`mailto:${e.email}?subject=${encodeURIComponent(`Your enquiry: ${e.property.title}`)}`} className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium">
                  Email {e.email}
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
