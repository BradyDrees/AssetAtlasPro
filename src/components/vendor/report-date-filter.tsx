"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

interface DateRange { start: string; end: string }
interface Props { value: DateRange; onChange: (range: DateRange) => void }

type Preset = "week" | "month" | "quarter" | "year" | "custom";

function getRange(preset: Preset): DateRange {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDay();
  const fmt = (dt: Date) => dt.toISOString().slice(0, 10);
  const today = fmt(now);
  if (preset === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - d);
    return { start: fmt(start), end: today };
  }
  if (preset === "month") return { start: fmt(new Date(y, m, 1)), end: today };
  if (preset === "quarter") {
    const qm = m - (m % 3);
    return { start: fmt(new Date(y, qm, 1)), end: today };
  }
  return { start: fmt(new Date(y, 0, 1)), end: today };
}

export default function ReportDateFilter({ value, onChange }: Props) {
  const t = useTranslations("vendor.reports");
  const [active, setActive] = useState<Preset>("month");

  const presets: { key: Preset; label: string }[] = [
    { key: "week", label: t("dateFilter.thisWeek") },
    { key: "month", label: t("dateFilter.thisMonth") },
    { key: "quarter", label: t("dateFilter.thisQuarter") },
    { key: "year", label: t("dateFilter.thisYear") },
    { key: "custom", label: t("dateFilter.custom") },
  ];

  function pick(p: Preset) {
    setActive(p);
    if (p !== "custom") onChange(getRange(p));
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        {presets.map((p) => (
          <button
            key={p.key}
            onClick={() => pick(p.key)}
            className={
              "px-3 py-1.5 rounded-full text-sm font-medium transition-colors " +
              (active === p.key
                ? "bg-brand-600 text-white"
                : "bg-surface-secondary text-content-secondary hover:bg-surface-tertiary")
            }
          >
            {p.label}
          </button>
        ))}
      </div>
      {active === "custom" && (
        <div className="flex gap-3 items-center">
          <label className="text-sm text-content-secondary">{t("dateFilter.from")}</label>
          <input
            type="date"
            value={value.start}
            onChange={(e) => onChange({ ...value, start: e.target.value })}
            className="rounded-lg border border-edge-primary bg-surface-primary px-2 py-1 text-sm text-content-primary"
          />
          <label className="text-sm text-content-secondary">{t("dateFilter.to")}</label>
          <input
            type="date"
            value={value.end}
            onChange={(e) => onChange({ ...value, end: e.target.value })}
            className="rounded-lg border border-edge-primary bg-surface-primary px-2 py-1 text-sm text-content-primary"
          />
        </div>
      )}
    </div>
  );
}