"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { VendorWoTimeEntry } from "@/lib/vendor/work-order-types";
import { clockIn, clockOut } from "@/app/actions/vendor-work-orders";

interface TimeTrackerProps {
  workOrderId: string;
  timeEntries: VendorWoTimeEntry[];
  readOnly?: boolean;
}

export function TimeTracker({
  workOrderId,
  timeEntries,
  readOnly = false,
}: TimeTrackerProps) {
  const t = useTranslations("vendor.jobs");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Check if there's an open entry (no clock_out)
  const openEntry = timeEntries.find((e) => !e.clock_out);
  const isClockedIn = !!openEntry;

  const totalMinutes = timeEntries.reduce(
    (sum, e) => sum + (e.duration_minutes || 0),
    0
  );

  async function handleClockIn() {
    setLoading(true);
    const { error } = await clockIn({ work_order_id: workOrderId });
    setLoading(false);
    if (error) {
      alert(error);
    } else {
      router.refresh();
    }
  }

  async function handleClockOut() {
    setLoading(true);
    const { error } = await clockOut(workOrderId);
    setLoading(false);
    if (error) {
      alert(error);
    } else {
      router.refresh();
    }
  }

  function formatDuration(minutes: number): string {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}${t("time.minutes")}`;
    }
    return `${mins} ${t("time.minutes")}`;
  }

  function formatTime(isoString: string): string {
    return new Date(isoString).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDate(isoString: string): string {
    return new Date(isoString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-content-primary">
          {t("time.title")}
        </h3>
        {totalMinutes > 0 && (
          <span className="text-xs text-content-tertiary">
            {t("time.duration")}: {formatDuration(totalMinutes)}
          </span>
        )}
      </div>

      {/* Clock In/Out Button */}
      {!readOnly && (
        <div className="mb-4">
          {isClockedIn ? (
            <button
              onClick={handleClockOut}
              disabled={loading}
              className="w-full py-3 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
              {loading ? "..." : t("time.clockOut")}
            </button>
          ) : (
            <button
              onClick={handleClockIn}
              disabled={loading}
              className="w-full py-3 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50"
            >
              {loading ? "..." : t("time.clockIn")}
            </button>
          )}
        </div>
      )}

      {/* Time entries list */}
      {timeEntries.length === 0 ? (
        <p className="text-xs text-content-quaternary">
          {t("time.noEntries")}
        </p>
      ) : (
        <div className="space-y-2">
          {timeEntries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between py-2 border-b border-edge-secondary last:border-0"
            >
              <div>
                <p className="text-sm text-content-primary">
                  {formatDate(entry.clock_in)}
                </p>
                <p className="text-xs text-content-tertiary">
                  {formatTime(entry.clock_in)}
                  {entry.clock_out ? ` – ${formatTime(entry.clock_out)}` : " – ..."}
                </p>
              </div>
              <span className="text-sm font-medium text-content-primary">
                {entry.duration_minutes
                  ? formatDuration(entry.duration_minutes)
                  : "⏱"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
