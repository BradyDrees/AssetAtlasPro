"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { getVendorEstimates } from "@/app/actions/vendor-estimates";
import type { VendorEstimate } from "@/lib/vendor/estimate-types";
import type { EstimateStatus } from "@/lib/vendor/types";
import { EstimateCard } from "@/components/vendor/estimate-card";

const ACTIVE_STATUSES: EstimateStatus[] = [
  "draft",
  "sent",
  "pm_reviewing",
  "with_owner",
  "changes_requested",
];

const CLOSED_STATUSES: EstimateStatus[] = ["approved", "declined", "expired"];

export default function VendorEstimatesPage() {
  const t = useTranslations("vendor.estimates");
  const [estimates, setEstimates] = useState<VendorEstimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "closed">("active");

  const load = useCallback(async () => {
    setLoading(true);
    const statuses = tab === "active" ? ACTIVE_STATUSES : CLOSED_STATUSES;
    const { data } = await getVendorEstimates({ status: statuses });
    setEstimates(data);
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-content-primary">
          {t("title")}
        </h1>
        <Link
          href="/vendor/estimates/new"
          className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-500 transition-colors flex items-center gap-1.5"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          {t("new")}
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-secondary rounded-lg p-1">
        <button
          onClick={() => setTab("active")}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "active"
              ? "bg-surface-primary text-content-primary shadow-sm"
              : "text-content-tertiary hover:text-content-secondary"
          }`}
        >
          {t("active")}
        </button>
        <button
          onClick={() => setTab("closed")}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "closed"
              ? "bg-surface-primary text-content-primary shadow-sm"
              : "text-content-tertiary hover:text-content-secondary"
          }`}
        >
          {t("closed")}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-surface-primary rounded-xl border border-edge-primary p-4 animate-pulse"
            >
              <div className="h-4 bg-surface-secondary rounded w-3/4 mb-2" />
              <div className="h-3 bg-surface-secondary rounded w-1/2 mb-3" />
              <div className="h-3 bg-surface-secondary rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : estimates.length === 0 ? (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
          <svg
            className="w-12 h-12 text-content-quaternary mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z"
            />
          </svg>
          <p className="text-content-tertiary">{t("noEstimates")}</p>
          {tab === "active" && (
            <Link
              href="/vendor/estimates/new"
              className="inline-flex items-center gap-1.5 mt-3 text-sm text-brand-400 hover:text-brand-300 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              {t("createFirst")}
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {estimates.map((est) => (
            <EstimateCard key={est.id} estimate={est} />
          ))}
        </div>
      )}
    </div>
  );
}
