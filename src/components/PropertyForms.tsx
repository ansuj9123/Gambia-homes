"use client";

import { useEffect, useState } from "react";
import { useFormSubmit } from "./useFormSubmit";
import { useAccount } from "./AccountProvider";
import { orderVerification, reportScam, sendEnquiry, type FormState } from "@/app/actions";
import { VERIFICATION_PRODUCTS } from "@/lib/constants";

const input = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

function Status({ state }: { state: FormState }) {
  if (!state) return null;
  return (
    <p role="status" className={`rounded-md px-3 py-2 text-sm ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
      {state.message}
    </p>
  );
}

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button disabled={pending} className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
      {pending ? "Sending…" : children}
    </button>
  );
}

function ContactFields() {
  const { user } = useAccount();
  return (
    <>
      <input name="name" placeholder="Your name" className={input} autoComplete="name" defaultValue={user?.name ?? ""} />
      <input name="email" type="email" placeholder="Email" className={input} autoComplete="email" defaultValue={user?.email ?? ""} />
      <div className="grid grid-cols-2 gap-2">
        <input name="phone" placeholder="Phone / WhatsApp" className={input} autoComplete="tel" defaultValue={user?.phone ?? ""} />
        <input name="country" placeholder="Country you live in" className={input} autoComplete="country-name" defaultValue={user?.country ?? ""} />
      </div>
    </>
  );
}

function EnquiryForm({ propertyId, kind }: { propertyId: string; kind: "MESSAGE" | "VIDEO_VIEWING" }) {
  const [state, onSubmit, pending] = useFormSubmit(sendEnquiry);
  if (state?.ok) return <Status state={state} />;
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="kind" value={kind} />
      <ContactFields />
      <textarea
        name="message"
        rows={3}
        className={input}
        defaultValue={
          kind === "VIDEO_VIEWING"
            ? "I'd like a live video viewing of this property. My preferred days and times (with time zone) are: "
            : "Hello, I'm interested in this property. Is it still available?"
        }
      />
      <Status state={state} />
      <Submit pending={pending}>{kind === "VIDEO_VIEWING" ? "Request video viewing" : "Send message"}</Submit>
    </form>
  );
}

function VerificationForm({ propertyId, paymentsOn }: { propertyId: string; paymentsOn: boolean }) {
  const [state, onSubmit, pending] = useFormSubmit(orderVerification);
  const { user } = useAccount();
  useEffect(() => {
    if (state?.redirectUrl) window.location.assign(state.redirectUrl);
  }, [state]);
  if (state?.ok) return <Status state={state} />;
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="propertyId" value={propertyId} />
      <fieldset className="space-y-2">
        {VERIFICATION_PRODUCTS.map((p, i) => (
          <label key={p.value} className="flex cursor-pointer gap-3 rounded-lg border border-slate-200 p-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
            <input type="radio" name="level" value={p.value} defaultChecked={i === 1} className="mt-1" />
            <span>
              <span className="font-semibold">{p.label} · £{p.priceGbp}</span>
              <span className="block text-sm text-slate-600">{p.detail}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <input name="name" placeholder="Your name" className={input} autoComplete="name" defaultValue={user?.name ?? ""} />
      <input name="email" type="email" placeholder="Email" className={input} autoComplete="email" defaultValue={user?.email ?? ""} />
      <input name="country" placeholder="Country you live in" className={input} autoComplete="country-name" defaultValue={user?.country ?? ""} />
      <Status state={state} />
      <Submit pending={pending}>{paymentsOn ? "Continue to payment" : "Request verification report"}</Submit>
      <p className="text-xs text-slate-500">
        {paymentsOn
          ? "Secure card payment by Stripe in pounds; cards in any currency work. If we can't check this property, we refund you in full."
          : "We'll email you a secure payment link."}{" "}
        Reports state exactly which checks were done.
      </p>
    </form>
  );
}

function ScamForm({ propertyId }: { propertyId: string }) {
  const [state, onSubmit, pending] = useFormSubmit(reportScam);
  if (state?.ok) return <Status state={state} />;
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <input type="hidden" name="propertyId" value={propertyId} />
      <textarea name="reason" rows={3} placeholder="What looks wrong? e.g. asked for a deposit before viewing, same plot listed elsewhere" className={input} />
      <input name="contact" placeholder="Your email or phone (optional)" className={input} />
      <Status state={state} />
      <Submit pending={pending}>Report listing</Submit>
    </form>
  );
}

const TABS = [
  { id: "message", label: "Message" },
  { id: "video", label: "Video viewing" },
  { id: "verify", label: "Verify" },
  { id: "report", label: "Report" },
] as const;

export function PropertyForms({
  propertyId,
  paymentsOn = false,
  startTab = "message",
}: {
  propertyId: string;
  paymentsOn?: boolean;
  startTab?: (typeof TABS)[number]["id"];
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>(startTab);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div role="tablist" className="mb-4 grid grid-cols-4 gap-1 rounded-lg bg-slate-100 p-1 text-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-2 py-1.5 font-medium ${tab === t.id ? "bg-white shadow" : "text-slate-600"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "message" && <EnquiryForm propertyId={propertyId} kind="MESSAGE" />}
      {tab === "video" && <EnquiryForm propertyId={propertyId} kind="VIDEO_VIEWING" />}
      {tab === "verify" && <VerificationForm propertyId={propertyId} paymentsOn={paymentsOn} />}
      {tab === "report" && <ScamForm propertyId={propertyId} />}
    </div>
  );
}
