"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { VendorReviewCard } from "./vendor-review-card";
import type { OrgReview, ReviewAnalytics } from "@/app/actions/vendor-reviews";

interface Props {
  reviews: OrgReview[];
  total: number;
  analytics: ReviewAnalytics | null;
}

type FilterTab = "all" | "needs_response" | "responded";

export function VendorReviewsPage({ reviews, total, analytics }: Props) {
  const t = useTranslations("vendor.reviews");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const filtered = reviews.filter((r) => {
    if (activeTab === "needs_response") return r.vendor_response === null;
    if (activeTab === "responded") return r.vendor_response !== null;
    return true;
  });

  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: "all", label: t("filterAll"), count: total },
    {
      key: "needs_response",
      label: t("filterNeedsResponse"),
      count: analytics?.unresponded_count ?? 0,
    },
    {
      key: "responded",
      label: t("filterResponded"),
      count: total - (analytics?.unresponded_count ?? 0),
    },
  ];

  const maxDistribution = analytics
    ? Math.max(...Object.values(analytics.distribution), 1)
    : 1;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <h1 className="text-xl font-bold text-content-primary">{t("title")}</h1>

      {/* Stats bar */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Avg rating */}
          <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-content-primary">
                {analytics.avg_rating != null
                  ? analytics.avg_rating.toFixed(1)
                  : "—"}
              </span>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((s) => (
                  <svg
                    key={s}
                    className={`w-4 h-4 ${
                      analytics.avg_rating != null && s <= Math.round(analytics.avg_rating)
                        ? "text-yellow-400"
                        : "text-content-quaternary/30"
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.3-3.957z" />
                  </svg>
                ))}
              </div>
            </div>
            <p className="text-xs text-content-quaternary mt-1">{t("avgRating")}</p>
          </div>

          {/* Total reviews */}
          <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
            <p className="text-2xl font-bold text-content-primary">
              {analytics.total_reviews}
            </p>
            <p className="text-xs text-content-quaternary mt-1">{t("totalReviews")}</p>
          </div>

          {/* Response rate */}
          <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
            <p className="text-2xl font-bold text-content-primary">
              {analytics.response_rate}%
            </p>
            <p className="text-xs text-content-quaternary mt-1">{t("responseRate")}</p>
          </div>

          {/* Unresponded */}
          <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
            <p
              className={`text-2xl font-bold ${
                analytics.unresponded_count > 0
                  ? "text-amber-400"
                  : "text-green-400"
              }`}
            >
              {analytics.unresponded_count}
            </p>
            <p className="text-xs text-content-quaternary mt-1">{t("needsResponse")}</p>
          </div>
        </div>
      )}

      {/* Star distribution (last 6 months) */}
      {analytics && analytics.total_reviews > 0 && (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
          <h3 className="text-sm font-semibold text-content-primary mb-3">
            {t("distribution")}
            <span className="text-content-quaternary font-normal ml-2 text-xs">
              ({t("last6Months")})
            </span>
          </h3>
          <div className="space-y-2">
            {([5, 4, 3, 2, 1] as const).map((star) => (
              <div key={star} className="flex items-center gap-2">
                <span className="text-xs text-content-tertiary w-12">
                  {star} {t("stars")}
                </span>
                <div className="flex-1 h-3 bg-surface-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all"
                    style={{
                      width: `${(analytics.distribution[star] / maxDistribution) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-content-quaternary w-8 text-right">
                  {analytics.distribution[star]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-edge-primary">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-brand-400 text-brand-400"
                : "border-transparent text-content-tertiary hover:text-content-secondary"
            }`}
          >
            {tab.label}
            {tab.count != null && (
              <span className="ml-1.5 text-xs text-content-quaternary">
                ({tab.count})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Review list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-content-quaternary">
          <p>{activeTab === "all" ? t("noReviewsYet") : t("noReviews")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((review) => (
            <VendorReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}
