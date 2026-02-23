"use client";

import { useTranslations } from "next-intl";

interface DashboardDateFilterProps {
  value: string;
  onChange: (v: string) => void;
}

const tabs = [
  { key: "today", label: "dateFilter.today" },
  { key: "week", label: "dateFilter.week" },
  { key: "month", label: "dateFilter.month" },
  { key: "quarter", label: "dateFilter.quarter" },
] as const;

export function DashboardDateFilter({ value, onChange }: DashboardDateFilterProps) {
  const t = useTranslations("vendor.dashboard");

  return (
    <div className="flex gap-1 bg-surface-secondary rounded-lg p-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={
            value === tab.key
              ? "flex-1 px-3 py-1.5 text-sm font-medium bg-brand-600 text-white rounded-lg transition-colors"
              : "flex-1 px-3 py-1.5 text-sm font-medium text-content-secondary hover:bg-surface-tertiary rounded-lg transition-colors"
          }
        >
          {t(tab.label)}
        </button>
      ))}
    </div>
  );
}