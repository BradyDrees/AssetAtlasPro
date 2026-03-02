"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { ScheduleJob } from "@/lib/vendor/types";
import { getJobColor, type ColorBy } from "@/lib/vendor/schedule-colors";

interface CalendarWeekViewProps {
  jobs: ScheduleJob[];
  weekStart: Date;
  onDayClick?: (dateStr: string) => void;
  onJobClick?: (jobId: string) => void;
  colorBy?: ColorBy;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CalendarWeekView({
  jobs,
  weekStart,
  onDayClick,
  onJobClick,
  colorBy = "priority",
}: CalendarWeekViewProps) {
  const t = useTranslations("vendor.schedule");

  const days = useMemo(() => {
    const result: { date: Date; dateStr: string; jobs: ScheduleJob[] }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const dateStr = toDateStr(d);
      result.push({
        date: d,
        dateStr,
        jobs: jobs.filter((j) => j.scheduled_date === dateStr),
      });
    }
    return result;
  }, [jobs, weekStart]);

  const todayStr = toDateStr(new Date());

  const dayLabels = [
    t("days.sun"),
    t("days.mon"),
    t("days.tue"),
    t("days.wed"),
    t("days.thu"),
    t("days.fri"),
    t("days.sat"),
  ];

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day) => {
        const isToday = day.dateStr === todayStr;
        return (
          <div key={day.dateStr} className="min-h-[10rem]">
            {/* Day header — click to switch to day view */}
            <button
              onClick={() => onDayClick?.(day.dateStr)}
              className={`w-full text-center py-2 rounded-t-lg cursor-pointer hover:opacity-80 transition-opacity ${
                isToday ? "bg-brand-600/20" : "bg-surface-secondary/50"
              }`}
            >
              <p className="text-[10px] text-content-quaternary uppercase">
                {dayLabels[day.date.getDay()]}
              </p>
              <p
                className={`text-lg font-bold ${
                  isToday ? "text-brand-400" : "text-content-primary"
                }`}
              >
                {day.date.getDate()}
              </p>
            </button>

            {/* Jobs */}
            <div className="bg-surface-primary border border-edge-primary border-t-0 rounded-b-lg p-1.5 space-y-1 min-h-[7rem]">
              {day.jobs.length === 0 ? (
                <p className="text-[10px] text-content-quaternary text-center pt-4">
                  —
                </p>
              ) : (
                day.jobs.slice(0, 4).map((job) => (
                  <button
                    key={job.id}
                    onClick={() => onJobClick?.(job.id)}
                    className={`block w-full text-left rounded px-1.5 py-1 ${getJobColor(job, colorBy)} hover:opacity-80 transition-opacity`}
                  >
                    <p className="text-[10px] font-medium text-content-primary truncate">
                      {job.title}
                    </p>
                    {job.scheduled_time_start && (
                      <p className="text-[9px] text-content-quaternary">
                        {job.scheduled_time_start}
                      </p>
                    )}
                  </button>
                ))
              )}
              {day.jobs.length > 4 && (
                <p className="text-[9px] text-content-quaternary text-center">
                  +{day.jobs.length - 4}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
