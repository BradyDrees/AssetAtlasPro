"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import type { ScheduleJob } from "@/lib/vendor/types";
import { nearestNeighborSort, formatRouteSummary } from "@/lib/vendor/route-utils";

interface RouteOptimizerProps {
  jobs: ScheduleJob[];
  date: string;
  onOptimized: (orderedIds: string[]) => void;
}

export function RouteOptimizer({ jobs, date, onOptimized }: RouteOptimizerProps) {
  const t = useTranslations("vendor.schedule");
  const [optimized, setOptimized] = useState(false);
  const [summary, setSummary] = useState<{ totalMiles: string; totalMinutes: number } | null>(null);

  const dayJobs = useMemo(
    () => jobs.filter((j) => j.scheduled_date === date && j.property_lat != null && j.property_lng != null),
    [jobs, date]
  );

  const handleOptimize = () => {
    if (dayJobs.length < 2) return;

    const stops = dayJobs.map((j) => ({
      id: j.id,
      lat: j.property_lat!,
      lng: j.property_lng!,
    }));

    const sorted = nearestNeighborSort(stops);
    const orderedIds = sorted.map((s) => s.id);
    const routeSummary = formatRouteSummary(sorted);

    setSummary(routeSummary);
    setOptimized(true);
    onOptimized(orderedIds);
  };

  if (dayJobs.length < 2) return null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={handleOptimize}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600/10 text-green-400 hover:bg-green-600/20 border border-green-500/20 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
        </svg>
        {t("map.optimizeRoute")}
      </button>

      {optimized && summary && (
        <div className="flex items-center gap-3 text-xs text-content-secondary">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-content-quaternary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-3.375M3.375 14.25h-.375a3 3 0 013-3h.75l3.525-5.288a1.5 1.5 0 011.248-.662h4.476c.502 0 .97.25 1.248.662l3.525 5.288h.75a3 3 0 013 3v3.375" />
            </svg>
            {summary.totalMiles} {t("map.miles")}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-content-quaternary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ~{summary.totalMinutes} {t("map.minDrive")}
          </span>
        </div>
      )}
    </div>
  );
}
