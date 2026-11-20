"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Property } from "@prisma/client";
import { PropertyCard } from "./PropertyCard";
import { readLocalSaved } from "./AccountProvider";

export function LocalSaved() {
  const [items, setItems] = useState<Property[] | null>(null);

  useEffect(() => {
    const ids = readLocalSaved();
    if (ids.length === 0) return setItems([]);
    fetch(`/api/properties?ids=${ids.join(",")}`)
      .then((r) => r.json())
      .then((rows: Property[]) => setItems(rows.map((r) => ({ ...r, createdAt: new Date(r.createdAt) }))))
      .catch(() => setItems([]));
  }, []);

  if (items === null) return <p className="text-slate-500">Loading…</p>;
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
        Nothing saved yet. Tap ♡ on any listing to keep it here.{" "}
        <Link href="/search" className="font-medium text-brand-700 hover:underline">Start searching</Link>
      </div>
    );
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((p) => <PropertyCard key={p.id} p={p} />)}
    </div>
  );
}
