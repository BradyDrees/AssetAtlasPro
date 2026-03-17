"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { OperateDashboardData } from "@/app/actions/operate-dashboard";
import { useRealtimeWorkOrders } from "@/hooks/use-realtime-wo";
import { PortfolioPanel } from "./portfolio-panel";
import { OpenItemsFeed, type FeedFilter } from "./open-items-feed";
import { DispatchPanel } from "./dispatch-panel";

type TabKey = "portfolio" | "feed" | "dispatch";

interface CommandCenterShellProps {
  data: OperateDashboardData;
  userId: string;
  locale: string;
}

export function CommandCenterShell({
  data,
  userId,
  locale,
}: CommandCenterShellProps) {
  const t = useTranslations("operate.dashboard");
  const router = useRouter();
  const [, startTransition] = useTransition();

  // State preserved across tab switches
  const [activeTab, setActiveTab] = useState<TabKey>("feed");
  const [feedFilter, setFeedFilter] = useState<FeedFilter>("all");
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);

  // Realtime: subscribe to WO changes and refresh
  useRealtimeWorkOrders(userId, {
    onWoChange: () => {
      startTransition(() => {
        router.refresh();
      });
    },
    onPoll: () => {
      startTransition(() => {
        router.refresh();
      });
    },
  });

  const tabs: { key: TabKey; label: string }[] = [
    { key: "portfolio", label: t("tabs.portfolio") },
    { key: "feed", label: t("tabs.feed") },
    { key: "dispatch", label: t("tabs.dispatch") },
  ];

  return (
    <div className="overflow-hidden">
      {/* ── Mobile: Tab bar ── */}
      <div className="lg:hidden flex gap-1 mb-3 bg-surface-secondary rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 text-center text-sm font-medium py-2 rounded-md transition-colors ${
              activeTab === tab.key
                ? "bg-surface-primary text-content-primary shadow-sm"
                : "text-content-tertiary hover:text-content-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Mobile: Conditionally render active panel ── */}
      <div className="lg:hidden" style={{ minHeight: "60vh" }}>
        {activeTab === "portfolio" && (
          <PortfolioPanel
            properties={data.properties}
            selectedProperty={selectedProperty}
            onSelectProperty={setSelectedProperty}
          />
        )}
        {activeTab === "feed" && (
          <OpenItemsFeed
            items={data.feed}
            filter={feedFilter}
            onFilterChange={setFeedFilter}
            selectedProperty={selectedProperty}
            todayStr={data.todayStr}
          />
        )}
        {activeTab === "dispatch" && (
          <DispatchPanel
            techs={data.dispatch.techs}
            unscheduledToday={data.dispatch.unscheduledToday}
            needsAssignment={data.dispatch.needsAssignment}
          />
        )}
      </div>

      {/* ── Desktop: Three-column grid ── */}
      <div className="hidden lg:grid grid-cols-[280px_1fr_300px] gap-4" style={{ height: "calc(100vh - 140px)" }}>
        <PortfolioPanel
          properties={data.properties}
          selectedProperty={selectedProperty}
          onSelectProperty={setSelectedProperty}
        />
        <OpenItemsFeed
          items={data.feed}
          filter={feedFilter}
          onFilterChange={setFeedFilter}
          selectedProperty={selectedProperty}
          todayStr={data.todayStr}
        />
        <DispatchPanel
          techs={data.dispatch.techs}
          unscheduledToday={data.dispatch.unscheduledToday}
          needsAssignment={data.dispatch.needsAssignment}
        />
      </div>
    </div>
  );
}
