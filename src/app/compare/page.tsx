import type { Metadata } from "next";
import { CompareTable } from "@/components/CompareTable";

export const metadata: Metadata = { title: "Compare properties — Gambia Homes" };

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const ids = ((await searchParams).ids ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold">Compare properties</h1>
      <p className="mb-6 text-sm text-slate-500">Side by side, in your chosen currency. Green marks the best value in each row.</p>
      <CompareTable urlIds={ids} />
    </div>
  );
}
