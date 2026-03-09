"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReviewAnalytics } from "@/app/actions/vendor-reviews";

interface Props {
  analytics: ReviewAnalytics;
}

export function DashboardReviewsWidget({ analytics }: Props) {
  const t = useTranslations("vendor.reviews");

  const maxDistribution = Math.max(...Object.values(analytics.distribution), 1);

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-content-primary">{t("title")}</h2>
        <Link
          href="/vendor/reviews"
          className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
        >
          {t("viewAll")}
        </Link>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <span className="text-xl font-bold text-content-primary">
              {analytics.avg_rating != null ? analytics.avg_rating.toFixed(1) : "—"}
            </span>
            <span className="text-yellow-400 text-sm">★</span>
          </div>
          <p className="text-[10px] text-content-quaternary mt-0.5">{t("avgRating")}</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-content-primary">{analytics.total_reviews}</p>
          <p className="text-[10px] text-content-quaternary mt-0.5">{t("totalReviews")}</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-content-primary">{analytics.response_rate}%</p>
          <p className="text-[10px] text-content-quaternary mt-0.5">{t("responseRate")}</p>
        </div>
      </div>

      {/* Distribution bars (last 6 months) */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-content-quaternary mb-1">{t("last6Months")}</p>
        {([5, 4, 3, 2, 1] as const).map((star) => (
          <div key={star} className="flex items-center gap-1.5">
            <span className="text-[10px] text-content-quaternary w-5 text-right">{star}★</span>
            <div className="flex-1 h-2 bg-surface-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all"
                style={{
                  width: `${(analytics.distribution[star] / maxDistribution) * 100}%`,
                }}
              />
            </div>
            <span className="text-[10px] text-content-quaternary w-5">{analytics.distribution[star]}</span>
          </div>
        ))}
      </div>

      {/* Unresponded badge */}
      {analytics.unresponded_count > 0 && (
        <Link
          href="/vendor/reviews"
          className="mt-3 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-colors"
        >
          <span>{analytics.unresponded_count} {t("needsResponse")}</span>
        </Link>
      )}
    </div>
  );
}
