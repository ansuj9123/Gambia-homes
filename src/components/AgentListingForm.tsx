"use client";

import { updateAgentListing } from "@/app/agent-actions";
import { useFormSubmit } from "./useFormSubmit";

const input = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";
const label = "mb-1 block text-sm font-medium text-slate-700";

export type EditableListing = {
  id: string;
  title: string;
  description: string;
  purpose: string;
  type: string;
  priceGmd: number;
  rentPeriod: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  plotSqm: number | null;
};

export function AgentListingForm({ listing, disabled }: { listing: EditableListing; disabled?: boolean }) {
  const [state, onSubmit, pending] = useFormSubmit(updateAgentListing);
  const isLand = listing.type === "LAND";
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="id" value={listing.id} />
      <fieldset disabled={disabled || pending} className="space-y-4">
        <div>
          <label className={label} htmlFor="title">Title</label>
          <input id="title" name="title" defaultValue={listing.title} className={input} />
        </div>
        <div>
          <label className={label} htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={6} defaultValue={listing.description} className={input} />
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className={label} htmlFor="priceGmd">Price in dalasi (GMD)</label>
            <div className="flex gap-2">
              <input id="priceGmd" name="priceGmd" type="number" min={1} defaultValue={listing.priceGmd} className={input} />
              {listing.purpose === "RENT" && (
                <select name="rentPeriod" defaultValue={listing.rentPeriod ?? "MONTH"} className="rounded-md border border-slate-300 px-2 text-sm" aria-label="Rent period">
                  <option value="MONTH">/ month</option>
                  <option value="NIGHT">/ night</option>
                </select>
              )}
            </div>
          </div>
          {!isLand && (
            <>
              <div>
                <label className={label} htmlFor="bedrooms">Bedrooms</label>
                <input id="bedrooms" name="bedrooms" type="number" min={0} defaultValue={listing.bedrooms ?? ""} className={input} />
              </div>
              <div>
                <label className={label} htmlFor="bathrooms">Bathrooms</label>
                <input id="bathrooms" name="bathrooms" type="number" min={0} defaultValue={listing.bathrooms ?? ""} className={input} />
              </div>
            </>
          )}
          <div>
            <label className={label} htmlFor="plotSqm">{isLand ? "Plot size (sqm)" : "Size (sqm)"}</label>
            <input id="plotSqm" name="plotSqm" type="number" min={0} defaultValue={listing.plotSqm ?? ""} className={input} />
          </div>
        </div>
      </fieldset>
      {state && (
        <p role={state.ok ? "status" : "alert"} className={`rounded-md px-3 py-2 text-sm ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{state.message}</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={disabled || pending} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
          {pending ? "Saving…" : "Save changes"}
        </button>
        <span className="text-xs text-slate-500">Price changes go live at once. Other changes to a live listing are reviewed first.</span>
      </div>
    </form>
  );
}
