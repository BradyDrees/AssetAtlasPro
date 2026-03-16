"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useFormatDate } from "@/hooks/use-format-date";
import type { VendorWoTimeEntry } from "@/lib/vendor/work-order-types";
import { editTimeEntry, deleteTimeEntry } from "@/app/actions/vendor-work-orders";
import { GpsClock } from "./gps-clock";

interface TimeTrackerProps {
  workOrderId: string;
  timeEntries: VendorWoTimeEntry[];
  readOnly?: boolean;
  propertyLat?: number | null;
  propertyLng?: number | null;
  onMutate?: () => void | Promise<void>;
}

const STALE_THRESHOLD_MS = 8 * 60 * 60 * 1000; // 8 hours

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editClockOut, setEditClockOut] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Check if there's an open entry (no clock_out)
  const openEntry = timeEntries.find((e) => !e.clock_out) ?? null;

  const totalMinutes = timeEntries.reduce(
    (sum, e) => sum + (e.duration_minutes || 0),
    0
  );

  function isStale(entry: VendorWoTimeEntry): boolean {
    if (entry.clock_out) return false;
    const elapsed = Date.now() - new Date(entry.clock_in).getTime();
    return elapsed > STALE_THRESHOLD_MS;
  }

  function formatDuration(minutes: number): string {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}${t("time.minutes")}`;
    }
    return `${mins} ${t("time.minutes")}`;
  }

  function formatElapsed(clockIn: string): string {
    const elapsed = Math.round((Date.now() - new Date(clockIn).getTime()) / 60000);
    return formatDuration(elapsed);
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

  function startEditing(entry: VendorWoTimeEntry) {
    setEditingId(entry.id);
    setEditNotes(entry.notes || "");
    // Default clock-out to now (formatted for datetime-local input)
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setEditClockOut(now.toISOString().slice(0, 16));
  }

  async function handleSaveEdit(entryId: string, hasClockOut: boolean) {
    setSaving(true);
    const updates: { clock_out?: string; notes?: string } = {};

    if (!hasClockOut && editClockOut) {
      updates.clock_out = new Date(editClockOut).toISOString();
    }
    if (editNotes !== undefined) {
      updates.notes = editNotes;
    }

    const { error } = await editTimeEntry(entryId, updates);
    setSaving(false);

    if (error) {
      alert(error);
    } else {
      setEditingId(null);
      onMutate?.();
    }
  }

  async function handleDelete(entryId: string) {
    if (!confirm(t("time.confirmDelete"))) return;
    setSaving(true);
    const { error } = await deleteTimeEntry(entryId);
    setSaving(false);
    if (error) {
      alert(error);
    } else {
      onMutate?.();
    }
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

      {/* Stale entry warning */}
      {openEntry && isStale(openEntry) && (
        <div className="mb-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <p className="text-xs text-amber-400 font-medium">
            {t("time.staleWarning")}
          </p>
          <p className="text-[10px] text-amber-400/80 mt-0.5">
            {t("time.staleHint")}
          </p>
        </div>
      )}

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
          {timeEntries.map((entry) => {
            const stale = isStale(entry);
            const isEditing = editingId === entry.id;

            return (
              <div
                key={entry.id}
                className={`py-2 border-b border-edge-secondary last:border-0 ${stale ? "bg-amber-500/5 -mx-2 px-2 rounded-lg" : ""}`}
              >
                {isEditing ? (
                  /* Edit mode */
                  <div className="space-y-2">
                    {!entry.clock_out && (
                      <div>
                        <label className="text-[10px] text-content-tertiary block mb-0.5">
                          {t("time.editClockOut")}
                        </label>
                        <input
                          type="datetime-local"
                          value={editClockOut}
                          onChange={(e) => setEditClockOut(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary"
                        />
                      </div>
                    )}
                    <div>
                      <label className="text-[10px] text-content-tertiary block mb-0.5">
                        {t("time.editNotes")}
                      </label>
                      <input
                        type="text"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder={t("time.notesPlaceholder")}
                        className="w-full px-2 py-1.5 text-xs bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary placeholder:text-content-muted"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(entry.id, !!entry.clock_out)}
                        disabled={saving}
                        className="px-3 py-1 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg disabled:opacity-50"
                      >
                        {saving ? "..." : t("time.save")}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 text-xs font-medium text-content-tertiary hover:text-content-primary"
                      >
                        {t("time.cancel")}
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={saving}
                        className="px-3 py-1 text-xs font-medium text-red-400 hover:text-red-300 ml-auto disabled:opacity-50"
                      >
                        {t("time.delete")}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-content-primary">
                        {formatDate(entry.clock_in)}
                      </p>
                      <p className="text-xs text-content-tertiary">
                        {formatTime(entry.clock_in)}
                        {entry.clock_out ? ` – ${formatTime(entry.clock_out)}` : " – ..."}
                      </p>
                      {locationBadge(entry)}
                      {entry.notes && (
                        <p className="text-[10px] text-content-quaternary mt-0.5 italic">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${stale ? "text-amber-400" : "text-content-primary"}`}>
                        {entry.duration_minutes
                          ? formatDuration(entry.duration_minutes)
                          : formatElapsed(entry.clock_in)}
                      </span>
                      {!readOnly && (
                        <button
                          onClick={() => startEditing(entry)}
                          className="p-1 text-content-quaternary hover:text-content-secondary transition-colors"
                          title={t("time.edit")}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
