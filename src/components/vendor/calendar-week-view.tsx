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

interface CalendarWeekViewProps {
  jobs: ScheduledJob[];
  weekStart: Date;
}

const DAY_NAMES_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const priorityBorder: Record<string, string> = {
  normal: "border-l-brand-500",
  urgent: "border-l-yellow-500",
  emergency: "border-l-red-500",
};

export function CalendarWeekView({ jobs, weekStart }: CalendarWeekViewProps) {
  const t = useTranslations("vendor.schedule");

  const days = useMemo(() => {
    const result: { date: Date; dateStr: string; jobs: ScheduledJob[] }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      result.push({
        date: d,
        dateStr,
        jobs: jobs.filter((j) => j.scheduled_date === dateStr),
      });
    }
    return result;
  }, [jobs, weekStart]);

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day) => {
        const isToday = day.dateStr === todayStr;
        return (
          <div key={day.dateStr} className="min-h-[10rem]">
            {/* Day header */}
            <div className={`text-center py-2 rounded-t-lg ${isToday ? "bg-brand-600/20" : "bg-surface-secondary/50"}`}>
              <p className="text-[10px] text-content-quaternary uppercase">
                {DAY_NAMES_EN[day.date.getDay()]}
              </p>
              <p className={`text-lg font-bold ${isToday ? "text-brand-400" : "text-content-primary"}`}>
                {day.date.getDate()}
              </p>
            </div>

            {/* Jobs */}
            <div className="bg-surface-primary border border-edge-primary border-t-0 rounded-b-lg p-1.5 space-y-1 min-h-[7rem]">
              {day.jobs.length === 0 ? (
                <p className="text-[10px] text-content-quaternary text-center pt-4">—</p>
              ) : (
                day.jobs.slice(0, 4).map((job) => (
                  <Link
                    key={job.id}
                    href={`/vendor/jobs/${job.id}`}
                    className={`block rounded px-1.5 py-1 border-l-2 bg-surface-secondary/50 hover:bg-surface-secondary transition-colors ${
                      priorityBorder[job.priority] ?? priorityBorder.normal
                    }`}
                  >
                    <p className="text-[10px] font-medium text-content-primary truncate">
                      {job.property_name ?? job.description}
                    </p>
                    {job.scheduled_time_start && (
                      <p className="text-[9px] text-content-quaternary">
                        {job.scheduled_time_start.slice(0, 5)}
                      </p>
                    )}
                  </Link>
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
