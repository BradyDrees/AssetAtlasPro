"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { TodayJob } from "@/app/actions/vendor-dashboard";

interface TodaysScheduleProps {
  jobs: TodayJob[];
}

export function TodaysSchedule({ jobs }: TodaysScheduleProps) {
  const dt = useTranslations("vendor.dashboard");

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-content-primary">
          {dt("sections.todaysSchedule")}
        </h2>
        <Link
          href="/vendor/schedule"
          className="text-xs text-brand-400 hover:text-brand-300 font-medium"
        >
          {dt("actions.viewAll")}
        </Link>
      </div>

      {jobs.length === 0 ? (
        <p className="text-sm text-content-tertiary">{dt("empty.noSchedule")}</p>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/vendor/jobs/${job.id}`}
              className="flex items-center gap-3 p-3 rounded-lg bg-surface-secondary hover:bg-surface-tertiary transition-colors"
            >
              {/* Time */}
              <div className="w-16 text-center flex-shrink-0">
                {job.scheduled_time_start ? (
                  <p className="text-xs font-mono text-content-secondary">
                    {job.scheduled_time_start.slice(0, 5)}
                  </p>
                ) : (
                  <p className="text-[10px] text-content-quaternary uppercase">
                    {dt("allDay")}
                  </p>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-content-primary truncate">
                  {job.property_name ?? job.description}
                </p>
                <p className="text-xs text-content-quaternary">
                  {job.trade} · {job.status}
                </p>
              </div>

              <svg className="w-4 h-4 text-content-quaternary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
