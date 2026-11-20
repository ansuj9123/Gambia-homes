"use client";

import { useCallback, useRef, useState } from "react";
import { PhotoPicker } from "./PhotoManager";
import { useFormSubmit } from "./useFormSubmit";
import { createListing } from "@/app/actions";
import { REGIONS, TENURES, TYPES } from "@/lib/constants";

const input = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";
const label = "mb-1 block text-sm font-medium text-slate-700";

export type ListerDefaults = { contactName?: string; agency?: string; phone?: string; email?: string };

export function ListingForm({ defaults = {} }: { defaults?: ListerDefaults }) {
  const photos = useRef<File[]>([]);
  const setPhotos = useCallback((files: File[]) => {
    photos.current = files;
  }, []);
  const [state, onSubmit, pending] = useFormSubmit(createListing, (fd) => {
    photos.current.forEach((f) => fd.append("photos", f));
  });
  const [purpose, setPurpose] = useState("SALE");
  const [type, setType] = useState("LAND");
  const [coords, setCoords] = useState<{ lat: string; lng: string }>({ lat: "", lng: "" });
  const [geoMsg, setGeoMsg] = useState("");

  const useLocation = () => {
    if (!navigator.geolocation) return setGeoMsg("Location isn't available on this device.");
    setGeoMsg("Getting location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) });
        setGeoMsg("Location added. Only do this while standing on the property.");
      },
      () => setGeoMsg("Couldn't get your location. We'll use the area centre and confirm on our site visit."),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  if (state?.ok) {
    return <p role="status" className="rounded-xl bg-emerald-50 p-6 text-emerald-900">{state.message}</p>;
  }

  const isLand = type === "LAND";

  return (
    <form onSubmit={onSubmit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6">
      <fieldset className="space-y-4">
        <legend className="mb-2 text-lg font-semibold">The property</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="purpose">For</label>
            <select id="purpose" name="purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} className={input}>
              <option value="SALE">Sale</option>
              <option value="RENT">Rent</option>
            </select>
          </div>
          <div>
            <label className={label} htmlFor="type">Type</label>
            <select id="type" name="type" value={type} onChange={(e) => setType(e.target.value)} className={input}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={label} htmlFor="title">Title</label>
          <input id="title" name="title" placeholder="e.g. Fenced 500 sqm plot near Brikama highway" className={input} />
        </div>
        <div>
          <label className={label} htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={5} placeholder="Road access, water, electricity, nearby landmarks, condition, what papers you have…" className={input} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="area">Area</label>
            <select id="area" name="area" defaultValue="" className={input}>
              <option value="" disabled>Choose an area</option>
              {Object.entries(REGIONS).map(([region, areas]) => (
                <optgroup key={region} label={region}>
                  {areas.map((a) => <option key={a} value={a}>{a}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="priceGmd">Price in dalasi (GMD)</label>
            <div className="flex gap-2">
              <input id="priceGmd" name="priceGmd" type="number" min={1} className={input} />
              {purpose === "RENT" && (
                <select name="rentPeriod" defaultValue="MONTH" className="rounded-md border border-slate-300 px-2 text-sm" aria-label="Rent period">
                  <option value="MONTH">/ month</option>
                  <option value="NIGHT">/ night</option>
                </select>
              )}
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          {!isLand && (
            <>
              <div>
                <label className={label} htmlFor="bedrooms">Bedrooms</label>
                <input id="bedrooms" name="bedrooms" type="number" min={0} className={input} />
              </div>
              <div>
                <label className={label} htmlFor="bathrooms">Bathrooms</label>
                <input id="bathrooms" name="bathrooms" type="number" min={0} className={input} />
              </div>
            </>
          )}
          <div>
            <label className={label} htmlFor="plotSqm">{isLand ? "Plot size (sqm)" : "Size (sqm)"}</label>
            <input id="plotSqm" name="plotSqm" type="number" min={0} className={input} />
          </div>
          {purpose === "SALE" && (
            <div>
              <label className={label} htmlFor="tenure">Tenure</label>
              <select id="tenure" name="tenure" defaultValue="UNKNOWN" className={input}>
                {TENURES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <input type="hidden" name="lat" value={coords.lat} />
          <input type="hidden" name="lng" value={coords.lng} />
          <button type="button" onClick={useLocation} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium">
            Use my current location
          </button>
          <span className="ml-3 text-sm text-slate-600">{geoMsg || "Optional. Tap this while standing on the property."}</span>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-lg font-semibold">Photos</legend>
        <PhotoPicker onChange={setPhotos} />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-lg font-semibold">Your details</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="contactName">Your name</label>
            <input id="contactName" name="contactName" defaultValue={defaults.contactName} className={input} autoComplete="name" />
          </div>
          <div>
            <label className={label} htmlFor="agency">Agency or company (if any)</label>
            <input id="agency" name="agency" defaultValue={defaults.agency} className={input} autoComplete="organization" />
          </div>
          <div>
            <label className={label} htmlFor="phone">WhatsApp number</label>
            <input id="phone" name="phone" defaultValue={defaults.phone} placeholder="+220 700 0000" className={input} autoComplete="tel" />
          </div>
          <div>
            <label className={label} htmlFor="email">Email (optional)</label>
            <input id="email" name="email" defaultValue={defaults.email} type="email" className={input} autoComplete="email" />
          </div>
        </div>
      </fieldset>

      {state && !state.ok && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>}

      <button disabled={pending} className="w-full rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
        {pending ? (photos.current.length ? "Uploading photos…" : "Submitting…") : "Submit for review"}
      </button>
      <p className="text-xs text-slate-500">
        Listings go live after review. We may ask for your ID and property papers to show a higher trust level to buyers.
      </p>
    </form>
  );
}
