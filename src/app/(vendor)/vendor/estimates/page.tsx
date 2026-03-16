"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { getVendorEstimates } from "@/app/actions/vendor-estimates";
import type { VendorEstimate } from "@/lib/vendor/estimate-types";
import type { EstimateStatus } from "@/lib/vendor/types";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
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
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <Link
            href="/vendor/estimates/new"
            className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-500 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t("new")}
          </Link>
        }
      />

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
        <EmptyState
          icon="calculator"
          title={t("noEstimates")}
          subtitle={t("emptySubtitle")}
          action={tab === "active" ? { label: t("createFirst"), href: "/vendor/estimates/new" } : undefined}
        />
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
