import Link from "next/link";
import type { Property } from "@prisma/client";
import { TYPES, labelFor } from "@/lib/constants";
import { Price } from "./CurrencyProvider";
import { PropertyImage } from "./PropertyImage";
import { SaveButton } from "./SaveButton";
import { CompareButton } from "./CompareProvider";
import { TrustBadge } from "./TrustBadge";

export function PropertyCard({ p }: { p: Property }) {
  const facts = [
    p.bedrooms ? `${p.bedrooms} bed` : null,
    p.bathrooms ? `${p.bathrooms} bath` : null,
    p.plotSqm ? `${p.plotSqm.toLocaleString("en-GB")} sqm` : null,
  ].filter(Boolean);

  return (
    <Link
      href={`/property/${p.slug}`}
      className="group block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <PropertyImage type={p.type} area={p.area} photos={p.photos} className="h-full w-full" />
        <div className="absolute left-2 top-2 flex gap-1">
          <TrustBadge level={p.trustLevel} />
          {p.featured && <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-semibold text-amber-950">Featured</span>}
        </div>
        <div className="absolute right-2 top-2">
          <SaveButton id={p.id} />
        </div>
      </div>
      <div className="space-y-1 p-4">
        <Price gmd={p.priceGmd} rentPeriod={p.rentPeriod} className="text-lg font-bold text-slate-900" />
        <h3 className="line-clamp-1 font-medium text-slate-800 group-hover:text-brand-700">{p.title}</h3>
        <p className="text-sm text-slate-500">
          {labelFor(TYPES, p.type)} · {p.area}, {p.region}
        </p>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-slate-600">{facts.join(" · ")}</p>
          <CompareButton id={p.id} />
        </div>
      </div>
    </Link>
  );
}
