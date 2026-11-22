import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { TENURES, TRUST_LEVELS, TYPES, labelFor } from "@/lib/constants";
import { whatsappLink } from "@/lib/format";
import { Price } from "@/components/CurrencyProvider";
import { Gallery } from "@/components/Gallery";
import { parsePhotos } from "@/lib/photos";
import { SaveButton } from "@/components/SaveButton";
import { TrustBadge } from "@/components/TrustBadge";
import { PropertyForms } from "@/components/PropertyForms";
import { Map } from "@/components/MapLoader";
import { paymentsEnabled } from "@/lib/stripe";
import { requestOrigin } from "@/lib/request-origin";

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ payment?: string }> };

async function getProperty(slug: string) {
  return db.property.findFirst({ where: { slug, status: "LIVE" }, include: { agent: true } });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProperty((await params).slug);
  return { title: p ? `${p.title} — Gambia Homes` : "Property not found" };
}

export default async function PropertyPage({ params, searchParams }: Props) {
  const p = await getProperty((await params).slug);
  if (!p) notFound();
  const paymentCancelled = (await searchParams)?.payment === "cancelled";

  const facts: [string, string][] = [
    ["Type", labelFor(TYPES, p.type)],
    ["Location", `${p.area}, ${p.region}`],
    ...(p.bedrooms ? [["Bedrooms", String(p.bedrooms)] as [string, string]] : []),
    ...(p.bathrooms ? [["Bathrooms", String(p.bathrooms)] as [string, string]] : []),
    ...(p.plotSqm ? [["Plot / floor size", `${p.plotSqm.toLocaleString("en-GB")} sqm`] as [string, string]] : []),
    ...(p.tenure ? [["Tenure", labelFor(TENURES, p.tenure)] as [string, string]] : []),
    ["Listed", p.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })],
  ];

  const url = `${await requestOrigin()}/property/${p.slug}`;
  const wa = whatsappLink(p.agent.phone, `Hello, I saw "${p.title}" on Gambia Homes and would like more details. ${url}`);
  const nearby = await db.property.findMany({
    where: { status: "LIVE", area: p.area, id: { not: p.id } },
    take: 3,
    orderBy: { trustLevel: "desc" },
    select: { id: true, slug: true, title: true },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <nav className="mb-3 text-sm text-slate-500">
        <Link href="/search" className="hover:underline">Search</Link> /{" "}
        <Link href={`/search?region=${encodeURIComponent(p.region)}`} className="hover:underline">{p.region}</Link> /{" "}
        <Link href={`/search?area=${encodeURIComponent(p.area)}`} className="hover:underline">{p.area}</Link>
      </nav>

      {paymentCancelled && (
        <p role="status" className="mb-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-800">
          Payment cancelled. No money was taken. You can pay later from your account, or order again below.
        </p>
      )}

      {p.sample && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Sample listing for development. Not a real property.</p>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Gallery photos={parsePhotos(p.photos)} type={p.type} area={p.area} title={p.title} />

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Price gmd={p.priceGmd} rentPeriod={p.rentPeriod} showDalasi className="text-3xl font-bold" />
              <h1 className="mt-1 text-xl font-semibold">{p.title}</h1>
              <p className="text-slate-600">{p.area}, {p.region}</p>
            </div>
            <div className="flex items-center gap-2">
              <TrustBadge level={p.trustLevel} size="md" />
              <SaveButton id={p.id} large />
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
            {facts.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs uppercase tracking-wide text-slate-500">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>

          <section>
            <h2 className="mb-2 text-lg font-semibold">About this property</h2>
            <p className="whitespace-pre-line text-slate-700">{p.description}</p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-lg font-semibold">Verification checks</h2>
            <ol className="space-y-2">
              {TRUST_LEVELS.slice(1).map((t) => {
                const done = p.trustLevel >= t.level;
                return (
                  <li key={t.level} className="flex gap-3">
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${done ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                      {done ? "✓" : t.level}
                    </span>
                    <span>
                      <span className={`font-medium ${done ? "" : "text-slate-500"}`}>{t.label}</span>
                      <span className="block text-sm text-slate-600">{t.detail}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
            {p.trustLevel < 4 && (
              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                Not every check has been done yet. Order a verification report before paying any deposit.
              </p>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Location</h2>
            <Map height={320} points={[{ id: p.id, slug: p.slug, title: p.title, lat: p.lat, lng: p.lng, priceGmd: p.priceGmd, rentPeriod: p.rentPeriod, trustLevel: p.trustLevel }]} />
            <p className="mt-1 text-xs text-slate-500">
              {p.trustLevel >= 3 ? "GPS point recorded on site by a field agent." : "Approximate location provided by the lister."}
            </p>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="font-semibold">{p.agent.agency ?? p.agent.name}</p>
            <p className="text-sm text-slate-600">
              {p.agent.agency ? p.agent.name : "Private seller"}
              {p.agent.verified ? " · ID verified" : " · Not yet verified"}
            </p>
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#25d366] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95"
            >
              Chat on WhatsApp
            </a>
          </div>
          <PropertyForms propertyId={p.id} paymentsOn={paymentsEnabled()} startTab={paymentCancelled ? "verify" : "message"} />
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-900">
            <p className="font-semibold">Protect your money</p>
            <p className="mt-1">Never pay a deposit before viewing and verification. Pay only through a lawyer&apos;s client account or our escrow partner.</p>
          </div>
          {nearby.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
              <p className="mb-2 font-semibold">More in {p.area}</p>
              <ul className="space-y-1">
                {nearby.map((n) => (
                  <li key={n.id}><Link href={`/property/${n.slug}`} className="text-brand-700 hover:underline">{n.title}</Link></li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
