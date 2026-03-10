"use client";

import { useTranslations } from "next-intl";

interface FinancingBadgeProps {
  /** Whether financing is available for this estimate */
  available: boolean;
  /** Compact mode for list views */
  compact?: boolean;
}

/**
 * "Financing Available" badge displayed on estimates.
 * Only renders when financing is configured and available.
 */
export function FinancingBadge({ available, compact }: FinancingBadgeProps) {
  const t = useTranslations("vendor.estimates");

  if (!available) return null;

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
        </svg>
        {t("financingAvailable")}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
      <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
      <div>
        <p className="text-xs font-medium text-emerald-400">
          {t("financingAvailable")}
        </p>
        <p className="text-[10px] text-content-quaternary">
          {t("financingDesc")}
        </p>
      </div>
    </div>
  );
}
