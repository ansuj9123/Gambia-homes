"use client";

import { useRouter } from "next/navigation";
import { encodeArea, type LatLng } from "@/lib/geo";
import { Map } from "./MapLoader";
import type { MapPoint } from "./MapView";

/** The search results map with the "Draw an area" tool; drawing updates the URL (?poly=...). */
export function SearchMap({
  points,
  polygon,
  query,
  startDrawing,
}: {
  points: MapPoint[];
  polygon: LatLng[] | null;
  query: string; // current search params, without poly/draw
  startDrawing?: boolean;
}) {
  const router = useRouter();
  const go = (poly: LatLng[] | null) => {
    const params = new URLSearchParams(query);
    params.set("view", "map");
    if (poly) params.set("poly", encodeArea(poly));
    router.push(`/search?${params.toString()}`, { scroll: false });
  };
  return <Map height={640} points={points} polygon={polygon} drawable startDrawing={startDrawing} onDrawn={(p) => go(p)} onClear={() => go(null)} />;
}
