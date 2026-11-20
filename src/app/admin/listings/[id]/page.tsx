import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { parsePhotos } from "@/lib/photos";
import { TRUST_LEVELS, TYPES, labelFor } from "@/lib/constants";
import { formatMoney, rentSuffix } from "@/lib/format";
import { updateListing } from "@/app/actions";
import { PhotoManager } from "@/components/PhotoManager";

export const metadata: Metadata = { title: "Listing — Admin" };

export default async function AdminListingPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/admin");
  if (session.user.role !== "ADMIN") notFound();

  const p = await db.property.findUnique({ where: { id: (await params).id }, include: { agent: true } });
  if (!p) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <Link href="/admin" className="text-sm text-slate-500 hover:underline">← Back to operations</Link>
      <div>
        <h1 className="text-2xl font-bold">{p.title}</h1>
        <p className="text-slate-600">
          {labelFor(TYPES, p.type)} · {p.area}, {p.region} · {formatMoney(p.priceGmd, "GMD")}{rentSuffix(p.rentPeriod)} · status {p.status}
        </p>
        <p className="text-sm text-slate-500">
          Lister: {p.agent.agency ?? p.agent.name} · {p.agent.phone}
          {p.status === "LIVE" && (
            <> · <Link href={`/property/${p.slug}`} className="text-brand-700 hover:underline">View public page</Link></>
          )}
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold">Photos</h2>
        <PhotoManager listingId={p.id} initial={parsePhotos(p.photos)} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold">Review</h2>
        <form action={updateListing} className="flex flex-wrap items-center gap-3 text-sm">
          <input type="hidden" name="id" value={p.id} />
          <select name="status" defaultValue={p.status} className="rounded border border-slate-300 px-2 py-1.5">
            {["LIVE", "PENDING", "REJECTED", "SOLD", "WITHDRAWN"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select name="trustLevel" defaultValue={p.trustLevel} className="rounded border border-slate-300 px-2 py-1.5">
            {TRUST_LEVELS.map((t) => <option key={t.level} value={t.level}>{t.level} · {t.label}</option>)}
          </select>
          <label className="flex items-center gap-1"><input type="checkbox" name="featured" defaultChecked={p.featured} /> Featured</label>
          <button className="rounded bg-slate-900 px-3 py-1.5 text-white">Save</button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-2 text-lg font-semibold">Description</h2>
        <p className="whitespace-pre-line text-sm text-slate-700">{p.description}</p>
      </section>
    </div>
  );
}
