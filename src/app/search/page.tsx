import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { buildOrder, buildWhere, filterByArea, parseSearch, type SearchParams } from "@/lib/search";
import { PURPOSES, labelFor } from "@/lib/constants";
import { describeSearch } from "@/lib/describe-search";
import { areaKm2 } from "@/lib/geo";
import { SaveSearchButton } from "@/components/AccountForms";
import { PropertyCard } from "@/components/PropertyCard";
import { SearchFilters } from "@/components/SearchFilters";
import { SearchMap } from "@/components/SearchMap";

export const metadata: Metadata = { title: "Search property — Gambia Homes" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const s = parseSearch(sp);
  const results = filterByArea(await db.property.findMany({ where: buildWhere(s), orderBy: buildOrder(s.sort), take: 500 }), s).slice(0, 200);

  const heading = describeSearch(s);
  const params = (omit: string[] = []) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v && !omit.includes(k)) p.set(k, v);
    return p;
  };
  const href = (changes: Record<string, string | null>, omit: string[] = ["draw"]) => {
    const p = params(omit);
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    return `/search?${p.toString()}`;
  };
  const saveQuery = params(["view", "draw"]).toString();
  const mapQuery = params(["poly", "draw", "view"]).toString();
  const km2 = s.polygon ? areaKm2(s.polygon) : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{heading}</h1>
          <p className="text-sm text-slate-500">
            {results.length} {results.length === 1 ? "result" : "results"}
            {s.purpose ? ` · ${labelFor(PURPOSES, s.purpose)}` : ""}
            {s.polygon ? ` · drawn area about ${km2.toFixed(km2 < 1 ? 2 : 1)} km²` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={href({ view: "map", draw: "1" }, [])} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50">
            ✏️ {s.polygon ? "Redraw area" : "Draw an area"}
          </Link>
          <SaveSearchButton query={saveQuery} name={heading} />
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm">
            <Link href={href({ view: "list" })} className={`rounded-md px-3 py-1 ${s.view === "list" ? "bg-slate-900 text-white" : ""}`}>List</Link>
            <Link href={href({ view: "map" })} className={`rounded-md px-3 py-1 ${s.view === "map" ? "bg-slate-900 text-white" : ""}`}>Map</Link>
          </div>
        </div>
      </div>

      {s.polygon && s.view === "list" && (
        <p className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-ocean-700/10 px-3 py-2 text-sm text-ocean-900">
          Showing only listings inside the area you drew.
          <Link href={href({ view: "map" })} className="font-semibold underline">See it on the map</Link>
          <Link href={href({ poly: null })} className="font-semibold underline">Clear area</Link>
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* On phones the map comes first in map view, so drawing an area doesn't need scrolling past the filters. */}
        <aside className={s.view === "map" ? "order-2 lg:order-none" : ""}><SearchFilters s={s} /></aside>
        <section className={s.view === "map" ? "order-1 lg:order-none" : ""}>
          {s.view === "map" ? (
            <>
              {results.length === 0 && (
                <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {s.polygon ? "No listings inside this area yet. Try drawing a bigger area or widening the filters." : "No properties match these filters yet."}
                </p>
              )}
              <SearchMap
                key={sp.draw === "1" ? "drawing" : "map"}
                query={mapQuery}
                polygon={s.polygon}
                startDrawing={sp.draw === "1"}
                points={results.map((p) => ({
                  id: p.id, slug: p.slug, title: p.title, lat: p.lat, lng: p.lng,
                  priceGmd: p.priceGmd, rentPeriod: p.rentPeriod, trustLevel: p.trustLevel,
                }))}
              />
            </>
          ) : results.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
              {s.polygon ? "No listings inside the area you drew yet. Try a bigger area or wider filters." : "No properties match these filters yet. Try widening the price range or area."}
            </div>
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
