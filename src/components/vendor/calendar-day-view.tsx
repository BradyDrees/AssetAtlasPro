"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { ScheduleJob, WorkingHoursConfig } from "@/lib/vendor/types";
import { getJobColor, type ColorBy } from "@/lib/vendor/schedule-colors";

interface CalendarDayViewProps {
  jobs: ScheduleJob[];
  date: Date;
  onSlotClick?: (date: string, startTime: string) => void;
  onJobClick?: (jobId: string) => void;
  workingHours?: WorkingHoursConfig;
  colorBy?: ColorBy;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 6); // 6am to 7pm

function parseTime(time: string | null): number | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  return h + m / 60;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function hourToHHMM(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function CalendarDayView({
  jobs,
  date,
  onSlotClick,
  onJobClick,
  workingHours,
  colorBy = "priority",
}: CalendarDayViewProps) {
  const t = useTranslations("vendor.schedule");

  const dateStr = useMemo(() => toDateStr(date), [date]);
  const dayOfWeek = date.getDay(); // 0=Sun

  const dayJobs = useMemo(() => {
    return jobs.filter((j) => j.scheduled_date === dateStr);
  }, [jobs, dateStr]);

  const timedJobs = dayJobs.filter((j) => j.scheduled_time_start);
  const allDayJobs = dayJobs.filter((j) => !j.scheduled_time_start);

  // Working hours boundaries
  const whStartHour = workingHours
    ? parseTime(workingHours.start) ?? 8
    : 8;
  const whEndHour = workingHours
    ? parseTime(workingHours.end) ?? 17
    : 17;
  const isNonWorkDay = workingHours
    ? !workingHours.days.includes(dayOfWeek)
    : false;

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary overflow-hidden">
      {/* All-day jobs */}
      {allDayJobs.length > 0 && (
        <div className="px-4 py-3 border-b border-edge-primary bg-surface-secondary/50">
          <p className="text-xs font-medium text-content-quaternary mb-2">
            {t("allDay")}
          </p>
          <div className="space-y-1">
            {allDayJobs.map((job) => (
              <button
                key={job.id}
                onClick={() => onJobClick?.(job.id)}
                className={`block w-full text-left px-3 py-2 rounded-lg ${getJobColor(job, colorBy)}`}
              >
                <span className="text-sm text-content-primary font-medium">
                  {job.title}
                </span>
                {job.trade && (
                  <span className="text-content-quaternary ml-2 text-xs">
                    {job.trade}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div className="relative">
        {HOURS.map((hour) => {
          const isOffHours =
            isNonWorkDay || hour < whStartHour || hour >= whEndHour;

          return (
            <div
              key={hour}
              className={`flex border-b border-edge-secondary/50 min-h-[3.5rem] cursor-pointer ${
                isOffHours ? "bg-surface-secondary/30" : ""
              }`}
              onClick={() => onSlotClick?.(dateStr, hourToHHMM(hour))}
            >
              <div className="w-14 flex-shrink-0 py-1 pr-2 text-right">
                <span className="text-[10px] text-content-quaternary">
                  {hour === 0
                    ? "12 AM"
                    : hour < 12
                      ? `${hour} AM`
                      : hour === 12
                        ? "12 PM"
                        : `${hour - 12} PM`}
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
                    const end =
                      parseTime(job.scheduled_time_end) ?? start + 1;
                    const topPct = ((start - hour) / 1) * 100;
                    const heightRem = Math.max((end - start) * 3.5, 2);

                    return (
                      <button
                        key={job.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onJobClick?.(job.id);
                        }}
                        className={`absolute left-1 right-1 rounded-lg px-2 py-1 text-left ${getJobColor(job, colorBy)} hover:opacity-80 transition-opacity overflow-hidden`}
                        style={{
                          top: `${topPct}%`,
                          minHeight: `${heightRem}rem`,
                        }}
                      >
                        <p className="text-xs font-medium text-content-primary truncate">
                          {job.title}
                        </p>
                        <p className="text-[10px] text-content-tertiary">
                          {job.scheduled_time_start} -{" "}
                          {job.scheduled_time_end}
                        </p>
                      </button>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>

      {dayJobs.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-content-tertiary">{t("noJobs")}</p>
        </div>
      )}
    </div>
  );
}
