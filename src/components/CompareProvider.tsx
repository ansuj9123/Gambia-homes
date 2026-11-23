"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const MAX_COMPARE = 4;
const KEY = "gh.compare";

type Ctx = {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  notice: string | null;
};

const CompareContext = createContext<Ctx>({ ids: [], has: () => false, toggle: () => {}, remove: () => {}, clear: () => {}, notice: null });

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, MAX_COMPARE) : [];
  } catch {
    return [];
  }
}

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => setIds(read()), []);

  const save = (next: string[]) => {
    setIds(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  };

  const toggle = (id: string) => {
    if (ids.includes(id)) return save(ids.filter((x) => x !== id));
    if (ids.length >= MAX_COMPARE) {
      setNotice(`You can compare up to ${MAX_COMPARE} properties. Remove one first.`);
      setTimeout(() => setNotice(null), 4000);
      return;
    }
    save([...ids, id]);
  };

  return (
    <CompareContext.Provider
      value={{ ids, has: (id) => ids.includes(id), toggle, remove: (id) => save(ids.filter((x) => x !== id)), clear: () => save([]), notice }}
    >
      {children}
      <CompareBar />
    </CompareContext.Provider>
  );
}

export const useCompare = () => useContext(CompareContext);

export function CompareButton({ id, large = false }: { id: string; large?: boolean }) {
  const { has, toggle } = useCompare();
  const on = has(id);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(id);
      }}
      className={
        large
          ? `rounded-lg border px-4 py-2 text-sm font-medium ${on ? "border-ocean-700 bg-ocean-700 text-white" : "border-slate-300 bg-white hover:bg-slate-50"}`
          : `rounded-md border px-2 py-0.5 text-xs font-medium ${on ? "border-ocean-700 bg-ocean-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`
      }
    >
      {on ? "✓ Comparing" : "+ Compare"}
    </button>
  );
}

function CompareBar() {
  const { ids, clear, notice } = useCompare();
  const pathname = usePathname();
  if (pathname.startsWith("/compare") || (ids.length === 0 && !notice)) return null;
  return (
    <>
    {/* spacer so the bar never covers the bottom of the page */}
    <div className="h-16" aria-hidden />
    <div className="fixed inset-x-0 bottom-0 z-[1100] border-t border-slate-200 bg-white/95 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
        {notice ? (
          <p role="status" className="text-sm font-medium text-red-700">{notice}</p>
        ) : (
          <p className="text-sm">
            <strong>{ids.length}</strong> of {MAX_COMPARE} properties selected to compare
            {ids.length === 1 && <span className="text-slate-500"> · add at least one more</span>}
          </p>
        )}
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={clear} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Clear</button>
          <Link
            href={`/compare?ids=${ids.join(",")}`}
            aria-disabled={ids.length < 2}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold text-white ${ids.length < 2 ? "pointer-events-none bg-slate-400" : "bg-ocean-700 hover:bg-ocean-900"}`}
          >
            Compare now
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}
