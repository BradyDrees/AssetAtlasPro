"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { FeedWorkOrder } from "@/app/actions/operate-dashboard";
import { pmTransitionWorkOrder } from "@/app/actions/pm-work-orders";
import { StatusBadge } from "@/components/vendor/status-badge";
import { PriorityDot } from "@/components/vendor/priority-dot";
import type { WoStatus } from "@/lib/vendor/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TMessages = Record<string, any>;

function t(messages: TMessages, key: string, params?: Record<string, string | number>): string {
  const parts = key.split(".");
  let val: unknown = messages;
  for (const part of parts) {
    if (val && typeof val === "object") val = (val as TMessages)[part];
    else return key;
  }
  if (typeof val !== "string") return key;
  if (!params) return val;
  return val.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`));
}

export type FeedFilter = "all" | "overdue" | "emergency" | "scheduled";

interface OpenItemsFeedProps {
  items: FeedWorkOrder[];
  filter: FeedFilter;
  onFilterChange: (f: FeedFilter) => void;
  selectedProperty: string | null;
  todayStr: string;
  translations: TMessages;
}

const PM_TRANSITIONS: Partial<Record<WoStatus, WoStatus[]>> = {
  assigned: ["on_hold", "cancelled"],
  accepted: ["scheduled", "on_hold", "cancelled"],
  scheduled: ["on_hold", "cancelled"],
  en_route: ["on_hold"],
  on_site: ["on_hold"],
  in_progress: ["on_hold"],
  done_pending_approval: ["completed", "in_progress"],
  invoiced: ["paid"],
  declined: ["assigned", "cancelled"],
  on_hold: ["accepted", "assigned", "scheduled", "in_progress", "cancelled"],
};

function isValidDateStr(d: string | null | undefined): d is string {
  if (!d) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

export function OpenItemsFeed({
  items,
  filter,
  onFilterChange,
  selectedProperty,
  todayStr,
  translations: msg,
}: OpenItemsFeedProps) {
  const tJobs = useTranslations("vendor.jobs");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const propertyFiltered = selectedProperty
    ? items.filter((item) => item.property_key === selectedProperty)
    : items;

  const filtered = propertyFiltered.filter((item) => {
    switch (filter) {
      case "overdue":
        return item.is_overdue;
      case "emergency":
        return item.priority === "emergency";
      case "scheduled":
        return isValidDateStr(item.scheduled_date) && item.scheduled_date >= todayStr;
      default:
        return true;
    }
  });

  const filters: { key: FeedFilter; label: string }[] = [
    { key: "all", label: t(msg, "feed.filterAll") },
    { key: "overdue", label: t(msg, "feed.filterOverdue") },
    { key: "emergency", label: t(msg, "feed.filterEmergency") },
    { key: "scheduled", label: t(msg, "feed.filterScheduled") },
  ];

  return (
    <div className="flex flex-col h-full min-w-0">
      <div className="flex-shrink-0 pb-2">
        <h2 className="text-sm font-semibold text-content-primary mb-2">
          {t(msg, "feed.title")}
        </h2>
        <div className="flex gap-1.5 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === f.key
                  ? "bg-green-600 text-white"
                  : "bg-surface-secondary text-content-tertiary hover:bg-surface-tertiary"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-content-tertiary">
              {t(msg, "feed.noItems")}
            </p>
            <p className="text-xs text-content-quaternary mt-1">
              {t(msg, "feed.noItemsDesc")}
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <FeedCard
              key={item.id}
              item={item}
              tJobs={tJobs}
              msg={msg}
              isPending={isPending}
              startTransition={startTransition}
              router={router}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface FeedCardProps {
  item: FeedWorkOrder;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tJobs: any;
  msg: TMessages;
  isPending: boolean;
  startTransition: (fn: () => void) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router: any;
}

function FeedCard({ item, tJobs, msg, isPending, startTransition, router }: FeedCardProps) {
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const transitions = PM_TRANSITIONS[item.status] ?? [];

  async function handleStatusChange(newStatus: WoStatus) {
    setStatusDropdownOpen(false);
    const result = await pmTransitionWorkOrder(item.id, newStatus);
    if (result.success) {
      startTransition(() => {
        router.refresh();
      });
    }
  }

  return (
    <Link
      href={`/operate/work-orders/${item.id}`}
      className="block bg-surface-primary rounded-lg border border-edge-tertiary p-3 hover:border-green-400/50 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <PriorityDot priority={item.priority} />
          <span className="text-sm font-medium text-content-primary truncate">
            {item.property_name}
          </span>
          {item.unit_number && (
            <span className="text-xs text-content-quaternary flex-shrink-0">
              #{item.unit_number}
            </span>
          )}
        </div>
        {item.is_overdue && (
          <span className="flex-shrink-0 text-xs font-medium text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
            {t(msg, "feed.overdueLabel")}
          </span>
        )}
      </div>

      {item.description && (
        <p className="text-xs text-content-tertiary mt-1 line-clamp-2">
          {item.description}
        </p>
      )}

      <div className="flex items-center gap-2 mt-2 flex-wrap min-w-0">
        <div className="relative">
          {transitions.length > 0 ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setStatusDropdownOpen(!statusDropdownOpen);
              }}
              className="cursor-pointer"
              disabled={isPending}
            >
              <StatusBadge status={item.status} size="sm" />
            </button>
          ) : (
            <StatusBadge status={item.status} size="sm" />
          )}

          {statusDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setStatusDropdownOpen(false);
                }}
              />
              <div className="absolute top-full left-0 mt-1 z-50 bg-surface-primary border border-edge-secondary rounded-lg shadow-lg py-1 min-w-[160px]">
                {transitions.map((status) => (
                  <button
                    key={status}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleStatusChange(status);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-secondary transition-colors"
                  >
                    {tJobs.has(`status.${status}`)
                      ? tJobs(`status.${status}`)
                      : status.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {item.trade && (
          <span className="text-xs text-content-quaternary">{item.trade}</span>
        )}
        <span className="text-xs text-content-quaternary truncate">{item.vendor_org_name}</span>
        <span className="text-xs text-content-quaternary truncate">{item.tech_name}</span>
        <span className="text-xs text-content-quaternary ml-auto flex-shrink-0">
          {t(msg, "feed.daysOpen", { count: item.days_open })}
        </span>
      </div>
    </Link>
  );
}
