"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { WoStatus } from "@/lib/vendor/types";
import { getValidWoTransitions } from "@/lib/vendor/state-machine";
import { updateWorkOrderStatus } from "@/app/actions/vendor-work-orders";

interface JobActionsProps {
  woId: string;
  currentStatus: WoStatus;
}

/** Action label keys that map to status transitions */
const STATUS_TO_ACTION_KEY: Partial<Record<WoStatus, string>> = {
  accepted: "accept",
  declined: "decline",
  scheduled: "schedule",
  en_route: "startRoute",
  on_site: "arrived",
  in_progress: "startWork",
  completed: "complete",
  on_hold: "putOnHold",
};

/** Color classes for action buttons */
const STATUS_TO_BUTTON_STYLE: Partial<Record<WoStatus, string>> = {
  accepted: "bg-brand-600 hover:bg-brand-700 text-white",
  declined: "bg-red-600 hover:bg-red-700 text-white",
  completed: "bg-green-600 hover:bg-green-700 text-white",
  on_hold: "bg-gray-500 hover:bg-gray-600 text-white",
};

export function JobActions({ woId, currentStatus }: JobActionsProps) {
  const t = useTranslations("vendor.jobs");
  const router = useRouter();
  const [loading, setLoading] = useState<WoStatus | null>(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTimeStart, setScheduleTimeStart] = useState("");
  const [scheduleTimeEnd, setScheduleTimeEnd] = useState("");

  const validTransitions = getValidWoTransitions(currentStatus, "vendor");

  async function handleTransition(newStatus: WoStatus) {
    // Special transitions need modals
    if (newStatus === "declined") {
      setShowDeclineModal(true);
      return;
    }
    if (newStatus === "scheduled") {
      setShowScheduleModal(true);
      return;
    }
    if (newStatus === "completed") {
      setShowCompleteModal(true);
      return;
    }

    setLoading(newStatus);
    const { error } = await updateWorkOrderStatus(woId, newStatus);
    setLoading(null);

    if (error) {
      alert(error);
    } else {
      router.refresh();
    }
  }

  async function handleDecline() {
    if (!declineReason.trim()) return;
    setLoading("declined");
    const { error } = await updateWorkOrderStatus(woId, "declined", {
      decline_reason: declineReason,
    });
    setLoading(null);
    setShowDeclineModal(false);
    if (error) {
      alert(error);
    } else {
      router.refresh();
    }
  }

  async function handleSchedule() {
    if (!scheduleDate) return;
    setLoading("scheduled");
    const { error } = await updateWorkOrderStatus(woId, "scheduled", {
      scheduled_date: scheduleDate,
      scheduled_time_start: scheduleTimeStart || undefined,
      scheduled_time_end: scheduleTimeEnd || undefined,
    });
    setLoading(null);
    setShowScheduleModal(false);
    if (error) {
      alert(error);
    } else {
      router.refresh();
    }
  }

  async function handleComplete() {
    setLoading("completed");
    const { error } = await updateWorkOrderStatus(woId, "completed", {
      completion_notes: completionNotes || undefined,
    });
    setLoading(null);
    setShowCompleteModal(false);
    if (error) {
      alert(error);
    } else {
      router.refresh();
    }
  }

  if (validTransitions.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {validTransitions.map((status) => {
          const actionKey = STATUS_TO_ACTION_KEY[status];
          const buttonStyle =
            STATUS_TO_BUTTON_STYLE[status] ||
            "bg-brand-600 hover:bg-brand-700 text-white";

          return (
            <button
              key={status}
              onClick={() => handleTransition(status)}
              disabled={loading !== null}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${buttonStyle}`}
            >
              {loading === status ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </span>
              ) : (
                actionKey ? t(`actions.${actionKey}`) : status
              )}
            </button>
          );
        })}
      </div>

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface-primary rounded-xl border border-edge-primary p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-content-primary mb-4">
              {t("actions.decline")}
            </h3>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder={t("detail.declineReason")}
              rows={3}
              className="w-full p-3 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/40 mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeclineModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-content-secondary hover:bg-surface-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDecline}
                disabled={!declineReason.trim() || loading !== null}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              >
                {t("actions.decline")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface-primary rounded-xl border border-edge-primary p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-content-primary mb-4">
              {t("actions.schedule")}
            </h3>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm text-content-secondary mb-1">
                  {t("detail.scheduled")}
                </label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full p-3 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-content-secondary mb-1">Start</label>
                  <input
                    type="time"
                    value={scheduleTimeStart}
                    onChange={(e) => setScheduleTimeStart(e.target.value)}
                    className="w-full p-3 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  />
                </div>
                <div>
                  <label className="block text-sm text-content-secondary mb-1">End</label>
                  <input
                    type="time"
                    value={scheduleTimeEnd}
                    onChange={(e) => setScheduleTimeEnd(e.target.value)}
                    className="w-full p-3 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-content-secondary hover:bg-surface-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSchedule}
                disabled={!scheduleDate || loading !== null}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50"
              >
                {t("actions.schedule")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface-primary rounded-xl border border-edge-primary p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-content-primary mb-4">
              {t("actions.complete")}
            </h3>
            <textarea
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder={t("detail.completionNotes")}
              rows={3}
              className="w-full p-3 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/40 mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-content-secondary hover:bg-surface-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleComplete}
                disabled={loading !== null}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
              >
                {t("actions.complete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
