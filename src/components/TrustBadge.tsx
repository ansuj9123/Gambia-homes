import { TRUST_LEVELS } from "@/lib/constants";

const STYLES = [
  "bg-slate-100 text-slate-700 ring-slate-300",
  "bg-sky-50 text-sky-800 ring-sky-200",
  "bg-indigo-50 text-indigo-800 ring-indigo-200",
  "bg-emerald-50 text-emerald-800 ring-emerald-200",
  "bg-emerald-600 text-white ring-emerald-700",
];

export function TrustBadge({ level, size = "sm" }: { level: number; size?: "sm" | "md" }) {
  const t = TRUST_LEVELS[level] ?? TRUST_LEVELS[0];
  return (
    <span
      title={t.detail}
      className={`inline-flex items-center gap-1 rounded-full font-medium ring-1 ${STYLES[t.level]} ${
        size === "md" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"
      }`}
    >
      {t.level >= 3 ? "✓" : t.level === 0 ? "!" : "•"} {size === "md" ? t.label : t.short}
    </span>
  );
}
