"use client";

import { useState } from "react";
import { PlaceholderArt } from "./PropertyImage";

type Photo = { id: string; src: string; thumb: string };

export function Gallery({ photos, type, area, title }: { photos: Photo[]; type: string; area: string; title: string }) {
  const [index, setIndex] = useState(0);

  if (photos.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl">
        <PlaceholderArt type={type} area={area} className="aspect-[16/9] w-full" />
      </div>
    );
  }

  const go = (i: number) => setIndex((i + photos.length) % photos.length);
  const current = photos[index] ?? photos[0];

  return (
    <div
      className="space-y-2"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
    >
      <div className="relative overflow-hidden rounded-xl bg-slate-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.src} alt={`${title}, photo ${index + 1} of ${photos.length}`} className="aspect-[16/9] w-full object-contain" />
        {photos.length > 1 && (
          <>
            <button type="button" onClick={() => go(index - 1)} aria-label="Previous photo" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-lg shadow">‹</button>
            <button type="button" onClick={() => go(index + 1)} aria-label="Next photo" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-lg shadow">›</button>
            <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">{index + 1} / {photos.length}</span>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((p, i) => (
            <li key={p.id} className="shrink-0">
              <button type="button" onClick={() => setIndex(i)} aria-label={`Show photo ${i + 1}`} aria-current={i === index} className={`block overflow-hidden rounded-md ring-2 ${i === index ? "ring-brand-600" : "ring-transparent"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumb} alt="" loading="lazy" className="h-16 w-24 object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
