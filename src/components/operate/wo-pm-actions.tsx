"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { pmTransitionWorkOrder, rescheduleJobAsPm } from "@/app/actions/pm-work-orders";
import type { WoStatus } from "@/lib/vendor/types";

interface WoPmActionsProps {
  woId: string;
  currentStatus: WoStatus;
}

// PM-accessible transitions per status
const PM_ACTIONS: Record<string, { status: WoStatus; color: string; needsModal?: string }[]> = {
  assigned: [
    { status: "on_hold", color: "bg-gray-600 hover:bg-gray-700" },
    { status: "cancelled", color: "bg-red-600 hover:bg-red-700" },
  ],
  accepted: [
    { status: "scheduled", color: "bg-purple-600 hover:bg-purple-700", needsModal: "schedule" },
    { status: "on_hold", color: "bg-gray-600 hover:bg-gray-700" },
    { status: "cancelled", color: "bg-red-600 hover:bg-red-700" },
  ],
  scheduled: [
    { status: "on_hold", color: "bg-gray-600 hover:bg-gray-700" },
    { status: "cancelled", color: "bg-red-600 hover:bg-red-700" },
  ],
  en_route: [
    { status: "on_hold", color: "bg-gray-600 hover:bg-gray-700" },
  ],
  on_site: [
    { status: "on_hold", color: "bg-gray-600 hover:bg-gray-700" },
  ],
  in_progress: [
    { status: "on_hold", color: "bg-gray-600 hover:bg-gray-700" },
  ],
  done_pending_approval: [
    { status: "completed", color: "bg-green-600 hover:bg-green-700" },
    { status: "in_progress", color: "bg-yellow-600 hover:bg-yellow-700" },
  ],
  declined: [
    { status: "assigned", color: "bg-blue-600 hover:bg-blue-700" },
    { status: "cancelled", color: "bg-red-600 hover:bg-red-700" },
  ],
  on_hold: [
    { status: "accepted", color: "bg-cyan-600 hover:bg-cyan-700" },
    { status: "assigned", color: "bg-blue-600 hover:bg-blue-700" },
    { status: "cancelled", color: "bg-red-600 hover:bg-red-700" },
  ],
  invoiced: [
    { status: "paid", color: "bg-emerald-600 hover:bg-emerald-700" },
  ],
};

export function WoPmActions({ woId, currentStatus }: WoPmActionsProps) {
  const t = useTranslations("operate.workOrders");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showSchedule, setShowSchedule] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [schedDate, setSchedDate] = useState("");
  const [schedStart, setSchedStart] = useState("");
  const [schedEnd, setSchedEnd] = useState("");
  const [error, setError] = useState<string | null>(null);

  const actions = PM_ACTIONS[currentStatus] ?? [];

  const handleTransition = (newStatus: WoStatus, needsModal?: string) => {
    if (needsModal === "schedule") {
      setShowSchedule(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await pmTransitionWorkOrder(woId, newStatus);
      if (res.error) {
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  };

  const handleScheduleSubmit = () => {
    if (!schedDate) return;
    setError(null);
    startTransition(async () => {
      const res = await pmTransitionWorkOrder(woId, "scheduled", {
        scheduledDate: schedDate,
        scheduledTimeStart: schedStart || undefined,
        scheduledTimeEnd: schedEnd || undefined,
      });
      if (res.error) {
        setError(res.error);
      } else {
        setShowSchedule(false);
        router.refresh();
      }
    });
  };

  const handleRescheduleSubmit = () => {
    if (!schedDate) return;
    setError(null);
    startTransition(async () => {
      const res = await rescheduleJobAsPm(woId, schedDate, schedStart, schedEnd);
      if (res.error) {
        setError(res.error);
      } else {
        setShowReschedule(false);
        router.refresh();
      }
    });
  };

  const canReschedule = ["accepted", "scheduled"].includes(currentStatus);
  const isTerminal = ["completed", "paid", "cancelled"].includes(currentStatus);

  if (isTerminal && actions.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a.status}
            disabled={isPending}
            onClick={() => handleTransition(a.status, a.needsModal)}
            className={`px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors disabled:opacity-50 ${a.color}`}
          >
            {t(`actions.${a.status}`)}
          </button>
        ))}
        {canReschedule && (
          <button
            disabled={isPending}
            onClick={() => setShowReschedule(true)}
            className="px-3 py-1.5 text-xs font-semibold text-content-primary bg-surface-tertiary rounded-lg hover:bg-surface-secondary transition-colors disabled:opacity-50"
          >
            {t("actions.reschedule")}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {/* Schedule modal */}
      {(showSchedule || showReschedule) && (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 space-y-3">
          <h3 className="text-sm font-semibold text-content-primary">
            {showReschedule ? t("actions.reschedule") : t("actions.scheduled")}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-content-quaternary">{t("scheduleDate")}</label>
              <input
                type="date"
                value={schedDate}
                onChange={(e) => setSchedDate(e.target.value)}
                className="w-full mt-0.5 px-2.5 py-1.5 text-sm bg-surface-secondary border border-edge-primary rounded-lg text-content-primary"
              />
            </div>
            <div>
              <label className="text-xs text-content-quaternary">{t("scheduleStart")}</label>
              <input
                type="time"
                value={schedStart}
                onChange={(e) => setSchedStart(e.target.value)}
                className="w-full mt-0.5 px-2.5 py-1.5 text-sm bg-surface-secondary border border-edge-primary rounded-lg text-content-primary"
              />
            </div>
            <div>
              <label className="text-xs text-content-quaternary">{t("scheduleEnd")}</label>
              <input
                type="time"
                value={schedEnd}
                onChange={(e) => setSchedEnd(e.target.value)}
                className="w-full mt-0.5 px-2.5 py-1.5 text-sm bg-surface-secondary border border-edge-primary rounded-lg text-content-primary"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              disabled={isPending || !schedDate}
              onClick={showReschedule ? handleRescheduleSubmit : handleScheduleSubmit}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {t("actions.confirm")}
            </button>
            <button
              onClick={() => { setShowSchedule(false); setShowReschedule(false); }}
              className="px-3 py-1.5 text-xs font-semibold text-content-tertiary bg-surface-tertiary rounded-lg hover:bg-surface-secondary transition-colors"
            >
              {t("actions.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
