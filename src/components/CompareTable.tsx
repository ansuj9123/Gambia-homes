"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Property } from "@prisma/client";
import { TENURES, TRUST_LEVELS, TYPES, labelFor } from "@/lib/constants";
import { formatMoney, rentSuffix, whatsappLink } from "@/lib/format";
import { useCurrency } from "./CurrencyProvider";
import { MAX_COMPARE, useCompare } from "./CompareProvider";
import { PropertyImage } from "./PropertyImage";
import { TrustBadge } from "./TrustBadge";

type Row = Property & { createdAt: Date; agent: { name: string; agency: string | null; phone: string; verified: boolean } };

type Best = "low" | "high";
type Line = {
  label: string;
  value: (p: Row) => number | null; // for highlighting the best; null = not comparable
  render: (p: Row) => React.ReactNode;
  best?: Best;
  hint?: string;
  isEmpty?: (p: Row) => boolean; // rows empty for every property are hidden
};

export function CompareTable({ urlIds }: { urlIds: string[] }) {
  const router = useRouter();
  const { currency } = useCurrency();
  const compare = useCompare();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [copied, setCopied] = useState(false);

  // The URL decides what's shown (so a shared link works); otherwise use this device's list.
  const ids = urlIds.length ? urlIds : compare.ids;
  const key = ids.join(",");

  useEffect(() => {
    if (!urlIds.length && compare.ids.length) router.replace(`/compare?ids=${compare.ids.join(",")}`);
  }, [urlIds.length, compare.ids, router]);

  useEffect(() => {
    if (!key) return setRows([]);
    let cancelled = false;
    fetch(`/api/properties?ids=${key}`)
      .then((r) => r.json())
      .then((data: Row[]) => {
        if (cancelled) return;
        const byId = new Map(data.map((d) => [d.id, { ...d, createdAt: new Date(d.createdAt) }]));
        setRows(ids.map((id) => byId.get(id)).filter((x): x is Row => Boolean(x)));
      })
      .catch(() => !cancelled && setRows([]));
    return () => {
      cancelled = true;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = (id: string) => {
    compare.remove(id);
    // Keep only listings that still exist, minus the one removed.
    const next = (rows ?? []).map((r) => r.id).filter((x) => x !== id);
    router.replace(next.length ? `/compare?ids=${next.join(",")}` : "/compare");
  };

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/compare?ids=${key}` : "";
  const missing = rows ? ids.length - rows.length : 0;
  const purposes = new Set(rows?.map((r) => `${r.purpose}-${r.rentPeriod ?? ""}`));
  const mixed = purposes.size > 1;

  const lines: Line[] = useMemo(
    () => [
      {
        label: "Price",
        best: "low",
        hint: "lowest",
        value: (p) => (mixed ? null : p.priceGmd),
        render: (p) => (
          <span className="text-base font-bold">
            {formatMoney(p.priceGmd, currency)}
            {rentSuffix(p.rentPeriod)}
            {currency !== "GMD" && <span className="block text-xs font-normal text-slate-500">{formatMoney(p.priceGmd, "GMD")}</span>}
          </span>
        ),
      },
      {
        label: "Price per sqm",
        best: "low",
        hint: "lowest",
        isEmpty: (p) => p.purpose !== "SALE" || !p.plotSqm,
        value: (p) => (p.purpose === "SALE" && p.plotSqm && !mixed ? p.priceGmd / p.plotSqm : null),
        render: (p) => (p.purpose === "SALE" && p.plotSqm ? `${formatMoney(p.priceGmd / p.plotSqm, currency)} / sqm` : "—"),
      },
      { label: "For", value: () => null, render: (p) => (p.purpose === "RENT" ? `Rent${rentSuffix(p.rentPeriod)}` : "Sale") },
      { label: "Type", value: () => null, render: (p) => labelFor(TYPES, p.type) },
      { label: "Location", value: () => null, render: (p) => `${p.area}, ${p.region}` },
      { label: "Plot / floor size", best: "high", hint: "largest", isEmpty: (p) => !p.plotSqm, value: (p) => p.plotSqm, render: (p) => (p.plotSqm ? `${p.plotSqm.toLocaleString("en-GB")} sqm` : "—") },
      { label: "Bedrooms", best: "high", hint: "most", isEmpty: (p) => !p.bedrooms, value: (p) => p.bedrooms, render: (p) => p.bedrooms ?? "—" },
      { label: "Bathrooms", best: "high", hint: "most", isEmpty: (p) => !p.bathrooms, value: (p) => p.bathrooms, render: (p) => p.bathrooms ?? "—" },
      { label: "Tenure", value: () => null, render: (p) => (p.tenure ? labelFor(TENURES, p.tenure) : "—") },
      { label: "Trust level", best: "high", hint: "most verified", value: (p) => p.trustLevel, render: (p) => <TrustBadge level={p.trustLevel} size="md" /> },
      {
        label: "Checks done",
        value: () => null,
        render: (p) => (
          <ul className="space-y-0.5 text-xs">
            {TRUST_LEVELS.slice(1).map((t) => (
              <li key={t.level} className={p.trustLevel >= t.level ? "text-emerald-700" : "text-slate-400"}>
                {p.trustLevel >= t.level ? "✓" : "✗"} {t.label}
              </li>
            ))}
          </ul>
        ),
      },
      { label: "Listed by", value: () => null, render: (p) => <>{p.agent.agency ?? p.agent.name}<span className="block text-xs text-slate-500">{p.agent.verified ? "ID verified" : "ID not verified"}</span></> },
      { label: "Listed", value: () => null, render: (p) => p.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) },
    ],
    [currency, mixed],
  );

  if (rows === null) return <p className="text-slate-500">Loading…</p>;

  if (rows.length < 2) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
        <p>
          {rows.length === 1 ? "Add at least one more property to compare." : "Nothing to compare yet."} Tap <strong>+ Compare</strong> on up to{" "}
          {MAX_COMPARE} listings, then come back here.
        </p>
        <Link href="/search" className="mt-3 inline-block font-semibold text-brand-700 hover:underline">Browse properties</Link>
        {rows.length === 1 && (
          <p className="mt-4 text-sm">
            Selected: <Link href={`/property/${rows[0].slug}`} className="text-brand-700 hover:underline">{rows[0].title}</Link>
          </p>
        )}
      </div>
    );
  }

  const bestOf = (line: Line) => {
    if (!line.best) return null;
    const values = rows.map(line.value).filter((v): v is number => v !== null);
    if (values.length < 2) return null;
    const target = line.best === "low" ? Math.min(...values) : Math.max(...values);
    return values.every((v) => v === target) ? null : target; // no highlight when all equal
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={whatsappLink("", `Have a look at these properties I'm comparing on Gambia Homes: ${shareUrl}`)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-[#25d366] px-4 py-2 text-sm font-semibold text-white"
        >
          Share on WhatsApp
        </a>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(shareUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2500);
            } catch {}
          }}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium"
        >
          {copied ? "✓ Link copied" : "Copy link"}
        </button>
        <span className="text-sm text-slate-500">Send this comparison to family so you can decide together.</span>
      </div>

      {mixed && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          You&apos;re comparing properties for sale with rentals (or different rent periods), so prices aren&apos;t ranked.
        </p>
      )}
      {missing > 0 && (
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
          {missing} {missing === 1 ? "property is" : "properties are"} no longer available and {missing === 1 ? "was" : "were"} left out.
        </p>
      )}

      <p className="text-xs text-slate-500 sm:hidden">Swipe the table sideways to see every property →</p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] table-fixed border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-28 bg-white p-3 text-left align-bottom text-xs uppercase text-slate-500 sm:w-36">
                <span className="inline-block h-3 w-3 rounded-sm bg-emerald-100 ring-1 ring-emerald-300" /> best value
              </th>
              {rows.map((p) => (
                <th key={p.id} className="min-w-[180px] p-3 text-left align-top font-normal">
                  <Link href={`/property/${p.slug}`} className="block max-w-[280px] overflow-hidden rounded-lg">
                    <PropertyImage type={p.type} area={p.area} photos={p.photos} className="aspect-[16/10] w-full" />
                  </Link>
                  <Link href={`/property/${p.slug}`} className="mt-2 line-clamp-2 block font-semibold text-slate-900 hover:text-brand-700">{p.title}</Link>
                  <button type="button" onClick={() => remove(p.id)} className="mt-1 text-xs text-red-700 hover:underline">Remove</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.filter((line) => !line.isEmpty || !rows.every(line.isEmpty)).map((line) => {
              const best = bestOf(line);
              return (
                <tr key={line.label} className="border-t border-slate-100">
                  <th scope="row" className="sticky left-0 z-10 bg-white p-3 text-left align-top text-xs font-semibold uppercase text-slate-500">
                    {line.label}
                    {best !== null && line.hint && <span className="block font-normal normal-case text-emerald-700">green = {line.hint}</span>}
                  </th>
                  {rows.map((p) => {
                    const v = line.value(p);
                    const isBest = best !== null && v === best;
                    return (
                      <td key={p.id} className={`p-3 align-top ${isBest ? "bg-emerald-50" : ""}`}>
                        {line.render(p)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            <tr className="border-t border-slate-100">
              <th scope="row" className="sticky left-0 z-10 bg-white p-3" />
              {rows.map((p) => (
                <td key={p.id} className="space-y-2 p-3 align-top">
                  <Link href={`/property/${p.slug}`} className="block rounded-lg bg-brand-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-brand-700">View &amp; contact</Link>
                  <Link href={`/property/${p.slug}?tab=verify`} className="block rounded-lg border border-slate-300 px-3 py-2 text-center text-sm font-medium">Order verification</Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
