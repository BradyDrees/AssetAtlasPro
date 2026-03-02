"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { ScheduleJob, WorkingHoursConfig } from "@/lib/vendor/types";
import type { ColorBy } from "@/lib/vendor/schedule-colors";
import { CalendarDayView } from "./calendar-day-view";
import { CalendarWeekView } from "./calendar-week-view";
import { CalendarMonthView } from "./calendar-month-view";
import { UnscheduledJobsPanel } from "./unscheduled-jobs-panel";
import { ScheduleQuickModal } from "./schedule-quick-modal";

interface ScheduleViewProps {
  jobs: ScheduleJob[];
  unscheduledJobs: ScheduleJob[];
  workingHours: WorkingHoursConfig;
  tier?: "vendor" | "pro" | "operate";
  rescheduleAction?: (
    woId: string,
    date: string,
    start: string,
    end: string
  ) => Promise<{ ok: boolean; error?: string }>;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addMinutesClamped(hhmm: string, delta: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.min(23 * 60 + 45, h * 60 + m + delta);
  const rh = Math.floor(total / 60);
  const rm = total % 60;
  return `${String(rh).padStart(2, "0")}:${String(rm).padStart(2, "0")}`;
}

export function ScheduleView({
  jobs,
  unscheduledJobs,
  workingHours,
  rescheduleAction,
}: ScheduleViewProps) {
  const t = useTranslations("vendor.schedule");
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [colorBy, setColorBy] = useState<ColorBy>("priority");

  // Modal state
  const [modal, setModal] = useState({
    open: false,
    date: "",
    start: "",
    end: "",
    jobId: "",
  });

  const weekStart = useMemo(
    () => getWeekStart(selectedDate),
    [selectedDate]
  );

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
        ? selectedDate.toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
          })
        : `${weekStart.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })} – ${new Date(
            weekStart.getTime() + 6 * 86400000
          ).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}`;

  // Callbacks for child views
  const onSlotClick = useCallback(
    (date: string, startTime: string) => {
      setModal({
        open: true,
        date,
        start: startTime,
        end: addMinutesClamped(startTime, 60),
        jobId: "",
      });
    },
    []
  );

  const onJobClick = useCallback(
    (jobId: string) => {
      const job = jobs.find((j) => j.id === jobId);
      if (job) {
        setModal({
          open: true,
          date: job.scheduled_date ?? toDateStr(selectedDate),
          start: job.scheduled_time_start ?? "08:00",
          end:
            job.scheduled_time_end ??
            addMinutesClamped(job.scheduled_time_start ?? "08:00", 60),
          jobId: job.id,
        });
      }
    },
    [jobs, selectedDate]
  );

  const onUnscheduledJobClick = useCallback(
    (jobId: string) => {
      setModal({
        open: true,
        date: toDateStr(selectedDate),
        start: "08:00",
        end: "09:00",
        jobId,
      });
    },
    [selectedDate]
  );

  const onDayClick = useCallback((dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    setSelectedDate(new Date(y, m - 1, d));
    setView("day");
  }, []);

  // Conflict dataset for modal
  const scheduledJobsForDay = useMemo(() => {
    if (!modal.date) return [];
    return jobs.filter(
      (j) => j.scheduled_date === modal.date && j.id !== modal.jobId
    );
  }, [jobs, modal.date, modal.jobId]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            className="p-2 rounded-lg hover:bg-surface-secondary text-content-tertiary"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
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
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 4.5l7.5 7.5-7.5 7.5"
              />
            </svg>
          </button>
          <h2 className="text-sm font-medium text-content-primary ml-2">
            {dateLabel}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Color-by dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-content-quaternary uppercase">
              {t("colorBy.label")}
            </span>
            <select
              className="rounded-lg border border-edge-primary bg-surface-secondary px-2 py-1 text-xs text-content-secondary"
              value={colorBy}
              onChange={(e) => setColorBy(e.target.value as ColorBy)}
            >
              <option value="priority">{t("colorBy.priority")}</option>
              <option value="status">{t("colorBy.status")}</option>
              <option value="trade">{t("colorBy.trade")}</option>
            </select>
          </div>

          {/* View switcher */}
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
      </div>

      {/* Unscheduled panel */}
      {unscheduledJobs.length > 0 && (
        <UnscheduledJobsPanel
          jobs={unscheduledJobs}
          onJobClick={onUnscheduledJobClick}
        />
      )}

      {/* Calendar */}
      {view === "day" ? (
        <CalendarDayView
          jobs={jobs}
          date={selectedDate}
          onSlotClick={onSlotClick}
          onJobClick={onJobClick}
          workingHours={workingHours}
          colorBy={colorBy}
        />
      ) : view === "month" ? (
        <CalendarMonthView
          jobs={jobs}
          month={selectedDate}
          onDayClick={onDayClick}
          onJobClick={onJobClick}
          colorBy={colorBy}
        />
      ) : (
        <CalendarWeekView
          jobs={jobs}
          weekStart={weekStart}
          onDayClick={onDayClick}
          onJobClick={onJobClick}
          colorBy={colorBy}
        />
      )}

      {/* Quick Schedule / Reschedule Modal */}
      <ScheduleQuickModal
        open={modal.open}
        onOpenChange={(open) =>
          setModal((prev) => ({ ...prev, open }))
        }
        unscheduledJobs={unscheduledJobs}
        scheduledJobsForDay={scheduledJobsForDay}
        initialDate={modal.date}
        initialStart={modal.start}
        initialEnd={modal.end}
        initialJobId={modal.jobId}
        rescheduleAction={rescheduleAction}
      />
    </div>
  );
}
