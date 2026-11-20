import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { currentAgent } from "@/lib/permissions";
import { parsePhotos } from "@/lib/photos";
import { TYPES, labelFor } from "@/lib/constants";
import { setListingAvailability } from "@/app/agent-actions";
import { PhotoManager } from "@/components/PhotoManager";
import { AgentListingForm } from "@/components/AgentListingForm";
import { TrustBadge } from "@/components/TrustBadge";

export const metadata: Metadata = { title: "Edit listing — Agent portal" };

const STATUS_NOTE: Record<string, string> = {
  LIVE: "Live on the site.",
  PENDING: "In review. Our team checks new and changed listings, usually within a day.",
  REJECTED: "Not approved. Contact us on WhatsApp to find out why.",
  SOLD: "Marked as sold or let. Hidden from search.",
  WITHDRAWN: "Withdrawn. Hidden from search.",
};

export default async function AgentListingPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await auth())?.user) redirect("/signin?callbackUrl=/agent");
  const agent = await currentAgent();
  if (!agent) redirect("/agent");
  const p = await db.property.findFirst({ where: { id: (await params).id, agentId: agent.id } });
  if (!p) notFound();

  const closed = ["SOLD", "WITHDRAWN", "REJECTED"].includes(p.status);
  const section = "rounded-xl border border-slate-200 bg-white p-5";

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <Link href="/agent" className="text-sm text-slate-500 hover:underline">← Back to your listings</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{p.title}</h1>
          <p className="text-slate-600">{labelFor(TYPES, p.type)} · {p.area}, {p.region}</p>
          <p className="mt-1 text-sm text-slate-500">{STATUS_NOTE[p.status] ?? p.status}</p>
        </div>
        <TrustBadge level={p.trustLevel} size="md" />
      </div>

      <section className={section}>
        <h2 className="mb-1 text-lg font-semibold">Photos</h2>
        <p className="mb-3 text-sm text-slate-500">Changes appear on the site straight away. Use ← → to reorder; the first photo is the cover.</p>
        <PhotoManager listingId={p.id} initial={parsePhotos(p.photos)} />
      </section>

      <section className={section}>
        <h2 className="mb-3 text-lg font-semibold">Details</h2>
        <AgentListingForm listing={p} disabled={closed} />
      </section>

      <section className={section}>
        <h2 className="mb-3 text-lg font-semibold">Availability</h2>
        <div className="flex flex-wrap gap-2">
          {!closed ? (
            <>
              <form action={setListingAvailability}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="action" value="SOLD" />
                <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">
                  Mark as {p.purpose === "RENT" ? "let" : "sold"}
                </button>
              </form>
              <form action={setListingAvailability}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="action" value="WITHDRAWN" />
                <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">Withdraw</button>
              </form>
            </>
          ) : p.status !== "REJECTED" ? (
            <form action={setListingAvailability}>
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="action" value="RELIST" />
              <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Relist (goes to review)</button>
            </form>
          ) : null}
        </div>
      </section>
    </div>
  );
}
