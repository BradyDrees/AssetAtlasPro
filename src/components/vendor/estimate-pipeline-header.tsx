"use client";

import { useTranslations } from "next-intl";
import { ESTIMATE_STATUS_COLORS } from "@/lib/vendor/estimate-types";
import type { EstimateStatus } from "@/lib/vendor/types";

interface PipelineStat {
  status: string;
  count: number;
  total: number;
}

interface EstimatePipelineHeaderProps {
  stats: PipelineStat[];
}

const STATUS_ORDER: EstimateStatus[] = [
  "draft",
  "sent",
  "pm_reviewing",
  "with_owner",
  "changes_requested",
  "approved",
  "declined",
  "expired",
];

export function EstimatePipelineHeader({ stats }: EstimatePipelineHeaderProps) {
  const t = useTranslations("vendor.estimates");

  const statsMap = new Map(stats.map((s) => [s.status, s]));
  const totalAll = stats.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 mb-4">
      <h3 className="text-sm font-semibold text-content-primary mb-3">
        {t("pipeline.title")}
      </h3>

      {/* Pipeline bar */}
      {totalAll > 0 && (
        <div className="flex h-2 rounded-full overflow-hidden mb-3 bg-surface-secondary">
          {STATUS_ORDER.map((status) => {
            const stat = statsMap.get(status);
            if (!stat || stat.total <= 0) return null;
            const pct = (stat.total / totalAll) * 100;
            const colorClass = ESTIMATE_STATUS_COLORS[status] || "";
            // Extract bg color from class
            const bgMatch = colorClass.match(/bg-(\w+)-\d+/);
            const bgColor = bgMatch ? `bg-${bgMatch[1]}-500` : "bg-gray-500";
            return (
              <div
                key={status}
                className={`${bgColor} transition-all`}
                style={{ width: `${pct}%` }}
                title={`${t(`status.${status}`)}: $${stat.total.toLocaleString()}`}
              />
            );
          })}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STATUS_ORDER.map((status) => {
          const stat = statsMap.get(status);
          if (!stat) return null;
          return (
            <div key={status} className="text-center">
              <span
                className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-medium mb-1 ${ESTIMATE_STATUS_COLORS[status]}`}
              >
                {t(`status.${status}`)}
              </span>
              <div className="text-sm font-semibold text-content-primary">
                {stat.count}
              </div>
              <div className="text-xs text-content-tertiary">
                ${stat.total.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
