"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CircleMarker, MapContainer, Polygon, Polyline, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import { useCurrency } from "./CurrencyProvider";
import { formatMoney, rentSuffix } from "@/lib/format";
import { MAX_AREA_POINTS, areaKm2, type LatLng } from "@/lib/geo";

export type MapPoint = {
  id: string;
  slug: string;
  title: string;
  lat: number;
  lng: number;
  priceGmd: number;
  rentPeriod: string | null;
  trustLevel: number;
};

export type MapViewProps = {
  points: MapPoint[];
  height?: number;
  /** A drawn search area to show. */
  polygon?: LatLng[] | null;
  /** Show the "Draw area" tool. */
  drawable?: boolean;
  /** Start in drawing mode (e.g. after "Draw an area" in the filters). */
  startDrawing?: boolean;
  onDrawn?: (polygon: LatLng[]) => void;
  onClear?: () => void;
};

function FitBounds({ points, polygon }: { points: MapPoint[]; polygon?: LatLng[] | null }) {
  const map = useMap();
  const key = JSON.stringify([polygon, points.map((p) => [p.lat, p.lng])]);
  useEffect(() => {
    const target: [number, number][] = polygon?.length ? polygon : points.map((p) => [p.lat, p.lng]);
    if (target.length === 1) map.setView(target[0], 14);
    else if (target.length > 1) map.fitBounds(target as LatLngBoundsExpression, { padding: [30, 30] });
  }, [map, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function DrawEvents({ active, onAdd }: { active: boolean; onAdd: (p: LatLng) => void }) {
  const map = useMapEvents({
    click(e) {
      if (active) onAdd([e.latlng.lat, e.latlng.lng]);
    },
  });
  useEffect(() => {
    const el = map.getContainer();
    if (active) {
      map.doubleClickZoom.disable();
      el.style.cursor = "crosshair";
    } else {
      map.doubleClickZoom.enable();
      el.style.cursor = "";
    }
  }, [active, map]);
  return null;
}

const btn = "rounded-lg px-3 py-1.5 text-sm font-semibold shadow";

export default function MapView({ points, height = 520, polygon, drawable = false, startDrawing = false, onDrawn, onClear }: MapViewProps) {
  const { currency } = useCurrency();
  const [drawing, setDrawing] = useState(startDrawing);
  const [draft, setDraft] = useState<LatLng[]>([]);

  const finish = (pts = draft) => {
    if (pts.length < 3) return;
    setDrawing(false);
    setDraft([]);
    onDrawn?.(pts);
  };
  const add = (p: LatLng) => setDraft((d) => (d.length >= MAX_AREA_POINTS ? d : [...d, p]));

  return (
    <div style={{ height }} className="relative overflow-hidden rounded-xl border border-slate-200">
      <MapContainer center={[13.4, -16.4]} zoom={9} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} polygon={polygon} />
        <DrawEvents active={drawing} onAdd={add} />

        {polygon && !drawing && (
          <Polygon positions={polygon} pathOptions={{ color: "#1b3a8a", weight: 2, dashArray: "6 4", fillColor: "#1b3a8a", fillOpacity: 0.06 }} />
        )}

        {drawing && draft.length > 0 && (
          <>
            <Polyline positions={draft.length >= 3 ? [...draft, draft[0]] : draft} pathOptions={{ color: "#1f7a3a", weight: 2, dashArray: "4 4" }} />
            {draft.map((p, i) => (
              <CircleMarker
                key={i}
                center={p}
                radius={i === 0 ? 8 : 5}
                bubblingMouseEvents={false}
                pathOptions={{ color: "#1f7a3a", weight: 2, fillColor: i === 0 ? "#1f7a3a" : "#ffffff", fillOpacity: 1 }}
                eventHandlers={{ click: () => (i === 0 ? finish() : undefined) }}
              />
            ))}
          </>
        )}

        {points.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={9}
            interactive={!drawing}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: p.trustLevel >= 3 ? "#1f7a3a" : p.trustLevel >= 1 ? "#1b3a8a" : "#64748b",
              fillOpacity: 0.95,
            }}
          >
            <Popup>
              <div className="space-y-1">
                <p className="font-semibold">
                  {formatMoney(p.priceGmd, currency)}
                  {rentSuffix(p.rentPeriod)}
                </p>
                <p>{p.title}</p>
                <Link href={`/property/${p.slug}`} className="text-blue-700 underline">
                  View property
                </Link>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {drawable && (
        <div className="absolute right-3 top-3 z-[1000] flex max-w-[calc(100%-4.5rem)] flex-col items-end gap-2">
          {!drawing ? (
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => { setDraft([]); setDrawing(true); }} className={`${btn} bg-white text-slate-900 hover:bg-slate-50`}>
                ✏️ {polygon ? "Redraw area" : "Draw an area"}
              </button>
              {polygon && (
                <button type="button" onClick={onClear} className={`${btn} bg-white text-red-700 hover:bg-slate-50`}>
                  ✕ Clear area
                </button>
              )}
            </div>
          ) : (
            <>
              <p role="status" className="rounded-lg bg-slate-900/85 px-3 py-2 text-right text-sm text-white shadow">
                {draft.length < 3
                  ? `Tap the map to mark the corners of your area (${draft.length} so far, at least 3).`
                  : `${draft.length} corners · about ${areaKm2(draft).toFixed(areaKm2(draft) < 1 ? 2 : 1)} km². Tap the first corner or Finish.`}
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" disabled={draft.length === 0} onClick={() => setDraft((d) => d.slice(0, -1))} className={`${btn} bg-white text-slate-900 disabled:opacity-50`}>
                  Undo
                </button>
                <button type="button" onClick={() => { setDrawing(false); setDraft([]); }} className={`${btn} bg-white text-slate-900`}>
                  Cancel
                </button>
                <button type="button" disabled={draft.length < 3} onClick={() => finish()} className={`${btn} bg-brand-600 text-white disabled:opacity-50`}>
                  Finish
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
