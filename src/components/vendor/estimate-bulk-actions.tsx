"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { sendEstimateReminder } from "@/app/actions/vendor-estimates";

interface EstimateBulkActionsProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onActionComplete: () => void;
}

export function EstimateBulkActions({
  selectedIds,
  onClearSelection,
  onActionComplete,
}: EstimateBulkActionsProps) {
  const t = useTranslations("vendor.estimates");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (selectedIds.length === 0) return null;

  const handleRemind = () => {
    startTransition(async () => {
      setMessage(null);
      const result = await sendEstimateReminder(selectedIds);
      if (result.error) {
        setMessage(result.error);
      } else {
        setMessage(t("bulk.remindersSent", { count: result.sent }));
        setTimeout(() => {
          onClearSelection();
          onActionComplete();
          setMessage(null);
        }, 2000);
      }
    });
  };

  return (
    <div className="sticky bottom-16 md:bottom-0 z-40 bg-surface-secondary/95 backdrop-blur-sm border-t border-edge-primary px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-content-secondary">
            {t("bulk.selected", { count: selectedIds.length })}
          </span>
          <button
            type="button"
            onClick={onClearSelection}
            className="text-sm text-content-tertiary hover:text-content-primary"
          >
            {t("bulk.clearSelection")}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {message && (
            <span className="text-xs text-content-secondary">{message}</span>
          )}
          <button
            type="button"
            onClick={handleRemind}
            disabled={isPending}
            className="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {isPending ? t("bulk.sending") : t("bulk.sendReminder")}
          </button>
        </div>
      </div>
    </div>
  );
}
