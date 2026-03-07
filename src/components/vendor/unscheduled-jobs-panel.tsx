"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ScheduleJob } from "@/lib/vendor/types";

export interface UnscheduledJobsPanelProps {
  jobs: ScheduleJob[];
  onJobClick: (jobId: string) => void;
  onSmartSchedule?: () => void;
}

const priorityDot: Record<string, string> = {
  normal: "bg-brand-500",
  urgent: "bg-yellow-500",
  emergency: "bg-red-500",
};

export function UnscheduledJobsPanel({
  jobs,
  onJobClick,
  onSmartSchedule,
}: UnscheduledJobsPanelProps) {
  const t = useTranslations("vendor.schedule");
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary">
      <button
        className="flex w-full items-center justify-between p-3"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-content-primary">
            {t("unscheduled.title")}
          </span>
          <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs text-content-secondary font-medium">
            {jobs.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onSmartSchedule && jobs.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onSmartSchedule();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.stopPropagation();
                  onSmartSchedule();
                }
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium text-brand-400 bg-brand-600/10 hover:bg-brand-600/20 transition-colors cursor-pointer"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              {t("smartScheduler.title")}
            </span>
          )}
          <span className="text-xs text-content-tertiary">
            {expanded ? t("unscheduled.collapse") : t("unscheduled.expand")}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-edge-primary p-3">
          {jobs.length === 0 ? (
            <p className="text-sm text-content-tertiary py-2 text-center">
              {t("unscheduled.empty")}
            </p>
          ) : (
            <div className="grid gap-1.5">
              {jobs.map((j) => (
                <button
                  key={j.id}
                  onClick={() => onJobClick(j.id)}
                  className="flex w-full items-center justify-between rounded-lg bg-surface-secondary p-2.5 text-left hover:bg-surface-tertiary transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-content-primary truncate">
                      {j.propertyName || j.title}
                    </p>
                    <p className="text-xs text-content-quaternary">
                      {j.trade || "—"} · {j.status.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div className="ml-3 flex items-center gap-1.5 shrink-0">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        priorityDot[j.priority] ?? priorityDot.normal
                      }`}
                    />
                    <span className="text-[10px] text-content-quaternary capitalize">
                      {j.priority}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
