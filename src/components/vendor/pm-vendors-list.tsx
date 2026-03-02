"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { EnrichedPmVendor } from "@/lib/vendor/types";
import { PmVendorCard } from "./pm-vendor-card";
import { PmInviteModal } from "./pm-invite-modal";
import { PmVendorDrawer } from "./pm-vendor-drawer";
import { PmVendorActions } from "./pm-vendor-actions";

interface PmVendorsListProps {
  initial: EnrichedPmVendor[];
}

type FilterTab = "all" | "active" | "pending" | "suspended" | "terminated";

const TABS: FilterTab[] = ["all", "active", "pending", "suspended", "terminated"];

export function PmVendorsList({ initial }: PmVendorsListProps) {
  const t = useTranslations("vendor.clients");

  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [drawerVendor, setDrawerVendor] = useState<EnrichedPmVendor | null>(null);
  const [actionVendor, setActionVendor] = useState<EnrichedPmVendor | null>(null);
  const [actionType, setActionType] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = initial;

    // Filter by tab
    if (activeTab !== "all") {
      list = list.filter((v) => v.status === activeTab);
    }

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) =>
          v.vendor_name.toLowerCase().includes(q) ||
          (v.vendor_email?.toLowerCase().includes(q) ?? false) ||
          v.trades.some((tr) => tr.toLowerCase().includes(q))
      );
    }

    return list;
  }, [initial, activeTab, search]);

  const tabCounts = useMemo(() => {
    const counts: Record<FilterTab, number> = {
      all: initial.length,
      active: 0,
      pending: 0,
      suspended: 0,
      terminated: 0,
    };
    for (const v of initial) {
      if (v.status in counts) {
        counts[v.status as FilterTab]++;
      }
    }
    return counts;
  }, [initial]);

  const handleAction = useCallback(
    (vendor: EnrichedPmVendor, action: string) => {
      if (action === "view") {
        setDrawerVendor(vendor);
        return;
      }
      if (action === "jobs") {
        setDrawerVendor(vendor);
        return;
      }
      setActionVendor(vendor);
      setActionType(action);
    },
    []
  );

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-quaternary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("pmVendors.searchPlaceholder")}
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-edge-primary bg-surface-secondary text-sm text-content-primary placeholder:text-content-quaternary"
          />
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors shrink-0"
        >
          {t("pmVendors.inviteVendor")}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === tab
                ? "bg-brand-600/20 text-brand-400 border border-brand-500/30"
                : "text-content-tertiary hover:bg-surface-secondary border border-transparent"
            }`}
          >
            {t(`pmVendors.tabs.${tab}`)} ({tabCounts[tab]})
          </button>
        ))}
      </div>

      {/* Vendor grid */}
      {filtered.length === 0 ? (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
          <p className="text-content-tertiary text-sm">
            {search.trim() ? t("pmVendors.noResults") : t("pmVendors.noVendors")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((v) => (
            <PmVendorCard
              key={v.relationship_id}
              vendor={v}
              onViewDetail={setDrawerVendor}
              onAction={handleAction}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <PmInviteModal open={showInvite} onClose={() => setShowInvite(false)} />
      <PmVendorDrawer
        vendor={drawerVendor}
        onClose={() => setDrawerVendor(null)}
        onAction={handleAction}
      />
      <PmVendorActions
        vendor={actionVendor}
        action={actionType}
        onClose={() => {
          setActionVendor(null);
          setActionType(null);
        }}
      />
    </div>
  );
}
