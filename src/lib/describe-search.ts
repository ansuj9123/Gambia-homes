import { CURRENCIES, TRUST_LEVELS, TYPES, labelFor, type Currency } from "./constants";
import type { ParsedSearch } from "./search";

export function describeSearch(s: ParsedSearch) {
  return [
    s.type ? labelFor(TYPES, s.type) : "Property",
    s.purpose ? (s.purpose === "RENT" ? "to rent" : "for sale") : "",
    s.area ? `in ${s.area}` : s.region ? `in ${s.region}` : "in The Gambia",
  ]
    .filter(Boolean)
    .join(" ");
}

export function describeFilters(s: ParsedSearch) {
  const sym = CURRENCIES[s.cur as Currency].symbol;
  const parts: string[] = [];
  if (s.min !== undefined && s.max !== undefined) parts.push(`${sym}${s.min.toLocaleString("en-GB")}–${sym}${s.max.toLocaleString("en-GB")}`);
  else if (s.max !== undefined) parts.push(`up to ${sym}${s.max.toLocaleString("en-GB")}`);
  else if (s.min !== undefined) parts.push(`from ${sym}${s.min.toLocaleString("en-GB")}`);
  if (s.beds) parts.push(`${s.beds}+ beds`);
  if (s.minPlot) parts.push(`${s.minPlot}+ sqm`);
  if (s.trust) parts.push(`${TRUST_LEVELS[s.trust]?.label ?? ""} or better`);
  if (s.q) parts.push(`"${s.q}"`);
  return parts.join(" · ");
}
