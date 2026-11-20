import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { buildOrder, buildWhere, parseSearch, type SearchParams } from "@/lib/search";
import { PURPOSES, labelFor } from "@/lib/constants";
import { describeSearch } from "@/lib/describe-search";
import { SaveSearchButton } from "@/components/AccountForms";
import { PropertyCard } from "@/components/PropertyCard";
import { SearchFilters } from "@/components/SearchFilters";
import { Map } from "@/components/MapLoader";

export const metadata: Metadata = { title: "Search property — Gambia Homes" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const s = parseSearch(sp);
  const results = await db.property.findMany({ where: buildWhere(s), orderBy: buildOrder(s.sort), take: 200 });

  const heading = describeSearch(s);
  const saveQuery = new URLSearchParams(
    Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === "string" && e[1] !== "" && e[0] !== "view"),
  ).toString();

  const toggle = (view: "list" | "map") => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v) params.set(k, v);
    params.set("view", view);
    return `/search?${params.toString()}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{heading}</h1>
          <p className="text-sm text-slate-500">
            {results.length} {results.length === 1 ? "result" : "results"}
            {s.purpose ? ` · ${labelFor(PURPOSES, s.purpose)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
        <SaveSearchButton query={saveQuery} name={heading} />
        <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm">
          <Link href={toggle("list")} className={`rounded-md px-3 py-1 ${s.view === "list" ? "bg-slate-900 text-white" : ""}`}>List</Link>
          <Link href={toggle("map")} className={`rounded-md px-3 py-1 ${s.view === "map" ? "bg-slate-900 text-white" : ""}`}>Map</Link>
        </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside><SearchFilters s={s} /></aside>
        <section>
          {results.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
              No properties match these filters yet. Try widening the price range or area.
            </div>
          ) : s.view === "map" ? (
            <Map
              height={640}
              points={results.map((p) => ({
                id: p.id, slug: p.slug, title: p.title, lat: p.lat, lng: p.lng,
                priceGmd: p.priceGmd, rentPeriod: p.rentPeriod, trustLevel: p.trustLevel,
              }))}
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((p) => <PropertyCard key={p.id} p={p} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
