"use client";

import { useTranslations } from "next-intl";
import type { VendorScorecardData, MonthlyTrendBucket } from "@/lib/vendor/scorecard-types";

interface DashboardPerformanceWidgetProps {
  data: VendorScorecardData;
}

function MiniTrend({ trend }: { trend: MonthlyTrendBucket[] }) {
  const t = useTranslations("vendor.dashboard");
  const maxRating = 5;
  const barHeight = 32;
  const hasData = trend.some((b) => b.review_count > 0);
  if (!hasData) {
    return <p className="text-xs text-content-quaternary">{t("noTrendData")}</p>;
  }

  return (
    <div className="flex items-end gap-1">
      {trend.map((bucket) => {
        const height = bucket.avg_rating != null ? Math.max(3, (bucket.avg_rating / maxRating) * barHeight) : 3;
        const color =
          bucket.avg_rating == null
            ? "bg-surface-tertiary"
            : bucket.avg_rating >= 4
              ? "bg-green-500"
              : bucket.avg_rating >= 3
                ? "bg-yellow-500"
                : "bg-red-500";

        return (
          <div key={bucket.month} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="relative w-full flex justify-center" style={{ height: barHeight }}>
              <div
                className={`w-full max-w-[14px] rounded-sm ${color}`}
                style={{ height, position: "absolute", bottom: 0 }}
              />
            </div>
            <span className="text-[9px] text-content-quaternary">{bucket.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function DashboardPerformanceWidget({ data }: DashboardPerformanceWidgetProps) {
  const t = useTranslations("vendor.dashboard");

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-5">
      <h2 className="text-base font-semibold text-content-primary mb-4">
        {t("yourPerformance")}
      </h2>

      {/* Key metrics row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="text-center">
          <p className="text-lg font-bold text-content-primary">
            {data.avg_rating != null ? data.avg_rating.toFixed(1) : "—"}
          </p>
          <p className="text-[10px] text-content-quaternary">{t("rating")}</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-content-primary">{data.wilson_score}%</p>
          <p className="text-[10px] text-content-quaternary">{t("confidence")}</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-content-primary">
            {data.on_time_pct != null ? `${data.on_time_pct}%` : "—"}
          </p>
          <p className="text-[10px] text-content-quaternary">{t("onTimeShort")}</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-content-primary">{data.total_jobs}</p>
          <p className="text-[10px] text-content-quaternary">{t("jobs")}</p>
        </div>
      </div>

      {/* Trend chart */}
      {data.monthly_trend && data.monthly_trend.length > 0 && (
        <div className="bg-surface-secondary rounded-lg p-3 mb-3">
          <p className="text-xs text-content-tertiary mb-2">{t("ratingTrend")}</p>
          <MiniTrend trend={data.monthly_trend} />
        </div>
      )}

      {/* Quality indicators */}
      <div className="flex flex-wrap gap-1.5">
        {data.estimate_accuracy_pct != null && (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
            data.estimate_accuracy_pct >= 85
              ? "bg-green-500/10 text-green-500"
              : "bg-yellow-500/10 text-yellow-500"
          }`}>
            {data.estimate_accuracy_pct}% {t("estAccuracy")}
          </span>
        )}
        {data.dispute_rate != null && (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
            data.dispute_rate <= 5
              ? "bg-green-500/10 text-green-500"
              : data.dispute_rate <= 15
                ? "bg-yellow-500/10 text-yellow-500"
                : "bg-red-500/10 text-red-500"
          }`}>
            {data.dispute_rate}% {t("disputes")}
          </span>
        )}
        {data.callback_rate != null && (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
            data.callback_rate <= 5
              ? "bg-green-500/10 text-green-500"
              : data.callback_rate <= 15
                ? "bg-yellow-500/10 text-yellow-500"
                : "bg-red-500/10 text-red-500"
          }`}>
            {data.callback_rate}% {t("callbacks")}
          </span>
        )}
      </div>
    </div>
  );
}
