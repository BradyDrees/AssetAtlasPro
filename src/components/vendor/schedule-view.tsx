"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { CalendarDayView } from "./calendar-day-view";
import { CalendarWeekView } from "./calendar-week-view";
import { CalendarMonthView } from "./calendar-month-view";

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

interface ScheduleViewProps {
  jobs: ScheduledJob[];
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function ScheduleView({ jobs }: ScheduleViewProps) {
  const t = useTranslations("vendor.schedule");
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [selectedDate, setSelectedDate] = useState(new Date());

  const weekStart = useMemo(() => getWeekStart(selectedDate), [selectedDate]);

  const goToday = () => setSelectedDate(new Date());
  const goPrev = () => {
    const d = new Date(selectedDate);
    if (view === "day") d.setDate(d.getDate() - 1);
    else if (view === "week") d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setSelectedDate(d);
  };
  const goNext = () => {
    const d = new Date(selectedDate);
    if (view === "day") d.setDate(d.getDate() + 1);
    else if (view === "week") d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setSelectedDate(d);
  };

  const dateLabel =
    view === "day"
      ? selectedDate.toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })
      : view === "month"
        ? selectedDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })
        : `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${new Date(
            weekStart.getTime() + 6 * 86400000
          ).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            className="p-2 rounded-lg hover:bg-surface-secondary text-content-tertiary"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            onClick={goToday}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-secondary text-content-secondary hover:bg-surface-tertiary transition-colors"
          >
            {t("today")}
          </button>
          <button
            onClick={goNext}
            className="p-2 rounded-lg hover:bg-surface-secondary text-content-tertiary"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
          <h2 className="text-sm font-medium text-content-primary ml-2">{dateLabel}</h2>
        </div>

        <div className="flex rounded-lg border border-edge-primary overflow-hidden">
          <button
            onClick={() => setView("day")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              view === "day"
                ? "bg-brand-600 text-white"
                : "bg-surface-secondary text-content-tertiary hover:bg-surface-tertiary"
            }`}
          >
            {t("dayView")}
          </button>
          <button
            onClick={() => setView("week")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              view === "week"
                ? "bg-brand-600 text-white"
                : "bg-surface-secondary text-content-tertiary hover:bg-surface-tertiary"
            }`}
          >
            {t("weekView")}
          </button>
          <button
            onClick={() => setView("month")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              view === "month"
                ? "bg-brand-600 text-white"
                : "bg-surface-secondary text-content-tertiary hover:bg-surface-tertiary"
            }`}
          >
            {t("monthView")}
          </button>
        </div>
      </div>

      {/* Calendar */}
      {view === "day" ? (
        <CalendarDayView jobs={jobs} date={selectedDate} />
      ) : view === "month" ? (
        <CalendarMonthView jobs={jobs} month={selectedDate} />
      ) : (
        <CalendarWeekView jobs={jobs} weekStart={weekStart} />
      )}
    </div>
  );
}
