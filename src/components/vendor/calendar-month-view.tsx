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

interface CalendarMonthViewProps {
  jobs: ScheduledJob[];
  month: Date;
}

const priorityDot: Record<string, string> = {
  normal: "bg-brand-500",
  urgent: "bg-yellow-500",
  emergency: "bg-red-500",
};

export function CalendarMonthView({ jobs, month }: CalendarMonthViewProps) {
  const t = useTranslations("vendor.schedule");

  const weeks = useMemo(() => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const first = new Date(year, m, 1);
    const firstDay = first.getDay();
    const daysInMonth = new Date(year, m + 1, 0).getDate();

    const cells: { date: number | null; dateStr: string; jobs: ScheduledJob[] }[] = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push({ date: null, dateStr: "", jobs: [] });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ date: d, dateStr, jobs: jobs.filter((j) => j.scheduled_date === dateStr) });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ date: null, dateStr: "", jobs: [] });
    }

    const result: typeof cells[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      result.push(cells.slice(i, i + 7));
    }
    return result;
  }, [jobs, month]);

  const todayStr = new Date().toISOString().split("T")[0];
  const dayLabels = [t("days.sun"), t("days.mon"), t("days.tue"), t("days.wed"), t("days.thu"), t("days.fri"), t("days.sat")];

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary overflow-hidden">
      <div className="grid grid-cols-7 border-b border-edge-primary">
        {dayLabels.map((label) => (
          <div key={label} className="py-2 text-center text-[10px] text-content-quaternary uppercase font-medium">
            {label}
          </div>
        ))}
      </div>

      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-edge-secondary/50 last:border-b-0">
          {week.map((cell, ci) => {
            const isToday = cell.dateStr === todayStr;
            return (
              <div key={ci} className={`min-h-[5rem] p-1 border-r border-edge-secondary/30 last:border-r-0 ${cell.date === null ? "bg-surface-secondary/30" : ""}`}>
                {cell.date !== null && (
                  <>
                    <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-brand-600 text-white" : "text-content-secondary"}`}>
                      {cell.date}
                    </div>
                    <div className="space-y-0.5">
                      {cell.jobs.slice(0, 3).map((job) => (
                        <Link key={job.id} href={`/vendor/jobs/${job.id}`} className="block px-1 py-0.5 rounded text-[9px] bg-surface-secondary hover:bg-surface-tertiary transition-colors truncate">
                          <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${priorityDot[job.priority] ?? priorityDot.normal}`} />
                          <span className="text-content-primary">{job.property_name ?? job.description}</span>
                        </Link>
                      ))}
                      {cell.jobs.length > 3 && (
                        <p className="text-[9px] text-content-quaternary text-center">+{cell.jobs.length - 3}</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
