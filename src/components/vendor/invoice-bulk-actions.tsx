"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { bulkInvoiceAction } from "@/app/actions/vendor-invoices";

interface InvoiceBulkActionsProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onActionComplete: () => void;
}

export function InvoiceBulkActions({
  selectedIds,
  onClearSelection,
  onActionComplete,
}: InvoiceBulkActionsProps) {
  const t = useTranslations("vendor.invoices");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (selectedIds.length === 0) return null;

  const handleAction = (action: "send" | "remind") => {
    startTransition(async () => {
      setMessage(null);
      const result = await bulkInvoiceAction(selectedIds, action);
      if (result.error) {
        setMessage(result.error);
      } else {
        setMessage(
          action === "send"
            ? t("bulk.invoicesSent", { count: result.processed })
            : t("bulk.remindersSent", { count: result.processed })
        );
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
            onClick={() => handleAction("send")}
            disabled={isPending}
            className="px-3 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {t("bulk.sendDrafts")}
          </button>
          <button
            type="button"
            onClick={() => handleAction("remind")}
            disabled={isPending}
            className="px-3 py-2 bg-surface-secondary border border-edge-primary text-content-secondary text-sm rounded-lg hover:text-content-primary transition-colors disabled:opacity-50"
          >
            {t("bulk.sendReminder")}
          </button>
        </div>
      </div>
    </div>
  );
}
