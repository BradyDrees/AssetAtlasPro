"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ScheduleJob } from "@/lib/vendor/types";

export interface UnscheduledJobsPanelProps {
  jobs: ScheduleJob[];
  onJobClick: (jobId: string) => void;
}

const priorityDot: Record<string, string> = {
  normal: "bg-brand-500",
  urgent: "bg-yellow-500",
  emergency: "bg-red-500",
};

export function UnscheduledJobsPanel({
  jobs,
  onJobClick,
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
        <span className="text-xs text-content-tertiary">
          {expanded ? t("unscheduled.collapse") : t("unscheduled.expand")}
        </span>
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
