"use client";

import type { ProjectType, ProjectStatus, ProjectFilters } from "@/app/actions/operate-projects";

type TFn = (key: string, values?: Record<string, string | number>) => string;

interface ProjectFilterBarProps {
  filters: ProjectFilters;
  onFilterChange: (next: ProjectFilters) => void;
  t: TFn;
  projectTypes: ProjectType[];
}

const ALL_STATUSES: ProjectStatus[] = [
  "draft",
  "active",
  "on_hold",
  "completed",
];

export function ProjectFilterBar({
  filters,
  onFilterChange,
  t,
  projectTypes,
}: ProjectFilterBarProps) {
  const setSearch = (search: string) =>
    onFilterChange({ ...filters, search: search || undefined });

  const setType = (type: ProjectType | undefined) =>
    onFilterChange({ ...filters, project_type: type });

  const setStatus = (status: ProjectStatus | undefined) =>
    onFilterChange({ ...filters, status });

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      {/* Search input */}
      <div className="relative w-full sm:w-64">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-quaternary pointer-events-none"
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
          value={filters.search ?? ""}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("filters.searchPlaceholder")}
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-surface-secondary border border-edge-secondary text-content-primary placeholder:text-content-quaternary focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-colors"
        />
      </div>

      {/* Type pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setType(undefined)}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
            !filters.project_type
              ? "bg-green-600 border-green-500 text-white"
              : "bg-surface-secondary border-edge-secondary text-content-tertiary hover:border-edge-primary"
          }`}
        >
          {t("filters.allTypes")}
        </button>
        {projectTypes.map((pt) => (
          <button
            key={pt}
            type="button"
            onClick={() =>
              setType(filters.project_type === pt ? undefined : pt)
            }
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              filters.project_type === pt
                ? "bg-green-600 border-green-500 text-white"
                : "bg-surface-secondary border-edge-secondary text-content-tertiary hover:border-edge-primary"
            }`}
          >
            {t(`projectTypes.${pt}`)}
          </button>
        ))}
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setStatus(undefined)}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
            !filters.status
              ? "bg-green-600 border-green-500 text-white"
              : "bg-surface-secondary border-edge-secondary text-content-tertiary hover:border-edge-primary"
          }`}
        >
          {t("filters.allStatuses")}
        </button>
        {ALL_STATUSES.map((st) => (
          <button
            key={st}
            type="button"
            onClick={() =>
              setStatus(filters.status === st ? undefined : st)
            }
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              filters.status === st
                ? "bg-green-600 border-green-500 text-white"
                : "bg-surface-secondary border-edge-secondary text-content-tertiary hover:border-edge-primary"
            }`}
          >
            {t(`statuses.${st}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
