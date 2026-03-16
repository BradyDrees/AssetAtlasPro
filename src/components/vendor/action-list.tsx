"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { ActionItem, ActionEvent, ActionPriority, RuleKey } from "@/lib/vendor/action-rules";
import { ActionItemCard } from "./action-item-card";
import { recordActionEvent } from "@/app/actions/vendor-actions";

// ─── Types ──────────────────────────────────────────────────────

interface ActionListProps {
  items: ActionItem[];
  completedToday: ActionEvent[];
}

type FilterTab = "all" | ActionPriority;

// ─── Main Component ──────────────────────────────────────────────

export function ActionList({ items, completedToday }: ActionListProps) {
  const t = useTranslations("vendor.actions");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [optimisticHidden, setOptimisticHidden] = useState<Set<string>>(new Set());

  // Filter items
  const visibleItems = items.filter((item) => {
    if (optimisticHidden.has(item.taskKey)) return false;
    if (filter === "all") return true;
    return item.priority === filter;
  });

  // Group by ruleKey
  const grouped = new Map<RuleKey, ActionItem[]>();
  for (const item of visibleItems) {
    const list = grouped.get(item.ruleKey) ?? [];
    list.push(item);
    grouped.set(item.ruleKey, list);
  }

  // Count by priority
  const counts = { all: items.length - optimisticHidden.size, critical: 0, high: 0, medium: 0, low: 0 };
  for (const item of items) {
    if (optimisticHidden.has(item.taskKey)) continue;
    counts[item.priority]++;
  }

  // ── Actions ──
  const handleComplete = async (taskKey: string, ruleKey: string) => {
    setOptimisticHidden((prev) => new Set(prev).add(taskKey));
    const result = await recordActionEvent(taskKey, ruleKey, "completed");
    if (result.error) {
      setOptimisticHidden((prev) => {
        const next = new Set(prev);
        next.delete(taskKey);
        return next;
      });
    }
    startTransition(() => router.refresh());
  };

  const handleDismiss = async (taskKey: string, ruleKey: string) => {
    setOptimisticHidden((prev) => new Set(prev).add(taskKey));
    const result = await recordActionEvent(taskKey, ruleKey, "dismissed");
    if (result.error) {
      setOptimisticHidden((prev) => {
        const next = new Set(prev);
        next.delete(taskKey);
        return next;
      });
    }
    startTransition(() => router.refresh());
  };

  const handleSnooze = async (taskKey: string, ruleKey: string, until: string) => {
    setOptimisticHidden((prev) => new Set(prev).add(taskKey));
    const result = await recordActionEvent(taskKey, ruleKey, "snoozed", until);
    if (result.error) {
      setOptimisticHidden((prev) => {
        const next = new Set(prev);
        next.delete(taskKey);
        return next;
      });
    }
    startTransition(() => router.refresh());
  };

  // ── Filter tabs ──
  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: t("filter.all"), count: counts.all },
    { key: "critical", label: t("filter.critical"), count: counts.critical },
    { key: "high", label: t("filter.high"), count: counts.high },
    { key: "medium", label: t("filter.medium"), count: counts.medium },
    { key: "low", label: t("filter.low"), count: counts.low },
  ];

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              filter === tab.key
                ? "bg-brand-600/20 text-brand-400"
                : "text-content-tertiary hover:text-content-secondary hover:bg-surface-secondary"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-semibold ${
                  filter === tab.key
                    ? "bg-brand-600/30 text-brand-400"
                    : "bg-surface-tertiary text-content-quaternary"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Items grouped by category */}
      {visibleItems.length === 0 ? (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-12 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-500/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-content-primary">
            {t("empty.title")}
          </h3>
          <p className="text-sm text-content-tertiary mt-1">
            {t("empty.subtitle")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from(grouped.entries()).map(([ruleKey, ruleItems]) => (
            <div
              key={ruleKey}
              className="bg-surface-primary rounded-xl border border-edge-primary overflow-hidden"
            >
              <div className="px-4 py-2.5 border-b border-edge-secondary">
                <h3 className="text-xs font-semibold text-content-tertiary uppercase tracking-wider">
                  {t(`categories.${ruleKey}`)}
                  <span className="ml-1.5 text-content-quaternary font-normal">
                    ({ruleItems.length})
                  </span>
                </h3>
              </div>
              <div className="divide-y divide-edge-secondary">
                {ruleItems.map((item) => (
                  <ActionItemCard
                    key={item.taskKey}
                    item={item}
                    variant="full"
                    onComplete={handleComplete}
                    onDismiss={handleDismiss}
                    onSnooze={handleSnooze}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completed today section */}
      {completedToday.length > 0 && (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
          <h3 className="text-sm font-semibold text-content-secondary mb-2">
            {t("completed.title")}
          </h3>
          <p className="text-xs text-content-tertiary">
            {t("completed.count", { count: completedToday.length })}
          </p>
        </div>
      )}

      {/* Loading overlay */}
      {isPending && (
        <div className="fixed inset-0 z-50 bg-black/10 flex items-center justify-center pointer-events-none" />
      )}
    </div>
  );
}
