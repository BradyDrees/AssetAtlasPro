"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { getJobProfitability } from "@/app/actions/vendor-job-profitability";
import type { JobProfitability } from "@/app/actions/vendor-job-profitability";

interface JobProfitabilityCardProps {
  woId: string;
  woStatus: string;
}

const SHOW_STATUSES = ["completed", "invoiced", "paid"];

export function JobProfitabilityCard({ woId, woStatus }: JobProfitabilityCardProps) {
  const t = useTranslations("vendor.jobs.profitability");
  const [data, setData] = useState<JobProfitability | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  const shouldShow = SHOW_STATUSES.includes(woStatus);

  useEffect(() => {
    if (!shouldShow) {
      setLoading(false);
      return;
    }
    async function load() {
      const res = await getJobProfitability(woId);
      if (res.data) setData(res.data);
      setLoading(false);
    }
    load();
  }, [woId, shouldShow]);

  if (!shouldShow || loading || !data) return null;

  // Don't show if no financial data at all
  if (data.revenue === 0 && data.total_cost === 0) return null;

  const isPositive = data.profit >= 0;
  const profitColor = isPositive ? "text-green-500" : "text-red-500";
  const profitBg = isPositive
    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";

  const fmt = (n: number) =>
    `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-secondary transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-brand-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
            />
          </svg>
          <span className="text-sm font-medium text-content-primary">{t("title")}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${profitColor}`}>
            {fmt(data.profit)}
          </span>
          <svg
            className={`w-4 h-4 text-content-quaternary transition-transform ${
              collapsed ? "" : "rotate-180"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
            />
          </svg>
        </div>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-3 border-t border-edge-primary pt-3">
          {/* Revenue bar */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-content-tertiary">{t("revenue")}</span>
            <span className="text-sm font-semibold text-green-500">{fmt(data.revenue)}</span>
          </div>

          {/* Cost breakdown */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-content-quaternary">{t("materials")}</span>
              <span className="text-xs text-content-secondary">-{fmt(data.material_cost)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-content-quaternary">{t("labor")}</span>
              <span className="text-xs text-content-secondary">-{fmt(data.labor_cost)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-content-quaternary">{t("expenses")}</span>
              <span className="text-xs text-content-secondary">-{fmt(data.expense_cost)}</span>
            </div>
          </div>

          {/* Profit summary */}
          <div className={`rounded-lg border p-3 ${profitBg}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-content-primary">{t("profit")}</span>
              <span className={`text-lg font-bold ${profitColor}`}>{fmt(data.profit)}</span>
            </div>
            {data.margin_pct !== null && (
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-content-tertiary">{t("margin")}</span>
                <span className={`text-xs font-semibold ${profitColor}`}>
                  {data.margin_pct}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
