"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface ScheduledJob {
  id: string;
  property_name: string | null;
  description: string | null;
  trade: string | null;
  priority: string;
  status: string;
  scheduled_date: string | null;
  scheduled_time_start: string | null;
  scheduled_time_end: string | null;
}

interface CalendarDayViewProps {
  jobs: ScheduledJob[];
  date: Date;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 6); // 6am to 7pm

const priorityColors: Record<string, string> = {
  normal: "border-l-brand-500 bg-brand-500/10",
  urgent: "border-l-yellow-500 bg-yellow-500/10",
  emergency: "border-l-red-500 bg-red-500/10",
};

function parseTime(time: string | null): number | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  return h + m / 60;
}

export function CalendarDayView({ jobs, date }: CalendarDayViewProps) {
  const t = useTranslations("vendor.schedule");

  const dayJobs = useMemo(() => {
    const dateStr = date.toISOString().split("T")[0];
    return jobs.filter((j) => j.scheduled_date === dateStr);
  }, [jobs, date]);

  const timedJobs = dayJobs.filter((j) => j.scheduled_time_start);
  const allDayJobs = dayJobs.filter((j) => !j.scheduled_time_start);

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary overflow-hidden">
      {/* All-day jobs */}
      {allDayJobs.length > 0 && (
        <div className="px-4 py-3 border-b border-edge-primary bg-surface-secondary/50">
          <p className="text-xs font-medium text-content-quaternary mb-2">{t("allDay")}</p>
          <div className="space-y-1">
            {allDayJobs.map((job) => (
              <Link
                key={job.id}
                href={`/vendor/jobs/${job.id}`}
                className={`block px-3 py-2 rounded-lg border-l-3 text-sm ${
                  priorityColors[job.priority] ?? priorityColors.normal
                }`}
              >
                <span className="text-content-primary font-medium">
                  {job.property_name ?? job.description}
                </span>
                {job.trade && (
                  <span className="text-content-quaternary ml-2 text-xs">{job.trade}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div className="relative">
        {HOURS.map((hour) => (
          <div key={hour} className="flex border-b border-edge-secondary/50 min-h-[3.5rem]">
            <div className="w-14 flex-shrink-0 py-1 pr-2 text-right">
              <span className="text-[10px] text-content-quaternary">
                {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
              </span>
            </div>
            <div className="flex-1 relative border-l border-edge-secondary/50">
              {timedJobs
                .filter((j) => {
                  const start = parseTime(j.scheduled_time_start);
                  return start !== null && Math.floor(start) === hour;
                })
                .map((job) => {
                  const start = parseTime(job.scheduled_time_start)!;
                  const end = parseTime(job.scheduled_time_end) ?? start + 1;
                  const topPct = ((start - hour) / 1) * 100;
                  const heightRem = Math.max((end - start) * 3.5, 2);

                  return (
                    <Link
                      key={job.id}
                      href={`/vendor/jobs/${job.id}`}
                      className={`absolute left-1 right-1 rounded-lg border-l-3 px-2 py-1 ${
                        priorityColors[job.priority] ?? priorityColors.normal
                      } hover:opacity-80 transition-opacity overflow-hidden`}
                      style={{
                        top: `${topPct}%`,
                        minHeight: `${heightRem}rem`,
                      }}
                    >
                      <p className="text-xs font-medium text-content-primary truncate">
                        {job.property_name ?? job.description}
                      </p>
                      <p className="text-[10px] text-content-tertiary">
                        {job.scheduled_time_start?.slice(0, 5)} - {job.scheduled_time_end?.slice(0, 5)}
                      </p>
                    </Link>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {dayJobs.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-content-tertiary">{t("noJobs")}</p>
        </div>
      )}
    </div>
  );
}
