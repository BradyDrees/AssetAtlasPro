"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useFormatDate } from "@/hooks/use-format-date";
import type { VendorWoTimeEntry } from "@/lib/vendor/work-order-types";
import { GpsClock } from "./gps-clock";

interface TimeTrackerProps {
  workOrderId: string;
  timeEntries: VendorWoTimeEntry[];
  readOnly?: boolean;
  propertyLat?: number | null;
  propertyLng?: number | null;
  onMutate?: () => void | Promise<void>;
}

export function TimeTracker({
  workOrderId,
  timeEntries,
  readOnly = false,
  propertyLat,
  propertyLng,
  onMutate,
}: TimeTrackerProps) {
  const t = useTranslations("vendor.jobs");
  const { formatDate: fmtDate, formatDateTime: fmtDateTime } = useFormatDate();

  // Check if there's an open entry (no clock_out)
  const openEntry = timeEntries.find((e) => !e.clock_out) ?? null;

  const totalMinutes = timeEntries.reduce(
    (sum, e) => sum + (e.duration_minutes || 0),
    0
  );

  function formatDuration(minutes: number): string {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}${t("time.minutes")}`;
    }
    return `${mins} ${t("time.minutes")}`;
  }

  function formatTime(isoString: string): string {
    const d = new Date(isoString);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return fmtDateTime(isoString).split(", ").pop() ?? `${hh}:${mm}`;
  }

  function formatDate(isoString: string): string {
    return fmtDate(isoString, { weekday: false, year: false });
  }

  function locationBadge(entry: VendorWoTimeEntry) {
    if (entry.is_on_site === true) {
      return (
        <span className="text-[9px] text-green-400 flex items-center gap-0.5">
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t("time.gps.onSite")}
        </span>
      );
    }
    if (entry.is_on_site === false) {
      return (
        <span className="text-[9px] text-amber-400 flex items-center gap-0.5">
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
          </svg>
          {t("time.gps.offSite")}
        </span>
      );
    }
    if (entry.clock_in_lat != null) {
      // Has GPS but no property to compare
      return (
        <span className="text-[9px] text-content-quaternary flex items-center gap-0.5">
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          GPS
        </span>
      );
    }
    return null;
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

      {/* GPS Clock In/Out */}
      {!readOnly && (
        <div className="mb-4">
          <GpsClock
            workOrderId={workOrderId}
            openEntry={openEntry}
            propertyLat={propertyLat}
            propertyLng={propertyLng}
            onMutate={onMutate}
          />
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
                {locationBadge(entry)}
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
