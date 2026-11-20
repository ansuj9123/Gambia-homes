"use client";

import { useState } from "react";
import Link from "next/link";
import {
  requestPhoneCode,
  signInWithPassword,
  signInWithPhone,
  signUpWithPassword,
  type AuthState,
} from "@/app/account-actions";
import { useFormSubmit } from "./useFormSubmit";

const input = "w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm";
const label = "mb-1 block text-sm font-medium text-slate-700";

function Message({ state }: { state: AuthState }) {
  if (!state?.message) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={`rounded-md px-3 py-2 text-sm ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
      {state.message}
    </p>
  );
}

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button disabled={pending} className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
      {pending ? "Please wait…" : children}
    </button>
  );
}

export function PasswordSignInForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, onSubmit, pending] = useFormSubmit(signInWithPassword);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <div>
        <label className={label} htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className={input} />
      </div>
      <div>
        <label className={label} htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={input} />
      </div>
      <Message state={state} />
      <Submit pending={pending}>Sign in</Submit>
    </form>
  );
}

export function PasswordSignUpForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, onSubmit, pending] = useFormSubmit(signUpWithPassword);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <div>
        <label className={label} htmlFor="name">Full name</label>
        <input id="name" name="name" autoComplete="name" required className={input} />
      </div>
      <div>
        <label className={label} htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className={input} />
      </div>
      <div>
        <label className={label} htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className={input} />
        <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>
      </div>
      <div>
        <label className={label} htmlFor="country">Country you live in</label>
        <input id="country" name="country" autoComplete="country-name" placeholder="e.g. United Kingdom, The Gambia" className={input} />
      </div>
      <Message state={state} />
      <Submit pending={pending}>Create account</Submit>
      <p className="text-xs text-slate-500">
        By creating an account you agree to our terms and privacy policy (to be published before launch).
      </p>
    </form>
  );
}

export function PhoneSignInForm({ callbackUrl }: { callbackUrl: string }) {
  const [codeState, requestCode, requesting] = useFormSubmit(requestPhoneCode);
  const [signInState, verify, verifying] = useFormSubmit(signInWithPhone);
  const [changing, setChanging] = useState(false);
  const phone = !changing && codeState?.ok ? codeState.phone : undefined;

  if (!phone) {
    return (
      <form onSubmit={(e) => { setChanging(false); requestCode(e); }} className="space-y-3">
        <div>
          <label className={label} htmlFor="phone">Mobile number</label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+220 700 0000 or +44 7700 900123" required className={input} defaultValue={codeState?.phone} />
          <p className="mt-1 text-xs text-slate-500">We&apos;ll send a 6-digit code by SMS or WhatsApp. Gambian numbers can skip the +220.</p>
        </div>
        <Message state={codeState} />
        <Submit pending={requesting}>Send code</Submit>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="space-y-3">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <input type="hidden" name="phone" value={phone} />
      <Message state={signInState ?? codeState} />
      {codeState?.devCode && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Development only: your code is <strong>{codeState.devCode}</strong>. In production it arrives by SMS or WhatsApp.
        </p>
      )}
      <div>
        <label className={label} htmlFor="code">6-digit code</label>
        <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required className={`${input} tracking-[0.4em]`} />
      </div>
      <div>
        <label className={label} htmlFor="name">Your name (if you&apos;re new)</label>
        <input id="name" name="name" autoComplete="name" className={input} />
      </div>
      <Submit pending={verifying}>Verify and continue</Submit>
      <button type="button" onClick={() => setChanging(true)} className="w-full text-sm text-slate-600 hover:underline">
        Use a different number
      </button>
    </form>
  );
}

export function AuthTabs({ callbackUrl, mode }: { callbackUrl: string; mode: "signin" | "signup" }) {
  const [tab, setTab] = useState<"email" | "phone">("email");
  return (
    <div>
      <div role="tablist" className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-sm">
        {(["email", "phone"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-2 font-medium ${tab === t ? "bg-white shadow" : "text-slate-600"}`}
          >
            {t === "email" ? "Email" : "Phone / WhatsApp"}
          </button>
        ))}
      </div>
      {tab === "phone" ? (
        <PhoneSignInForm callbackUrl={callbackUrl} />
      ) : mode === "signup" ? (
        <PasswordSignUpForm callbackUrl={callbackUrl} />
      ) : (
        <PasswordSignInForm callbackUrl={callbackUrl} />
      )}
      <p className="mt-6 text-center text-sm text-slate-600">
        {mode === "signin" ? (
          <>New here? <Link href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-semibold text-brand-700 hover:underline">Create an account</Link></>
        ) : (
          <>Already have an account? <Link href={`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-semibold text-brand-700 hover:underline">Sign in</Link></>
        )}
      </p>
    </div>
  );
}
