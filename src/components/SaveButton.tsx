"use client";

import { useTransition } from "react";
import { toggleSavedProperty } from "@/app/account-actions";
import { readLocalSaved, useAccount, writeLocalSaved } from "./AccountProvider";

export function SaveButton({ id, large = false }: { id: string; large?: boolean }) {
  const { user, savedIds, setSaved } = useAccount();
  const [pending, startTransition] = useTransition();
  const saved = savedIds.has(id);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      const current = readLocalSaved();
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      writeLocalSaved(next);
      setSaved(id, next.includes(id));
      return;
    }
    setSaved(id, !saved); // optimistic
    startTransition(async () => {
      const result = await toggleSavedProperty(id);
      if (result !== null) setSaved(id, result);
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save property"}
      className={
        large
          ? "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          : "rounded-full bg-white/90 px-2.5 py-1 text-sm shadow hover:bg-white"
      }
    >
      <span className={saved ? "text-red-600" : "text-slate-600"}>{saved ? "♥" : "♡"}</span>
      {large && <span className="ml-2">{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}
