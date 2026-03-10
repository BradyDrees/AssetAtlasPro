"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { getVendorScorecard } from "@/app/actions/vendor-scorecard";
import type { VendorScorecardData, MonthlyTrendBucket } from "@/lib/vendor/scorecard-types";

interface VendorScorecardProps {
  vendorOrgId: string;
  /** If provided, skips the fetch and uses this data directly */
  initialData?: VendorScorecardData | null;
}

function StarRating({ rating }: { rating: number }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const fill = rating >= i ? 1 : rating >= i - 0.5 ? 0.5 : 0;
    stars.push(
      <svg key={i} className="w-4 h-4" viewBox="0 0 20 20">
        <defs>
          <linearGradient id={`star-grad-${i}`}>
            <stop offset={`${fill * 100}%`} stopColor="#facc15" />
            <stop offset={`${fill * 100}%`} stopColor="#374151" />
          </linearGradient>
        </defs>
        <path
          fill={`url(#star-grad-${i})`}
          d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
        />
      </svg>
    );
  }
  return <div className="flex gap-0.5">{stars}</div>;
}

function ConfidenceBar({ score }: { score: number }) {
  const color =
    score >= 70 ? "bg-green-500" : score >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="w-full bg-surface-tertiary rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(100, score)}%` }}
      />
    </div>
  );
}

/** Mini sparkline chart for monthly trend */
function TrendSparkline({ trend }: { trend: MonthlyTrendBucket[] }) {
  const t = useTranslations("vendor.clients.scorecard");
  const maxRating = 5;
  const barHeight = 48;
  const hasAnyData = trend.some((b) => b.review_count > 0);

  if (!hasAnyData) {
    return (
      <p className="text-xs text-content-quaternary text-center py-2">
        {t("noTrendData")}
      </p>
    );
  }

  return (
    <div>
      <p className="text-xs text-content-tertiary mb-2">{t("monthlyTrend")}</p>
      <div className="flex items-end gap-1.5">
        {trend.map((bucket) => {
          const pct = bucket.avg_rating != null ? (bucket.avg_rating / maxRating) * 100 : 0;
          const height = bucket.avg_rating != null ? Math.max(4, (pct / 100) * barHeight) : 4;
          const color =
            bucket.avg_rating == null
              ? "bg-surface-tertiary"
              : bucket.avg_rating >= 4
                ? "bg-green-500"
                : bucket.avg_rating >= 3
                  ? "bg-yellow-500"
                  : "bg-red-500";

          return (
            <div key={bucket.month} className="flex-1 flex flex-col items-center gap-1">
              <div className="relative w-full flex justify-center" style={{ height: barHeight }}>
                <div
                  className={`w-full max-w-[20px] rounded-sm transition-all ${color}`}
                  style={{ height, position: "absolute", bottom: 0 }}
                  title={
                    bucket.avg_rating != null
                      ? `${bucket.label}: ${bucket.avg_rating} avg (${bucket.review_count} ${t("reviews")})`
                      : `${bucket.label}: ${t("noData")}`
                  }
                />
              </div>
              <span className="text-[10px] text-content-quaternary">{bucket.label}</span>
              {bucket.avg_rating != null && (
                <span className="text-[10px] font-medium text-content-tertiary">
                  {bucket.avg_rating.toFixed(1)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function VendorScorecard({ vendorOrgId, initialData }: VendorScorecardProps) {
  const t = useTranslations("vendor.clients.scorecard");
  const [data, setData] = useState<VendorScorecardData | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    if (initialData) return;
    async function load() {
      const res = await getVendorScorecard(vendorOrgId);
      if (res.data) setData(res.data);
      setLoading(false);
    }
    load();
  }, [vendorOrgId, initialData]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-2 p-4">
        <div className="h-4 bg-surface-secondary rounded w-1/2" />
        <div className="h-3 bg-surface-secondary rounded w-3/4" />
        <div className="h-3 bg-surface-secondary rounded w-1/3" />
      </div>
    );
  }

  if (!data) return null;

  const formatResponseTime = (label: string | null) => {
    switch (label) {
      case "same_day": return t("sameDay");
      case "next_day": return t("nextDay");
      case "within_48hrs": return t("within48");
      default: return t("noData");
    }
  };

  return (
    <div className="space-y-3 p-4">
      {/* Rating + Wilson */}
      <div className="flex items-center gap-3">
        {data.avg_rating != null ? (
          <>
            <StarRating rating={data.avg_rating} />
            <span className="text-sm font-semibold text-content-primary">
              {data.avg_rating.toFixed(1)}
            </span>
            <span className="text-xs text-content-quaternary">
              ({data.total_ratings} {t("reviews")})
            </span>
          </>
        ) : (
          <span className="text-xs text-content-quaternary">{t("noRatings")}</span>
        )}
      </div>

      {/* Wilson confidence */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-content-tertiary">{t("confidence")}</span>
          <span className="text-xs font-semibold text-content-primary">{data.wilson_score}%</span>
        </div>
        <ConfidenceBar score={data.wilson_score} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-surface-secondary rounded-lg px-3 py-2">
          <p className="text-lg font-bold text-content-primary">{data.total_jobs}</p>
          <p className="text-xs text-content-quaternary">{t("totalJobs")}</p>
        </div>
        <div className="bg-surface-secondary rounded-lg px-3 py-2">
          <p className="text-lg font-bold text-content-primary">{data.monthly_jobs}</p>
          <p className="text-xs text-content-quaternary">{t("thisMonth")}</p>
        </div>
      </div>

      {/* Monthly trend sparkline */}
      {data.monthly_trend && data.monthly_trend.length > 0 && (
        <div className="bg-surface-secondary rounded-lg p-3">
          <TrendSparkline trend={data.monthly_trend} />
        </div>
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        {/* Response time */}
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {formatResponseTime(data.response_time_label)}
        </span>

        {/* Emergency */}
        {data.handles_emergency && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
            </svg>
            {t("emergency")}
          </span>
        )}

        {/* On-time */}
        {data.on_time_pct != null && (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            data.on_time_pct >= 80
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
          }`}>
            {data.on_time_pct}% {t("onTime")}
          </span>
        )}

        {/* Estimate accuracy */}
        {data.estimate_accuracy_pct != null && (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            data.estimate_accuracy_pct >= 85
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
          }`}>
            {data.estimate_accuracy_pct}% {t("accuracy")}
          </span>
        )}

        {/* Dispute rate */}
        {data.dispute_rate != null && (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            data.dispute_rate <= 5
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : data.dispute_rate <= 15
                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {data.dispute_rate}% {t("disputeRate")}
          </span>
        )}

        {/* Callback rate */}
        {data.callback_rate != null && (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            data.callback_rate <= 5
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : data.callback_rate <= 15
                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
            {data.callback_rate}% {t("callbackRate")}
          </span>
        )}
      </div>
    </div>
  );
}
