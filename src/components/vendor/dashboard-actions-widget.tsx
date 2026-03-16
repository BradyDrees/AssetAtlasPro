"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import type { ActionSummary } from "@/lib/vendor/action-rules";
import { ActionItemCard } from "./action-item-card";

interface DashboardActionsWidgetProps {
  summary: ActionSummary;
}

export function DashboardActionsWidget({ summary }: DashboardActionsWidgetProps) {
  const t = useTranslations("vendor.actions");

  const { totalCount, criticalCount, highCount, topItems } = summary;

  // Badge color: red if critical, amber if high, green if clear
  const badgeColor =
    criticalCount > 0
      ? "bg-red-500/20 text-red-400 border-red-500/30"
      : highCount > 0
        ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
        : "bg-green-500/20 text-green-400 border-green-500/30";

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-content-primary">
            {t("widget.title")}
          </h2>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badgeColor}`}
          >
            {totalCount}
          </span>
        </div>
        <Link
          href="/pro/actions"
          className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors"
        >
          {t("widget.viewAll")} →
        </Link>
      </div>

      {/* Priority badges */}
      {(criticalCount > 0 || highCount > 0) && (
        <div className="flex items-center gap-2 px-4 pb-2">
          {criticalCount > 0 && (
            <span className="text-xs text-red-400">
              {t("widget.critical", { count: criticalCount })}
            </span>
          )}
          {highCount > 0 && (
            <span className="text-xs text-amber-400">
              {t("widget.high", { count: highCount })}
            </span>
          )}
        </div>
      )}

      {/* Item list */}
      {topItems.length > 0 ? (
        <div className="divide-y divide-edge-secondary">
          {topItems.map((item) => (
            <ActionItemCard key={item.taskKey} item={item} variant="compact" />
          ))}
        </div>
      ) : (
        <div className="p-6 text-center">
          <p className="text-sm text-content-tertiary">{t("widget.noItems")}</p>
        </div>
      )}
    </div>
  );
}
