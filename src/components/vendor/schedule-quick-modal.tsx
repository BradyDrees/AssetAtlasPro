"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ScheduleJob } from "@/lib/vendor/types";
import { rescheduleJob } from "@/app/actions/vendor-work-orders";

type RescheduleResult = { ok: boolean; error?: string };

export type ScheduleQuickModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unscheduledJobs: ScheduleJob[];
  scheduledJobsForDay: ScheduleJob[];
  initialDate?: string;
  initialStart?: string;
  initialEnd?: string;
  initialJobId?: string;
  rescheduleAction?: (
    woId: string,
    date: string,
    start: string,
    end: string
  ) => Promise<RescheduleResult>;
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function overlaps(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
}

function addMinutes(hhmm: string, delta: number): string {
  const total = Math.min(23 * 60 + 45, toMinutes(hhmm) + delta);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timeOptions15(): string[] {
  const out: string[] = [];
  for (let m = 0; m <= 23 * 60 + 45; m += 15) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    out.push(`${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
  }
  return out;
}

function endOptionsFrom(start: string): string[] {
  const startM = toMinutes(start);
  const out: string[] = [];
  for (let m = startM + 15; m <= 23 * 60 + 45; m += 15) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    out.push(`${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
  }
  return out;
}

/** Default vendor-side wrapper — adapts { error? } → { ok, error? } */
async function defaultReschedule(
  woId: string,
  date: string,
  start: string,
  end: string
): Promise<RescheduleResult> {
  const r = await rescheduleJob(woId, date, start, end);
  return r.error ? { ok: false, error: r.error } : { ok: true };
}

const START_OPTIONS = timeOptions15();

export function ScheduleQuickModal(props: ScheduleQuickModalProps) {
  const t = useTranslations("vendor.schedule");
  const router = useRouter();
  const action = props.rescheduleAction ?? defaultReschedule;

  const [jobId, setJobId] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [start, setStart] = useState<string>("08:00");
  const [end, setEnd] = useState<string>("09:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (!props.open) return;
    setJobId(props.initialJobId ?? "");
    setDate(props.initialDate ?? "");
    const s = props.initialStart ?? "08:00";
    setStart(s);
    setEnd(props.initialEnd ?? addMinutes(s, 60));
    setError(null);
    setSaving(false);
  }, [props.open, props.initialDate, props.initialStart, props.initialEnd, props.initialJobId]);

  // Keep end valid when start changes
  useEffect(() => {
    const ends = endOptionsFrom(start);
    if (!ends.includes(end)) {
      setEnd(addMinutes(start, 60));
    }
  }, [start]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedJob = useMemo(() => {
    const all = [...props.unscheduledJobs, ...props.scheduledJobsForDay];
    return all.find((j) => j.id === jobId) ?? null;
  }, [jobId, props.unscheduledJobs, props.scheduledJobsForDay]);

  const isReschedule = Boolean(selectedJob?.scheduled_date);

  const endOptions = useMemo(() => endOptionsFrom(start), [start]);

  const conflict = useMemo(() => {
    if (!date || !start || !end || !jobId) return false;
    if (toMinutes(end) <= toMinutes(start)) return false;

    for (const j of props.scheduledJobsForDay) {
      if (j.id === jobId) continue;
      if (j.scheduled_date !== date) continue;
      if (!j.scheduled_time_start || !j.scheduled_time_end) continue;
      if (overlaps(start, end, j.scheduled_time_start, j.scheduled_time_end))
        return true;
    }
    return false;
  }, [date, start, end, jobId, props.scheduledJobsForDay]);

  const onSave = useCallback(async () => {
    setError(null);

    if (!jobId) {
      setError(t("quickSchedule.error"));
      return;
    }
    if (!date) {
      setError(t("quickSchedule.error"));
      return;
    }
    if (toMinutes(end) <= toMinutes(start)) {
      setError(t("quickSchedule.error"));
      return;
    }

    setSaving(true);
    try {
      const result = await action(jobId, date, start, end);
      if (!result.ok) {
        setError(result.error ?? t("quickSchedule.error"));
        setSaving(false);
        return;
      }
      router.refresh();
      props.onOpenChange(false);
    } catch {
      setError(t("quickSchedule.error"));
    } finally {
      setSaving(false);
    }
  }, [jobId, date, start, end, action, router, props, t]);

  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => props.onOpenChange(false)}
      />

      <div className="relative w-full max-w-md rounded-xl bg-surface-primary border border-edge-primary shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-edge-primary">
          <h2 className="text-lg font-semibold text-content-primary">
            {isReschedule ? t("reschedule.title") : t("quickSchedule.title")}
          </h2>
          <button
            onClick={() => props.onOpenChange(false)}
            className="p-1 rounded-lg hover:bg-surface-secondary text-content-tertiary"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Job select */}
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1.5">
              {t("quickSchedule.selectJob")}
            </label>
            <select
              className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2.5 text-sm text-content-primary"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
            >
              <option value="">{t("quickSchedule.selectJob")}…</option>
              {props.unscheduledJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} — {j.trade || "—"}
                </option>
              ))}
              {/* If rescheduling a scheduled job not in unscheduled list */}
              {selectedJob &&
                !props.unscheduledJobs.some((j) => j.id === selectedJob.id) && (
                  <option value={selectedJob.id}>
                    {selectedJob.title} — {selectedJob.trade || "—"}
                  </option>
                )}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1.5">
              {t("quickSchedule.date")}
            </label>
            <input
              type="date"
              className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2.5 text-sm text-content-primary"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Start / End */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1.5">
                {t("quickSchedule.startTime")}
              </label>
              <select
                className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2.5 text-sm text-content-primary"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              >
                {START_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1.5">
                {t("quickSchedule.endTime")}
              </label>
              <select
                className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2.5 text-sm text-content-primary"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              >
                {endOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conflict warning */}
          {conflict && (
            <div className="rounded-lg px-4 py-3 text-sm bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
              <p className="font-medium">{t("quickSchedule.conflictTitle")}</p>
              <p className="text-xs mt-0.5">{t("quickSchedule.conflictBody")}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg px-4 py-3 text-sm bg-red-500/10 text-red-400 border border-red-500/20">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-edge-primary">
          <button
            onClick={() => props.onOpenChange(false)}
            className="px-5 py-2.5 rounded-lg border border-edge-primary text-content-secondary text-sm font-medium hover:bg-surface-secondary transition-colors"
          >
            {t("quickSchedule.cancel")}
          </button>
          <button
            onClick={onSave}
            disabled={saving || !jobId || !date}
            className="px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {saving ? t("quickSchedule.saving") : t("quickSchedule.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
