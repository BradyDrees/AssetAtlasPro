"use client";

import { useTranslations } from "next-intl";

interface EstimateSummaryProps {
  subtotal: number;
  markupPct: number;
  markupAmount: number;
  taxPct: number;
  taxAmount: number;
  total: number;
  onMarkupPctChange?: (pct: number) => void;
  onTaxPctChange?: (pct: number) => void;
  readOnly?: boolean;
}

function formatCurrency(value: number): string {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function EstimateSummary({
  subtotal,
  markupPct,
  markupAmount,
  taxPct,
  taxAmount,
  total,
  onMarkupPctChange,
  onTaxPctChange,
  readOnly = false,
}: EstimateSummaryProps) {
  const t = useTranslations("vendor.estimates");

  return (
    <div className="bg-surface-secondary rounded-xl border border-edge-primary p-4">
      <h3 className="text-sm font-semibold text-content-primary mb-3">
        {t("summary")}
      </h3>

      <div className="space-y-2 text-sm">
        {/* Subtotal */}
        <div className="flex items-center justify-between">
          <span className="text-content-secondary">{t("subtotal")}</span>
          <span className="text-content-primary font-medium">
            ${formatCurrency(subtotal)}
          </span>
        </div>

        {/* Markup */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-content-secondary">{t("markup")}</span>
            {!readOnly ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={markupPct}
                  onChange={(e) =>
                    onMarkupPctChange?.(parseFloat(e.target.value) || 0)
                  }
                  className="w-16 px-1.5 py-0.5 text-xs text-center bg-surface-primary border border-edge-secondary rounded text-content-primary"
                />
                <span className="text-xs text-content-tertiary">%</span>
              </div>
            ) : (
              <span className="text-xs text-content-tertiary">
                ({markupPct}%)
              </span>
            )}
          </div>
          <span className="text-content-primary">
            ${formatCurrency(markupAmount)}
          </span>
        </div>

        {/* Tax */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-content-secondary">{t("tax")}</span>
            {!readOnly ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.25}
                  value={taxPct}
                  onChange={(e) =>
                    onTaxPctChange?.(parseFloat(e.target.value) || 0)
                  }
                  className="w-16 px-1.5 py-0.5 text-xs text-center bg-surface-primary border border-edge-secondary rounded text-content-primary"
                />
                <span className="text-xs text-content-tertiary">%</span>
              </div>
            ) : (
              <span className="text-xs text-content-tertiary">
                ({taxPct}%)
              </span>
            )}
          </div>
          <span className="text-content-primary">
            ${formatCurrency(taxAmount)}
          </span>
        </div>

        {/* Total */}
        <div className="border-t border-edge-secondary pt-2 mt-2 flex items-center justify-between">
          <span className="text-content-primary font-semibold">
            {t("total")}
          </span>
          <span className="text-lg font-bold text-brand-400">
            ${formatCurrency(total)}
          </span>
        </div>
      </div>
    </div>
  );
}
