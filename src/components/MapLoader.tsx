"use client";

import dynamic from "next/dynamic";
import type { MapViewProps } from "./MapView";

// Leaflet needs the browser window, so the map renders on the client only.
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="h-[520px] animate-pulse rounded-xl bg-slate-200" />,
});

export function Map(props: MapViewProps) {
  return <MapView {...props} />;
}
