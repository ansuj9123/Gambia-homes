"use client";

import { useState } from "react";
import { CURRENCIES, PURPOSES, REGIONS, TRUST_LEVELS, TYPES } from "@/lib/constants";
import type { ParsedSearch } from "@/lib/search";
import { useCurrency } from "./CurrencyProvider";
import { encodeArea } from "@/lib/geo";

const field = "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm";
const labelCls = "block text-xs font-semibold uppercase tracking-wide text-slate-500";

export function SearchFilters({ s }: { s: ParsedSearch }) {
  const { currency } = useCurrency();
  const [region, setRegion] = useState(s.region ?? "");
  // Price bounds typed by the user are in the currency they had when searching;
  // keep them only if they still view in that currency.
  const sameCur = s.cur === currency;

  return (
    <form action="/search" method="get" className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <input type="hidden" name="cur" value={currency} />
      <input type="hidden" name="view" value={s.view} />
      {s.polygon && <input type="hidden" name="poly" value={encodeArea(s.polygon)} />}
      {s.polygon && (
        <p className="rounded-md bg-ocean-700/10 px-2 py-1.5 text-xs text-ocean-900">Filtering inside your drawn area. Use &ldquo;Clear area&rdquo; to search everywhere.</p>
      )}
      <div>
        <label className={labelCls} htmlFor="q">Keyword</label>
        <input id="q" name="q" defaultValue={s.q} placeholder="e.g. beach, Brusubi" className={field} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} htmlFor="purpose">Looking to</label>
          <select id="purpose" name="purpose" defaultValue={s.purpose ?? ""} className={field}>
            <option value="">Buy or rent</option>
            {PURPOSES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="type">Type</label>
          <select id="type" name="type" defaultValue={s.type ?? ""} className={field}>
            <option value="">Any type</option>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} htmlFor="region">Region</label>
          <select id="region" name="region" value={region} onChange={(e) => setRegion(e.target.value)} className={field}>
            <option value="">All regions</option>
            {Object.keys(REGIONS).map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="area">Area</label>
          <select id="area" name="area" defaultValue={s.area ?? ""} key={region} className={field}>
            <option value="">All areas</option>
            {(region ? REGIONS[region] : Object.values(REGIONS).flat()).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <span className={labelCls}>Price ({CURRENCIES[currency].symbol} {currency})</span>
        <div className="mt-1 grid grid-cols-2 gap-3">
          <input name="min" type="number" min={0} placeholder="Min" defaultValue={sameCur ? s.min : undefined} key={`min-${currency}`} className={field} aria-label="Minimum price" />
          <input name="max" type="number" min={0} placeholder="Max" defaultValue={sameCur ? s.max : undefined} key={`max-${currency}`} className={field} aria-label="Maximum price" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} htmlFor="beds">Bedrooms</label>
          <select id="beds" name="beds" defaultValue={s.beds?.toString() ?? ""} className={field}>
            <option value="">Any</option>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="minPlot">Min plot (sqm)</label>
          <input id="minPlot" name="minPlot" type="number" min={0} step={50} defaultValue={s.minPlot} className={field} />
        </div>
      </div>
      <div>
        <label className={labelCls} htmlFor="trust">Verification</label>
        <select id="trust" name="trust" defaultValue={s.trust?.toString() ?? ""} className={field}>
          <option value="">Show all listings</option>
          {TRUST_LEVELS.slice(1).map((t) => <option key={t.level} value={t.level}>{t.label} or better</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls} htmlFor="sort">Sort by</label>
        <select id="sort" name="sort" defaultValue={s.sort} className={field}>
          <option value="featured">Recommended</option>
          <option value="trust">Most verified</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="newest">Newest</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button className="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Search</button>
        <a href="/search" className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Clear</a>
      </div>
    </form>
  );
}
