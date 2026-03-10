"use client";

import { useState, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  getSubcontractors,
  assignSubToWo,
  type SubContractor,
} from "@/app/actions/vendor-subcontractors";

interface SubAssignmentModalProps {
  workOrderId: string;
  onClose: () => void;
  onAssigned: () => void;
}

export function SubAssignmentModal({
  workOrderId,
  onClose,
  onAssigned,
}: SubAssignmentModalProps) {
  const t = useTranslations("vendor.workers");
  const [subs, setSubs] = useState<SubContractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [rateType, setRateType] = useState<"hourly" | "flat">("hourly");
  const [rate, setRate] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const result = await getSubcontractors();
      setSubs(result.data);
      setLoading(false);
    }
    load();
  }, []);

  const handleAssign = () => {
    if (!selectedSubId) return;
    setError(null);

    startTransition(async () => {
      const rateValue = rate ? parseFloat(rate) : undefined;
      const result = await assignSubToWo({
        workOrderId,
        subUserId: selectedSubId,
        ...(rateType === "hourly"
          ? { hourlyRate: rateValue }
          : { flatRate: rateValue }),
        notes: notes || undefined,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      onAssigned();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface-primary rounded-xl border border-edge-primary w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-edge-primary">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-content-primary">
              {t("sub.assignTitle")}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 text-content-tertiary hover:text-content-primary transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Select subcontractor */}
          <div>
            <label className="text-sm font-medium text-content-secondary block mb-2">
              {t("sub.selectSub")}
            </label>
            {loading ? (
              <div className="animate-pulse bg-surface-secondary rounded-lg h-10" />
            ) : subs.length === 0 ? (
              <p className="text-xs text-content-tertiary">{t("sub.noSubs")}</p>
            ) : (
              <div className="space-y-2">
                {subs.map((sub) => {
                  const name = [sub.first_name, sub.last_name].filter(Boolean).join(" ") || "Unnamed";
                  const isSelected = selectedSubId === sub.user_id;

                  return (
                    <button
                      key={sub.id}
                      onClick={() => setSelectedSubId(sub.user_id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? "border-brand-500 bg-brand-500/10"
                          : "border-edge-secondary bg-surface-secondary hover:border-edge-primary"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          isSelected ? "bg-brand-500 text-white" : "bg-surface-tertiary text-content-tertiary"
                        }`}
                      >
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-content-primary truncate">
                          {name}
                        </p>
                        {sub.email && (
                          <p className="text-[10px] text-content-quaternary">{sub.email}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Rate */}
          <div>
            <label className="text-sm font-medium text-content-secondary block mb-2">
              {t("sub.rate")}
            </label>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setRateType("hourly")}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  rateType === "hourly"
                    ? "bg-brand-500 text-white"
                    : "bg-surface-secondary text-content-tertiary"
                }`}
              >
                {t("sub.hourly")}
              </button>
              <button
                onClick={() => setRateType("flat")}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  rateType === "flat"
                    ? "bg-brand-500 text-white"
                    : "bg-surface-secondary text-content-tertiary"
                }`}
              >
                {t("sub.flatRate")}
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-content-quaternary text-sm">$</span>
              <input
                type="number"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-4 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary placeholder:text-content-quaternary focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-content-secondary block mb-2">
              {t("sub.notes")}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("sub.notesPlaceholder")}
              rows={3}
              className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary placeholder:text-content-quaternary focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-edge-primary">
          {error && (
            <p className="text-xs text-red-400 mb-2">{error}</p>
          )}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-content-tertiary hover:text-content-primary transition-colors"
            >
              {t("cancel")}
            </button>
            <button
              onClick={handleAssign}
              disabled={!selectedSubId || isPending}
              className="px-4 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? t("sub.assigning") : t("sub.assign")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
