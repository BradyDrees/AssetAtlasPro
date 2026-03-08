"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { RecurringInvoiceTemplate } from "@/lib/vendor/recurring-invoice-types";
import {
  pauseRecurringTemplate,
  resumeRecurringTemplate,
  cancelRecurringTemplate,
  generateInvoiceFromTemplate,
} from "@/app/actions/vendor-recurring-invoices";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  paused: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

interface RecurringInvoiceCardProps {
  template: RecurringInvoiceTemplate;
  onMutate: () => void;
  basePath: string;
}

export function RecurringInvoiceCard({ template, onMutate, basePath }: RecurringInvoiceCardProps) {
  const t = useTranslations("vendor.recurring");
  const [loading, setLoading] = useState<string | null>(null);

  async function handleAction(action: "pause" | "resume" | "cancel" | "generate") {
    setLoading(action);
    let result: { error?: string; data?: { invoiceId: string } };

    switch (action) {
      case "pause":
        result = await pauseRecurringTemplate(template.id);
        break;
      case "resume":
        result = await resumeRecurringTemplate(template.id);
        break;
      case "cancel":
        result = await cancelRecurringTemplate(template.id);
        break;
      case "generate":
        result = await generateInvoiceFromTemplate(template.id);
        break;
    }

    setLoading(null);
    if (result.error) {
      alert(result.error);
    } else {
      onMutate();
    }
  }

  const nextDue = new Date(template.next_due + "T00:00:00");
  const isOverdue = template.status === "active" && nextDue < new Date();

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-sm font-semibold text-content-primary truncate">
              {template.title}
            </h3>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                STATUS_COLORS[template.status] || STATUS_COLORS.active
              }`}
            >
              {t(`status.${template.status}`)}
            </span>
          </div>

          {template.property_name && (
            <p className="text-xs text-content-tertiary">{template.property_name}</p>
          )}

          <div className="flex items-center gap-4 mt-2 text-xs text-content-secondary">
            <span className="font-medium text-content-primary text-sm">
              ${Number(template.total).toLocaleString()}
            </span>
            <span>{t(`frequency.${template.frequency}`)}</span>
            <span className={isOverdue ? "text-red-400 font-medium" : ""}>
              {t("nextDue")}: {nextDue.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </span>
            {template.last_generated && (
              <span className="text-content-quaternary">
                {t("lastGenerated")}: {new Date(template.last_generated + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            )}
          </div>

          {/* Items preview */}
          {template.items.length > 0 && (
            <p className="text-xs text-content-quaternary mt-1">
              {template.items.length} {t("items")}
            </p>
          )}
        </div>

        {/* Total badge */}
        <div className="text-right flex-shrink-0">
          <p className="text-lg font-bold text-brand-400">
            ${Number(template.total).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-edge-secondary">
        {template.status === "active" && (
          <>
            <button
              onClick={() => handleAction("generate")}
              disabled={loading !== null}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 transition-colors"
            >
              {loading === "generate" ? "..." : t("generateNow")}
            </button>
            <button
              onClick={() => handleAction("pause")}
              disabled={loading !== null}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 hover:bg-yellow-400/20 disabled:opacity-50 transition-colors"
            >
              {loading === "pause" ? "..." : t("pause")}
            </button>
          </>
        )}

        {template.status === "paused" && (
          <button
            onClick={() => handleAction("resume")}
            disabled={loading !== null}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-green-400 bg-green-400/10 border border-green-400/20 hover:bg-green-400/20 disabled:opacity-50 transition-colors"
          >
            {loading === "resume" ? "..." : t("resume")}
          </button>
        )}

        {template.status !== "cancelled" && (
          <button
            onClick={() => handleAction("cancel")}
            disabled={loading !== null}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-400/10 border border-red-400/20 hover:bg-red-400/20 disabled:opacity-50 transition-colors"
          >
            {loading === "cancel" ? "..." : t("cancel")}
          </button>
        )}
      </div>
    </div>
  );
}
