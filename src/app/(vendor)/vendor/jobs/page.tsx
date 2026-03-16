"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { getVendorWorkOrders } from "@/app/actions/vendor-work-orders";
import type { VendorWorkOrder } from "@/lib/vendor/work-order-types";
import type { WoStatus } from "@/lib/vendor/types";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { JobCard } from "@/components/vendor/job-card";
import {
  WorkOrderFilters,
  TAB_STATUS_MAP,
} from "@/components/vendor/work-order-filters";
import { NewJobModal } from "@/components/vendor/new-job-modal";

export default function VendorJobsPage() {
  const t = useTranslations("vendor.jobs");
  const [workOrders, setWorkOrders] = useState<VendorWorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "incoming" | "active" | "completed" | "all"
  >("incoming");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewJob, setShowNewJob] = useState(false);

  const loadWorkOrders = useCallback(async () => {
    setLoading(true);
    const statuses = TAB_STATUS_MAP[activeTab];
    const { data } = await getVendorWorkOrders(
      statuses.length > 0 ? { status: statuses as WoStatus[] } : undefined
    );
    setWorkOrders(data);
    setLoading(false);
  }, [activeTab]);

  useEffect(() => {
    loadWorkOrders();
  }, [loadWorkOrders]);

  // Client-side search filter
  const filtered = searchQuery
    ? workOrders.filter(
        (wo) =>
          wo.property_name
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          wo.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          wo.trade?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          wo.property_address
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase())
      )
    : workOrders;

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <button
            onClick={() => setShowNewJob(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t("newJob.button")}
          </button>
        }
      />

      <WorkOrderFilters
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

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
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="briefcase"
          title={activeTab === "incoming" ? t("noIncoming") : t("noJobs")}
          subtitle={t("emptySubtitle")}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((wo) => (
            <JobCard key={wo.id} wo={wo} />
          ))}
        </div>
      )}

      <NewJobModal
        open={showNewJob}
        onClose={() => setShowNewJob(false)}
        tier="vendor"
      />
    </div>
  );
}
