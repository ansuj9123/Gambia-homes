import type { Prisma } from "@prisma/client";
import { CURRENCY_CODES, type Currency } from "./constants";
import { convertToGmd } from "./format";
import { bounds, insideArea, parseArea } from "./geo";

export type SearchParams = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
const num = (v: string | undefined) => {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

export function parseSearch(sp: SearchParams) {
  const cur = one(sp.cur) as Currency | undefined;
  return {
    q: one(sp.q),
    purpose: one(sp.purpose),
    type: one(sp.type),
    region: one(sp.region),
    area: one(sp.area),
    cur: cur && CURRENCY_CODES.includes(cur) ? cur : ("GBP" as Currency),
    min: num(one(sp.min)),
    max: num(one(sp.max)),
    beds: num(one(sp.beds)),
    minPlot: num(one(sp.minPlot)),
    trust: num(one(sp.trust)),
    sort: one(sp.sort) ?? "featured",
    view: one(sp.view) === "map" ? "map" : "list",
    polygon: parseArea(one(sp.poly)), // drawn search area, ?poly=lat,lng;lat,lng;...
  };
}

export type ParsedSearch = ReturnType<typeof parseSearch>;

export function buildWhere(s: ParsedSearch): Prisma.PropertyWhereInput {
  const where: Prisma.PropertyWhereInput = { status: "LIVE" };
  if (s.purpose) where.purpose = s.purpose;
  if (s.type) where.type = s.type;
  if (s.region) where.region = s.region;
  if (s.area) where.area = s.area;
  if (s.beds) where.bedrooms = { gte: s.beds };
  if (s.minPlot) where.plotSqm = { gte: s.minPlot };
  if (s.trust) where.trustLevel = { gte: s.trust };
  if (s.min !== undefined || s.max !== undefined) {
    where.priceGmd = {
      ...(s.min !== undefined ? { gte: convertToGmd(s.min, s.cur) } : {}),
      ...(s.max !== undefined ? { lte: convertToGmd(s.max, s.cur) } : {}),
    };
  }
  if (s.polygon) {
    // Rough box first (database), exact polygon check afterwards (filterByArea).
    const b = bounds(s.polygon);
    where.lat = { gte: b.minLat, lte: b.maxLat };
    where.lng = { gte: b.minLng, lte: b.maxLng };
  }
  if (s.q) {
    where.OR = [{ title: { contains: s.q } }, { area: { contains: s.q } }, { description: { contains: s.q } }];
  }
  return where;
}

export function buildOrder(sort: string): Prisma.PropertyOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ priceGmd: "asc" }];
    case "price_desc":
      return [{ priceGmd: "desc" }];
    case "newest":
      return [{ createdAt: "desc" }];
    case "trust":
      return [{ trustLevel: "desc" }, { createdAt: "desc" }];
    default:
      return [{ featured: "desc" }, { trustLevel: "desc" }, { createdAt: "desc" }];
  }
}

/** Keeps only listings inside the drawn area (if any). */
export function filterByArea<T extends { lat: number; lng: number }>(rows: T[], s: ParsedSearch) {
  return s.polygon ? rows.filter((r) => insideArea([r.lat, r.lng], s.polygon!)) : rows;
}
