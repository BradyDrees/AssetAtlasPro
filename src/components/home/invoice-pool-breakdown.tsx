"use client";

import { useTranslations } from "next-intl";

interface InvoicePoolBreakdownProps {
  invoiceTotal: number;
  poolBalance: number;
  poolDeduction: number;
  cardCharge: number;
}

/**
 * Reusable component showing maintenance pool / card split
 * for an invoice payment. Used in both PM and homeowner flows.
 */
export function InvoicePoolBreakdown({
  invoiceTotal,
  poolBalance,
  poolDeduction,
  cardCharge,
}: InvoicePoolBreakdownProps) {
  const t = useTranslations("home.workOrders");

  const poolCoversAll = cardCharge <= 0;

  return (
    <div className="bg-surface-secondary rounded-lg p-4 space-y-3">
      {/* Invoice total */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-content-secondary">{t("estimateTotal")}</span>
        <span className="text-sm font-semibold text-content-primary">
          ${invoiceTotal.toFixed(2)}
        </span>
      </div>

      {/* Pool balance available */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-content-secondary">{t("poolBalance")}</span>
        <span className="text-sm text-content-tertiary">
          ${poolBalance.toFixed(2)}
        </span>
      </div>

      <div className="border-t border-edge-secondary pt-3 space-y-2">
        {/* Pool deduction */}
        {poolDeduction > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-green-400">{t("poolUsed")}</span>
            <span className="text-sm font-medium text-green-400">
              -${poolDeduction.toFixed(2)}
            </span>
          </div>
        )}

        {/* Card charge */}
        {!poolCoversAll && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-content-primary font-medium">{t("cardCharged")}</span>
            <span className="text-sm font-semibold text-content-primary">
              ${cardCharge.toFixed(2)}
            </span>
          </div>
        )}

        {/* Fully covered badge */}
        {poolCoversAll && (
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
            <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs text-green-400 font-medium">{t("poolCoversAll")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
