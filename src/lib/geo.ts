// Drawn search areas: a polygon of [lat, lng] points, kept in the URL as
// "lat,lng;lat,lng;..." so a drawn search can be bookmarked, shared and saved.

export type LatLng = [number, number];

export const MAX_AREA_POINTS = 30;

// Generous box around The Gambia (and the Senegal border) to reject junk.
const inRegion = ([lat, lng]: LatLng) => lat > 12.5 && lat < 14.2 && lng > -17.3 && lng < -13.0;

export function encodeArea(points: LatLng[]) {
  return points.map(([lat, lng]) => `${lat.toFixed(5)},${lng.toFixed(5)}`).join(";");
}

/** Returns a valid polygon (3–30 points inside the region) or null. */
export function parseArea(value: string | null | undefined): LatLng[] | null {
  if (!value) return null;
  const points = value
    .split(";")
    .slice(0, MAX_AREA_POINTS)
    .map((pair) => pair.split(",").map(Number) as LatLng)
    .filter((p) => p.length === 2 && p.every(Number.isFinite) && inRegion(p));
  return points.length >= 3 ? points : null;
}

export function bounds(points: LatLng[]) {
  const lats = points.map((p) => p[0]);
  const lngs = points.map((p) => p[1]);
  return { minLat: Math.min(...lats), maxLat: Math.max(...lats), minLng: Math.min(...lngs), maxLng: Math.max(...lngs) };
}

/** Ray-casting point-in-polygon test (fine at neighbourhood scale). */
export function insideArea([lat, lng]: LatLng, polygon: LatLng[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Approximate area in square kilometres, for showing the size of a drawn area. */
export function areaKm2(polygon: LatLng[]) {
  const R = 6371;
  const lat0 = (polygon.reduce((s, p) => s + p[0], 0) / polygon.length) * (Math.PI / 180);
  const xy = polygon.map(([lat, lng]) => [R * lng * (Math.PI / 180) * Math.cos(lat0), R * lat * (Math.PI / 180)]);
  let sum = 0;
  for (let i = 0; i < xy.length; i++) {
    const [x1, y1] = xy[i];
    const [x2, y2] = xy[(i + 1) % xy.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}
