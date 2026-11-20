"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import { useCurrency } from "./CurrencyProvider";
import { formatMoney, rentSuffix } from "@/lib/format";

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

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) map.setView([points[0].lat, points[0].lng], 14);
    else if (points.length > 1) {
      const bounds: LatLngBoundsExpression = points.map((p) => [p.lat, p.lng] as [number, number]);
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [map, points]);
  return null;
}

export default function MapView({ points, height = 520 }: { points: MapPoint[]; height?: number }) {
  const { currency } = useCurrency();
  return (
    <div style={{ height }} className="overflow-hidden rounded-xl border border-slate-200">
      <MapContainer center={[13.4, -16.4]} zoom={9} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        {points.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={9}
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
    </div>
  );
}
