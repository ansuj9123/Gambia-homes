"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { changePassword, saveSearch, updateProfile } from "@/app/account-actions";
import { useAccount } from "./AccountProvider";
import { useFormSubmit } from "./useFormSubmit";

const input = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

export function ProfileForm({ name, country }: { name: string; country: string }) {
  const [state, onSubmit, pending] = useFormSubmit(updateProfile);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Name</span>
          <input name="name" defaultValue={name} className={input} autoComplete="name" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Country you live in</span>
          <input name="country" defaultValue={country} className={input} autoComplete="country-name" />
        </label>
      </div>
      {state && (
        <p role="status" className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</p>
      )}
      <button disabled={pending} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

export function SaveSearchButton({ query, name }: { query: string; name: string }) {
  const { user } = useAccount();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  if (!user) {
    return (
      <Link
        href={`/signin?callbackUrl=${encodeURIComponent(`/search?${query}`)}`}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
      >
        Save search
      </Link>
    );
  }
  if (result?.ok) {
    return (
      <Link href="/account#searches" className="text-sm font-medium text-emerald-700 hover:underline">
        ✓ Saved. Manage alerts
      </Link>
    );
  }
  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => setResult(await saveSearch(query, name)))}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save search"}
      </button>
      {result && !result.ok && <span className="text-sm text-red-700">{result.message}</span>}
    </span>
  );
}

export function ChangePasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, onSubmit, pending] = useFormSubmit(changePassword);
  const [formKey, setFormKey] = useState(0);
  const [lastOk, setLastOk] = useState<typeof state>(null);
  // Clear the fields after a successful change.
  if (state?.ok && state !== lastOk) {
    setLastOk(state);
    setFormKey((k) => k + 1);
  }
  return (
    <form key={formKey} onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {hasPassword && (
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Current password</span>
            <input name="currentPassword" type="password" autoComplete="current-password" required className={input} />
          </label>
        )}
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">New password</span>
          <input name="newPassword" type="password" autoComplete="new-password" minLength={8} required className={input} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Confirm new password</span>
          <input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required className={input} />
        </label>
      </div>
      <p className="text-xs text-slate-500">At least 8 characters.</p>
      {state && (
        <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</p>
      )}
      <button disabled={pending} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Saving…" : hasPassword ? "Change password" : "Set password"}
      </button>
    </form>
  );
}
