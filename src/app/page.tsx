import Link from "next/link";
import { db } from "@/lib/db";
import { ALL_AREAS, TRUST_LEVELS, TYPES } from "@/lib/constants";
import { PropertyCard } from "@/components/PropertyCard";
import { TrustBadge } from "@/components/TrustBadge";

export const dynamic = "force-dynamic";

const POPULAR = ["Brusubi", "Brikama", "Kololi", "Bijilo", "Sukuta", "Gunjur", "Tanji", "Fajara"];

export default async function Home() {
  const [featured, counts] = await Promise.all([
    db.property.findMany({ where: { status: "LIVE", featured: true }, orderBy: { trustLevel: "desc" }, take: 6 }),
    db.property.groupBy({ by: ["area"], where: { status: "LIVE" }, _count: true }),
  ]);
  const countFor = (area: string) => counts.find((c) => c.area === area)?._count ?? 0;
  const verifiedCount = await db.property.count({ where: { status: "LIVE", trustLevel: { gte: 3 } } });

  return (
    <>
      <section className="bg-gradient-to-br from-ocean-900 via-ocean-700 to-brand-700 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
          <p className="mb-3 inline-block rounded-full bg-white/15 px-3 py-1 text-sm">For Gambians at home and abroad</p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-5xl">Buy property at home safely, from anywhere.</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/85">
            Verified land, houses and rentals across The Gambia. Every listing shows exactly which checks have been done.
          </p>

          <form action="/search" method="get" className="mt-8 grid max-w-4xl gap-2 rounded-2xl bg-white p-2 text-slate-900 shadow-xl md:grid-cols-[140px_1fr_180px_auto]">
            <select name="purpose" defaultValue="SALE" className="rounded-xl border border-slate-200 px-3 py-3 text-sm" aria-label="Buy or rent">
              <option value="SALE">Buy</option>
              <option value="RENT">Rent</option>
            </select>
            <select name="area" defaultValue="" className="rounded-xl border border-slate-200 px-3 py-3 text-sm" aria-label="Area">
              <option value="">Anywhere in The Gambia</option>
              {ALL_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select name="type" defaultValue="" className="rounded-xl border border-slate-200 px-3 py-3 text-sm" aria-label="Property type">
              <option value="">Any type</option>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <button className="rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700">Search</button>
          </form>
          <p className="mt-3 text-sm text-white/75">{verifiedCount} site-verified listings · prices in £, $, € or dalasi</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-2xl font-bold">Featured verified properties</h2>
          <Link href="/search?trust=3" className="text-sm font-medium text-brand-700 hover:underline">See all verified</Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p) => <PropertyCard key={p.id} p={p} />)}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold">Know what&apos;s been checked before you pay</h2>
            <p className="mt-2 text-slate-600">
              Double sales and forged papers cost Gambians abroad millions every year. Every listing carries a trust level, and
              you can order a lawyer-led verification report on any property.
            </p>
            <Link href="/how-it-works" className="mt-4 inline-block rounded-lg bg-ocean-900 px-4 py-2 text-sm font-semibold text-white">
              How buying from abroad works
            </Link>
          </div>
          <ul className="space-y-3">
            {TRUST_LEVELS.map((t) => (
              <li key={t.level} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                <TrustBadge level={t.level} />
                <span className="text-sm text-slate-700">{t.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="mb-5 text-2xl font-bold">Popular areas</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {POPULAR.map((a) => (
            <Link key={a} href={`/search?area=${encodeURIComponent(a)}`} className="rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-600">
              <p className="font-semibold">{a}</p>
              <p className="text-sm text-slate-500">{countFor(a)} listings</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4">
        <div className="grid gap-6 rounded-2xl bg-brand-50 p-8 md:grid-cols-2">
          <div>
            <h2 className="text-xl font-bold">Living in The Gambia?</h2>
            <p className="mt-1 text-slate-700">Find rentals, student rooms and land near you, with prices in dalasi. Switch currency at the top of the page.</p>
            <Link href="/search?purpose=RENT" className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline">Browse rentals →</Link>
          </div>
          <div>
            <h2 className="text-xl font-bold">Agent, developer or owner?</h2>
            <p className="mt-1 text-slate-700">List free during launch. Our team visits to take photos and verify your listing, so diaspora buyers trust it.</p>
            <Link href="/list-property" className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline">List a property →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
