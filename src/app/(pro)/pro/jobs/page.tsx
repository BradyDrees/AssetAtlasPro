"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { getVendorWorkOrders } from "@/app/actions/vendor-work-orders";
import type { VendorWorkOrder } from "@/lib/vendor/work-order-types";
import type { WoStatus } from "@/lib/vendor/types";
import { JobCard } from "@/components/vendor/job-card";
import {
  WorkOrderFilters,
  TAB_STATUS_MAP,
} from "@/components/vendor/work-order-filters";

export default function VendorJobsPage() {
  const t = useTranslations("vendor.jobs");
  const [workOrders, setWorkOrders] = useState<VendorWorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "incoming" | "active" | "completed" | "all"
  >("incoming");
  const [searchQuery, setSearchQuery] = useState("");

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
      <h1 className="text-2xl font-bold text-content-primary">
        {t("title")}
      </h1>

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
              d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0"
            />
          </svg>
          <p className="text-content-tertiary">
            {activeTab === "incoming" ? t("noIncoming") : t("noJobs")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((wo) => (
            <JobCard key={wo.id} wo={wo} />
          ))}
        </div>
      )}
    </div>
  );
}
