"use client";

import { useEffect, useRef, useState } from "react";
import { shrinkImage } from "@/lib/client-image";

export type PhotoItem = { id: string; src: string; thumb: string; w?: number; h?: number };

const MAX = 20;

function Thumb({
  src,
  index,
  count,
  onMove,
  onRemove,
  disabled,
}: {
  src: string;
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const btn = "rounded bg-white/90 px-1.5 text-xs font-semibold shadow disabled:opacity-40";
  return (
    <li className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={`Photo ${index + 1}`} className="aspect-[4/3] w-full object-cover" />
      {index === 0 && <span className="absolute left-1.5 top-1.5 rounded bg-brand-600 px-1.5 text-xs font-semibold text-white">Cover</span>}
      <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between gap-1">
        <span className="flex gap-1">
          <button type="button" className={btn} disabled={disabled || index === 0} onClick={() => onMove(index, index - 1)} aria-label="Move earlier">←</button>
          <button type="button" className={btn} disabled={disabled || index === count - 1} onClick={() => onMove(index, index + 1)} aria-label="Move later">→</button>
          {index !== 0 && (
            <button type="button" className={btn} disabled={disabled} onClick={() => onMove(index, 0)}>Make cover</button>
          )}
        </span>
        <button type="button" className={`${btn} text-red-700`} disabled={disabled} onClick={onRemove} aria-label="Remove photo">✕</button>
      </div>
    </li>
  );
}

const move = <T,>(list: T[], from: number, to: number) => {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

/** Photos chosen for a new listing; files are sent with the listing form. */
export function PhotoPicker({ onChange }: { onChange: (files: File[]) => void }) {
  const [items, setItems] = useState<{ id: string; file: File; url: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => onChange(items.map((i) => i.file)), [items, onChange]);
  useEffect(() => () => items.forEach((i) => URL.revokeObjectURL(i.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const room = MAX - items.length;
    const shrunk = await Promise.all([...files].slice(0, room).map((f) => shrinkImage(f)));
    setItems((prev) => [...prev, ...shrunk.map((file) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) }))]);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      {items.length > 0 && (
        <ul className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {items.map((it, i) => (
            <Thumb
              key={it.id}
              src={it.url}
              index={i}
              count={items.length}
              onMove={(from, to) => setItems((prev) => move(prev, from, to))}
              onRemove={() => {
                URL.revokeObjectURL(it.url);
                setItems((prev) => prev.filter((x) => x.id !== it.id));
              }}
            />
          ))}
        </ul>
      )}
      <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-400 bg-white px-4 py-3 text-sm font-medium hover:bg-slate-50 ${items.length >= MAX ? "pointer-events-none opacity-50" : ""}`}>
        <input ref={inputRef} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => add(e.target.files)} />
        {busy ? "Preparing photos…" : items.length ? "Add more photos" : "Add photos"}
      </label>
      <p className="mt-1 text-xs text-slate-500">
        Up to {MAX} photos. The first is the cover. Clear, daylight photos of the plot or rooms get the most enquiries.
      </p>
    </div>
  );
}

/** Photos of an existing listing, saved immediately (admin and agent portal). */
export function PhotoManager({ listingId, initial }: { listingId: string; initial: PhotoItem[] }) {
  const [photos, setPhotos] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const url = `/api/listings/${listingId}/photos`;

  const call = async (label: string, init: RequestInit, target = url) => {
    setBusy(label);
    setError(null);
    try {
      const res = await fetch(target, init);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setPhotos(data.photos);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const fd = new FormData();
    setBusy("Preparing photos…");
    for (const f of await Promise.all([...files].map((f) => shrinkImage(f)))) fd.append("photos", f);
    await call("Uploading…", { method: "POST", body: fd });
    if (inputRef.current) inputRef.current.value = "";
  };

  const reorder = (from: number, to: number) => {
    const next = move(photos, from, to);
    setPhotos(next);
    call("Saving order…", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ order: next.map((p) => p.id) }) });
  };

  const remove = (id: string) => {
    if (!window.confirm("Delete this photo? This can't be undone.")) return;
    call("Deleting…", { method: "DELETE" }, `${url}?photoId=${encodeURIComponent(id)}`);
  };

  return (
    <div>
      {photos.length > 0 ? (
        <ul className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {photos.map((p, i) => (
            <Thumb key={p.id} src={p.thumb} index={i} count={photos.length} disabled={Boolean(busy)} onMove={reorder} onRemove={() => remove(p.id)} />
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-sm text-slate-500">No photos yet. Listings with photos get far more enquiries.</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <label className={`inline-flex cursor-pointer items-center rounded-lg border border-dashed border-slate-400 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 ${busy || photos.length >= MAX ? "pointer-events-none opacity-50" : ""}`}>
          <input ref={inputRef} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => upload(e.target.files)} />
          Upload photos
        </label>
        <span className="text-sm text-slate-500" role="status">{busy ?? `${photos.length} of ${MAX}`}</span>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
