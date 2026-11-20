"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { CURRENCY_CODES, type Currency } from "@/lib/constants";
import { formatMoney, rentSuffix } from "@/lib/format";

const STORAGE_KEY = "gh.currency";

const CurrencyContext = createContext<{ currency: Currency; setCurrency: (c: Currency) => void }>({
  currency: "GBP",
  setCurrency: () => {},
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  // Diaspora-first default; people in The Gambia switch to dalasi once and it is remembered.
  const [currency, setCurrencyState] = useState<Currency>("GBP");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Currency | null;
      if (saved && CURRENCY_CODES.includes(saved)) setCurrencyState(saved);
    } catch {}
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    try {
      localStorage.setItem(STORAGE_KEY, c);
    } catch {}
  };

  return <CurrencyContext.Provider value={{ currency, setCurrency }}>{children}</CurrencyContext.Provider>;
}

export const useCurrency = () => useContext(CurrencyContext);

export function CurrencySelect() {
  const { currency, setCurrency } = useCurrency();
  return (
    <label className="flex items-center gap-1 text-sm">
      <span className="sr-only">Currency</span>
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value as Currency)}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
      >
        {CURRENCY_CODES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Price({
  gmd,
  rentPeriod,
  showDalasi = false,
  className,
}: {
  gmd: number;
  rentPeriod?: string | null;
  showDalasi?: boolean;
  className?: string;
}) {
  const { currency } = useCurrency();
  return (
    <span className={className}>
      {formatMoney(gmd, currency)}
      {rentSuffix(rentPeriod)}
      {showDalasi && currency !== "GMD" && (
        <span className="ml-2 text-sm font-normal text-slate-500">
          ({formatMoney(gmd, "GMD")}
          {rentSuffix(rentPeriod)})
        </span>
      )}
    </span>
  );
}
