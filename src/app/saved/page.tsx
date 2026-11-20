import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PropertyCard } from "@/components/PropertyCard";
import { LocalSaved } from "@/components/LocalSaved";

export const metadata: Metadata = { title: "Saved properties — Gambia Homes" };

export default async function SavedPage() {
  const session = await auth();
  const saved = session?.user?.id
    ? await db.savedProperty.findMany({
        where: { userId: session.user.id, property: { status: "LIVE" } },
        include: { property: true },
        orderBy: { createdAt: "desc" },
      })
    : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold">Saved properties</h1>
      {saved ? (
        <>
          <p className="mb-6 text-sm text-slate-500">Saved to your account, on every device.</p>
          {saved.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
              Nothing saved yet. Tap ♡ on any listing to keep it here.{" "}
              <Link href="/search" className="font-medium text-brand-700 hover:underline">Start searching</Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {saved.map((s) => <PropertyCard key={s.propertyId} p={s.property} />)}
            </div>
          )}
        </>
      ) : (
        <>
          <p className="mb-6 text-sm text-slate-500">
            Saved on this device only.{" "}
            <Link href="/signin?callbackUrl=/saved" className="font-medium text-brand-700 hover:underline">Sign in</Link> to keep them on
            every device and get alerts.
          </p>
          <LocalSaved />
        </>
      )}
    </div>
  );
}
