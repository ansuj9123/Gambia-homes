"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { assignCase, publishReport, saveStage, setStaffRole } from "@/app/verification-actions";
import type { FormState } from "@/app/actions";
import { shrinkImage } from "@/lib/client-image";
import { useFormSubmit } from "./useFormSubmit";

const input = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";
const label = "mb-1 block text-sm font-medium text-slate-700";

function Status({ state }: { state: FormState }) {
  if (!state) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={`rounded-md px-3 py-2 text-sm ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
      {state.message}
    </p>
  );
}

function Button({ pending, children, tone = "dark" }: { pending: boolean; children: React.ReactNode; tone?: "dark" | "brand" }) {
  return (
    <button disabled={pending} className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${tone === "brand" ? "bg-brand-600 hover:bg-brand-700" : "bg-slate-900"}`}>
      {pending ? "Saving…" : children}
    </button>
  );
}

// ---------- Evidence ----------

export type EvidenceItem = { id: string; kind: string; fileName: string; caption: string | null; by: string; mine: boolean };

export function EvidencePanel({
  orderId,
  stage,
  items,
  canUpload,
  canDeleteAny,
}: {
  orderId: string;
  stage: string;
  items: EvidenceItem[];
  canUpload: boolean;
  canDeleteAny: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const captionRef = useRef<HTMLInputElement>(null);
  const base = `/api/verifications/${orderId}/evidence`;

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    setBusy("Preparing…");
    const fd = new FormData();
    fd.append("stage", stage);
    fd.append("caption", captionRef.current?.value ?? "");
    // Photos are shrunk to keep uploads fast; the server keeps their GPS/time data.
    for (const f of files) fd.append("files", f.type === "application/pdf" ? f : await shrinkImage(f, 2400, 0.9));
    setBusy("Uploading…");
    const res = await fetch(base, { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setError(data.error ?? "Upload failed.");
    if (fileRef.current) fileRef.current.value = "";
    if (captionRef.current) captionRef.current.value = "";
    router.refresh();
  };

  const remove = async (id: string) => {
    if (!window.confirm("Remove this file?")) return;
    setBusy("Removing…");
    const res = await fetch(`${base}/${id}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "Couldn't remove it.");
    router.refresh();
  };

  return (
    <div className="space-y-3">
      {items.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {items.map((e) => (
            <li key={e.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white text-xs">
              <a href={`${base}/${e.id}`} target="_blank" rel="noopener noreferrer" className="block">
                {e.kind === "PHOTO" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`${base}/${e.id}`} alt={e.caption ?? e.fileName} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                ) : (
                  <span className="flex aspect-[4/3] items-center justify-center bg-slate-100 font-semibold text-slate-600">PDF</span>
                )}
              </a>
              <div className="p-2">
                <p className="truncate font-medium" title={e.fileName}>{e.caption || e.fileName}</p>
                <p className="text-slate-500">by {e.by}</p>
                {canUpload && (canDeleteAny || e.mine) && (
                  <button type="button" onClick={() => remove(e.id)} disabled={Boolean(busy)} className="mt-1 text-red-700 hover:underline">Remove</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">No files yet.</p>
      )}
      {canUpload && (
        <div className="flex flex-wrap items-center gap-2">
          <input ref={captionRef} placeholder="Caption (optional), e.g. North boundary wall" className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <label className={`cursor-pointer rounded-lg border border-dashed border-slate-400 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 ${busy ? "pointer-events-none opacity-50" : ""}`}>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple className="sr-only" onChange={(e) => upload(e.target.files)} />
            {busy ?? "Upload photos or PDFs"}
          </label>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}

// ---------- Stage findings ----------

export type StageValues = {
  siteNotes?: string | null;
  surveyNotes?: string | null;
  gps?: string;
  registryFindings?: string | null;
  registryOutcome?: string | null;
  complete: boolean;
};

export function StageForm({
  orderId,
  stage,
  values,
  registryOutcomes,
  disabled,
}: {
  orderId: string;
  stage: "SITE" | "SURVEY" | "REGISTRY";
  values: StageValues;
  registryOutcomes: readonly { value: string; label: string }[];
  disabled?: boolean;
}) {
  const [state, onSubmit, pending] = useFormSubmit(saveStage);
  const gpsRef = useRef<HTMLTextAreaElement>(null);
  const [geo, setGeo] = useState("");

  const addHere = () => {
    if (!navigator.geolocation) return setGeo("Location isn't available on this device.");
    setGeo("Getting location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const el = gpsRef.current;
        if (!el) return;
        const n = el.value.split("\n").filter((l) => l.trim()).length + 1;
        el.value = `${el.value.trim() ? el.value.trim() + "\n" : ""}${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}, Point ${n}`;
        setGeo(`Added (accuracy about ${Math.round(pos.coords.accuracy)} m). Rename the label if you like.`);
      },
      () => setGeo("Couldn't get your location. Phones only allow this on a secure (https) address."),
      { enableHighAccuracy: true, timeout: 20000 },
    );
  };

  const gpsField = (
    <div>
      <label className={label} htmlFor={`gps-${stage}`}>GPS points (one per line: latitude, longitude, label)</label>
      <textarea ref={gpsRef} id={`gps-${stage}`} name="gps" rows={4} defaultValue={values.gps} placeholder="13.274512, -16.651203, NE corner" className={`${input} font-mono`} />
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <button type="button" onClick={addHere} className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-medium">Add my current location</button>
        <span className="text-xs text-slate-500">{geo || "Stand on each corner and tap the button."}</span>
      </div>
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="id" value={orderId} />
      <input type="hidden" name="stage" value={stage} />
      {/* key: re-create the fields after a save so they show the latest saved values (the status message stays) */}
      <fieldset key={JSON.stringify(values)} disabled={disabled || pending} className="space-y-3">
        {stage === "SITE" && (
          <>
            <div>
              <label className={label} htmlFor="siteNotes">Observations</label>
              <textarea id="siteNotes" name="siteNotes" rows={5} defaultValue={values.siteNotes ?? ""} placeholder="Access road, fencing, structures, occupants, neighbours spoken to, alkalo confirmation, anything that doesn't match the listing…" className={input} />
            </div>
            <p className="text-xs text-slate-500">Boundary GPS points are recorded in the GPS survey stage.</p>
          </>
        )}
        {stage === "SURVEY" && (
          <>
            {gpsField}
            <div>
              <label className={label} htmlFor="surveyNotes">Survey notes</label>
              <textarea id="surveyNotes" name="surveyNotes" rows={3} defaultValue={values.surveyNotes ?? ""} placeholder="Measured dimensions, area, beacons found, differences from the papers…" className={input} />
            </div>
          </>
        )}
        {stage === "REGISTRY" && (
          <>
            <div>
              <label className={label} htmlFor="registryOutcome">Result</label>
              <select id="registryOutcome" name="registryOutcome" defaultValue={values.registryOutcome ?? ""} className={input}>
                <option value="">Choose…</option>
                {registryOutcomes.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="registryFindings">Findings</label>
              <textarea id="registryFindings" name="registryFindings" rows={5} defaultValue={values.registryFindings ?? ""} placeholder="Records searched (Lands and Surveys, area council), registered holder, lease/transfer numbers, encumbrances, disputes…" className={input} />
            </div>
          </>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="complete" defaultChecked={values.complete} /> This stage is complete
        </label>
      </fieldset>
      <Status state={state} />
      {!disabled && <Button pending={pending}>Save</Button>}
    </form>
  );
}

// ---------- Admin: assign, publish, team ----------

type Person = { id: string; name: string };

export function AssignForm({
  orderId,
  current,
  people,
  dueDate,
  disabled,
}: {
  orderId: string;
  current: { fieldAgentId: string | null; lawyerId: string | null; surveyorId: string | null };
  people: { FIELD_AGENT: Person[]; LAWYER: Person[]; SURVEYOR: Person[] };
  dueDate: string;
  disabled?: boolean;
}) {
  const [state, onSubmit, pending] = useFormSubmit(assignCase);
  const select = (name: string, list: Person[], value: string | null, title: string) => (
    <div>
      <label className={label} htmlFor={name}>{title}</label>
      <select id={name} name={name} defaultValue={value ?? ""} className={input}>
        <option value="">Not assigned</option>
        {list.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </div>
  );
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="id" value={orderId} />
      <fieldset disabled={disabled || pending} className="grid gap-3 sm:grid-cols-4">
        {select("lawyerId", people.LAWYER, current.lawyerId, "Partner lawyer")}
        {select("fieldAgentId", people.FIELD_AGENT, current.fieldAgentId, "Field agent")}
        {select("surveyorId", people.SURVEYOR, current.surveyorId, "Surveyor")}
        <div>
          <label className={label} htmlFor="dueDate">Due date</label>
          <input id="dueDate" name="dueDate" type="date" defaultValue={dueDate} className={input} />
        </div>
      </fieldset>
      <Status state={state} />
      {!disabled && <Button pending={pending}>Save assignments</Button>}
    </form>
  );
}

export function PublishForm({
  orderId,
  outcomes,
  defaults,
  trustOptions,
}: {
  orderId: string;
  outcomes: readonly { value: string; label: string }[];
  defaults: { outcome: string; summary: string };
  trustOptions: { level: number; label: string }[];
}) {
  const [state, onSubmit, pending] = useFormSubmit(publishReport);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="id" value={orderId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="outcome">Overall outcome</label>
          <select id="outcome" name="outcome" defaultValue={defaults.outcome} className={input}>
            <option value="">Choose…</option>
            {outcomes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="trustLevel">If verified, raise the listing&apos;s trust level to</label>
          <select id="trustLevel" name="trustLevel" defaultValue="" className={input}>
            <option value="">Leave as it is</option>
            {trustOptions.map((t) => <option key={t.level} value={t.level}>{t.level} · {t.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className={label} htmlFor="summary">Summary for the buyer</label>
        <textarea id="summary" name="summary" rows={4} defaultValue={defaults.summary} placeholder="Plain-language summary: what we checked, what we found, and what the buyer should do next." className={input} />
      </div>
      <Status state={state} />
      {!state?.ok && <Button pending={pending} tone="brand">Generate PDF and send to buyer</Button>}
    </form>
  );
}

export function TeamRoleForm({ roles }: { roles: readonly { value: string; label: string }[] }) {
  const [state, onSubmit, pending] = useFormSubmit(setStaffRole);
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <input name="identifier" placeholder="Their account email or phone" className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <select name="role" defaultValue="FIELD_AGENT" className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          <option value="USER">Remove staff role</option>
        </select>
        <Button pending={pending}>Set role</Button>
      </div>
      <Status state={state} />
    </form>
  );
}
