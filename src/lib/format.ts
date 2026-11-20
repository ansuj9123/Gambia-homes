import { CURRENCIES, type Currency } from "./constants";

export function convertFromGmd(gmd: number, currency: Currency) {
  return gmd / CURRENCIES[currency].perUnitGmd;
}

export function convertToGmd(amount: number, currency: Currency) {
  return Math.round(amount * CURRENCIES[currency].perUnitGmd);
}

export function formatMoney(gmd: number, currency: Currency) {
  const value = convertFromGmd(gmd, currency);
  const rounded = value >= 10000 ? Math.round(value / 100) * 100 : Math.round(value);
  return `${CURRENCIES[currency].symbol}${rounded.toLocaleString("en-GB")}`;
}

export function rentSuffix(rentPeriod?: string | null) {
  if (rentPeriod === "MONTH") return " / month";
  if (rentPeriod === "NIGHT") return " / night";
  return "";
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export function whatsappLink(phone: string, message: string) {
  return `https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`;
}
