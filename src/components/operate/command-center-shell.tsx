"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OperateDashboardData } from "@/app/actions/operate-dashboard";
import { useRealtimeWorkOrders } from "@/hooks/use-realtime-wo";
import { PortfolioPanel } from "./portfolio-panel";
import { OpenItemsFeed, type FeedFilter } from "./open-items-feed";
import { DispatchPanel } from "./dispatch-panel";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TMessages = Record<string, any>;

function t(messages: TMessages, key: string): string {
  const parts = key.split(".");
  let val: unknown = messages;
  for (const part of parts) {
    if (val && typeof val === "object") val = (val as TMessages)[part];
    else return key;
  }
  return typeof val === "string" ? val : key;
}

type TabKey = "portfolio" | "feed" | "dispatch";

interface CommandCenterShellProps {
  data: OperateDashboardData;
  userId: string;
  locale: string;
  translations: TMessages;
}

export function CommandCenterShell({
  data,
  userId,
  translations: msg,
}: CommandCenterShellProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<TabKey>("feed");
  const [feedFilter, setFeedFilter] = useState<FeedFilter>("all");
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);

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
    { key: "portfolio", label: t(msg, "tabs.portfolio") },
    { key: "feed", label: t(msg, "tabs.feed") },
    { key: "dispatch", label: t(msg, "tabs.dispatch") },
  ];

  return (
    <div className="overflow-hidden">
      {/* Mobile: Tab bar */}
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

      {/* Mobile: Conditionally render active panel */}
      <div className="lg:hidden" style={{ minHeight: "60vh" }}>
        {activeTab === "portfolio" && (
          <PortfolioPanel
            properties={data.properties}
            selectedProperty={selectedProperty}
            onSelectProperty={setSelectedProperty}
            translations={msg}
          />
        )}
        {activeTab === "feed" && (
          <OpenItemsFeed
            items={data.feed}
            filter={feedFilter}
            onFilterChange={setFeedFilter}
            selectedProperty={selectedProperty}
            todayStr={data.todayStr}
            translations={msg}
          />
        )}
        {activeTab === "dispatch" && (
          <DispatchPanel
            techs={data.dispatch.techs}
            unscheduledToday={data.dispatch.unscheduledToday}
            needsAssignment={data.dispatch.needsAssignment}
            translations={msg}
          />
        )}
      </div>

      {/* Desktop: Three-column grid */}
      <div className="hidden lg:grid grid-cols-[280px_1fr_300px] gap-4" style={{ height: "calc(100vh - 140px)" }}>
        <PortfolioPanel
          properties={data.properties}
          selectedProperty={selectedProperty}
          onSelectProperty={setSelectedProperty}
          translations={msg}
        />
        <OpenItemsFeed
          items={data.feed}
          filter={feedFilter}
          onFilterChange={setFeedFilter}
          selectedProperty={selectedProperty}
          todayStr={data.todayStr}
          translations={msg}
        />
        <DispatchPanel
          techs={data.dispatch.techs}
          unscheduledToday={data.dispatch.unscheduledToday}
          needsAssignment={data.dispatch.needsAssignment}
          translations={msg}
        />
      </div>
    </div>
  );
}
