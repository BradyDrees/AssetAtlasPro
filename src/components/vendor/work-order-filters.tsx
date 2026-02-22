"use client";

import { useTranslations } from "next-intl";
import type { WoStatus } from "@/lib/vendor/types";

interface WorkOrderFiltersProps {
  activeTab: "incoming" | "active" | "completed" | "all";
  onTabChange: (tab: "incoming" | "active" | "completed" | "all") => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const TABS = ["incoming", "active", "completed", "all"] as const;

/** Statuses for each filter tab */
export const TAB_STATUS_MAP: Record<string, WoStatus[]> = {
  incoming: ["assigned"],
  active: ["accepted", "scheduled", "en_route", "on_site", "in_progress"],
  completed: ["completed", "invoiced", "paid"],
  all: [],
};

export function WorkOrderFilters({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
}: WorkOrderFiltersProps) {
  const t = useTranslations("vendor.jobs");

  return (
    <div className="space-y-3">
      {/* Tab bar */}
      <div className="flex gap-1 bg-surface-secondary rounded-lg p-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-surface-primary text-content-primary shadow-sm"
                : "text-content-tertiary hover:text-content-secondary"
            }`}
          >
            {t(tab)}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-quaternary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("filters.search")}
          className="w-full pl-10 pr-4 py-2.5 bg-surface-primary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
        />
      </div>
    </div>
  );
}
