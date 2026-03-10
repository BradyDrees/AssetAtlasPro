"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/vendor/status-badge";
import { PriorityDot } from "@/components/vendor/priority-dot";
import { WoPhotosSection } from "@/components/operate/wo-photos-section";
import { WoTimelineSection } from "@/components/operate/wo-timeline-section";
import { WoPmActions } from "@/components/operate/wo-pm-actions";
import type { VendorWorkOrder } from "@/lib/vendor/work-order-types";
import type { DomainEvent } from "@/lib/platform/domain-events";
import type { WoStatus } from "@/lib/vendor/types";

type Tab = "overview" | "photos" | "time" | "financials" | "activity";

interface WoDetailContentProps {
  wo: VendorWorkOrder & { vendor_name: string; assigned_user_name: string | null };
  photos: Array<{
    id: string;
    storage_path: string;
    caption: string | null;
    photo_type: string;
    created_at: string;
    url: string;
  }>;
  timeLog: Array<{
    id: string;
    vendor_user_id: string | null;
    worker_name: string | null;
    clock_in: string;
    clock_out: string | null;
    duration_minutes: number | null;
    hourly_rate: number | null;
    notes: string | null;
    is_on_site: boolean | null;
  }>;
  financials: {
    estimate: { id: string; status: string; total: number; created_at: string } | null;
    invoice: { id: string; status: string; total: number; created_at: string } | null;
    materials_total: number;
    labor_total: number;
  };
  activity: DomainEvent[];
}

export function WoDetailContent({
  wo,
  photos,
  timeLog,
  financials,
  activity,
}: WoDetailContentProps) {
  const t = useTranslations("operate.workOrders");
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "overview", label: t("tabs.overview") },
    { key: "photos", label: t("tabs.photos"), count: photos.length },
    { key: "time", label: t("tabs.timeLog"), count: timeLog.length },
    { key: "financials", label: t("tabs.financials") },
    { key: "activity", label: t("tabs.activity"), count: activity.length },
  ];

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString() : "\u2014";
  const formatTime = (t: string | null) =>
    t ? t.slice(0, 5) : "";
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
  const formatDuration = (mins: number | null) => {
    if (!mins) return "\u2014";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const totalLabor = timeLog.reduce((sum, e) => {
    const hours = (e.duration_minutes ?? 0) / 60;
    return sum + hours * (e.hourly_rate ?? 0);
  }, 0);
  const totalHours = timeLog.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Link
          href="/operate/work-orders"
          className="text-content-tertiary hover:text-content-primary transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-content-primary flex-1 truncate">
          {wo.property_name || wo.description || t("title")}
        </h1>
        <StatusBadge status={wo.status} />
      </div>

      {/* PM Actions */}
      <WoPmActions woId={wo.id} currentStatus={wo.status} />

      {/* Summary card */}
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-content-quaternary text-xs">{t("vendorLabel")}</span>
            <p className="text-content-primary font-medium">{wo.vendor_name}</p>
          </div>
          <div>
            <span className="text-content-quaternary text-xs">{t("assignedTo")}</span>
            <p className="text-content-primary font-medium">{wo.assigned_user_name || t("unassigned")}</p>
          </div>
          {wo.property_address && (
            <div className="col-span-2">
              <span className="text-content-quaternary text-xs">{t("address")}</span>
              <p className="text-content-primary">
                {wo.property_address}{wo.unit_number ? ` \u00b7 Unit ${wo.unit_number}` : ""}
              </p>
            </div>
          )}
          <div>
            <span className="text-content-quaternary text-xs">{t("trade")}</span>
            <p className="text-content-primary">{wo.trade || "\u2014"}</p>
          </div>
          <div>
            <span className="text-content-quaternary text-xs">{t("priority")}</span>
            <p className="text-content-primary flex items-center gap-1.5">
              <PriorityDot priority={wo.priority} />
              {wo.priority}
            </p>
          </div>
          {wo.scheduled_date && (
            <div>
              <span className="text-content-quaternary text-xs">{t("scheduledDate")}</span>
              <p className="text-content-primary">
                {formatDate(wo.scheduled_date)}
                {wo.scheduled_time_start && ` ${formatTime(wo.scheduled_time_start)}`}
                {wo.scheduled_time_end && `\u2013${formatTime(wo.scheduled_time_end)}`}
              </p>
            </div>
          )}
          {wo.budget_amount != null && (
            <div>
              <span className="text-content-quaternary text-xs">{t("budget")}</span>
              <p className="text-content-primary">{formatCurrency(wo.budget_amount)}</p>
            </div>
          )}
        </div>
        {wo.description && (
          <div>
            <span className="text-content-quaternary text-xs">{t("description")}</span>
            <p className="text-content-secondary text-sm mt-0.5">{wo.description}</p>
          </div>
        )}
        {wo.pm_notes && (
          <div>
            <span className="text-content-quaternary text-xs">{t("pmNotes")}</span>
            <p className="text-content-secondary text-sm mt-0.5">{wo.pm_notes}</p>
          </div>
        )}
        {wo.access_notes && (
          <div>
            <span className="text-content-quaternary text-xs">{t("accessNotes")}</span>
            <p className="text-content-secondary text-sm mt-0.5">{wo.access_notes}</p>
          </div>
        )}
        {wo.tenant_name && (
          <div className="flex items-center gap-4">
            <div>
              <span className="text-content-quaternary text-xs">{t("tenantName")}</span>
              <p className="text-content-primary text-sm">{wo.tenant_name}</p>
            </div>
            {wo.tenant_phone && (
              <div>
                <span className="text-content-quaternary text-xs">{t("tenantPhone")}</span>
                <p className="text-content-primary text-sm">{wo.tenant_phone}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-edge-secondary pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors ${
              activeTab === tab.key
                ? "text-green-500 border-b-2 border-green-500 bg-green-500/5"
                : "text-content-tertiary hover:text-content-primary"
            }`}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span className="ml-1.5 text-xs bg-surface-tertiary text-content-tertiary rounded-full px-1.5 py-0.5">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[200px]">
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-surface-primary rounded-xl border border-edge-primary p-3 text-center">
                <p className="text-2xl font-bold text-content-primary">{photos.length}</p>
                <p className="text-xs text-content-quaternary">{t("stats.photos")}</p>
              </div>
              <div className="bg-surface-primary rounded-xl border border-edge-primary p-3 text-center">
                <p className="text-2xl font-bold text-content-primary">{formatDuration(totalHours)}</p>
                <p className="text-xs text-content-quaternary">{t("stats.timeLogged")}</p>
              </div>
              <div className="bg-surface-primary rounded-xl border border-edge-primary p-3 text-center">
                <p className="text-2xl font-bold text-content-primary">{formatCurrency(financials.materials_total)}</p>
                <p className="text-xs text-content-quaternary">{t("stats.materials")}</p>
              </div>
              <div className="bg-surface-primary rounded-xl border border-edge-primary p-3 text-center">
                <p className="text-2xl font-bold text-content-primary">{formatCurrency(totalLabor)}</p>
                <p className="text-xs text-content-quaternary">{t("stats.labor")}</p>
              </div>
            </div>

            {/* Completion notes */}
            {wo.completion_notes && (
              <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
                <h3 className="text-sm font-semibold text-content-primary mb-1">{t("completionNotes")}</h3>
                <p className="text-sm text-content-secondary">{wo.completion_notes}</p>
              </div>
            )}

            {/* Decline reason */}
            {wo.decline_reason && (
              <div className="bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900/40 p-4">
                <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">{t("declineReason")}</h3>
                <p className="text-sm text-red-600 dark:text-red-300">{wo.decline_reason}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "photos" && <WoPhotosSection photos={photos} />}

        {activeTab === "time" && (
          <div className="space-y-2">
            {timeLog.length === 0 ? (
              <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
                <p className="text-sm text-content-tertiary">{t("noTimeEntries")}</p>
              </div>
            ) : (
              timeLog.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-surface-primary rounded-xl border border-edge-primary p-3 flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-content-primary">
                      {entry.worker_name || t("unknownWorker")}
                      {entry.is_on_site && (
                        <span className="ml-1.5 text-xs text-green-500">{t("onSite")}</span>
                      )}
                    </p>
                    <p className="text-xs text-content-tertiary">
                      {new Date(entry.clock_in).toLocaleString()}
                      {entry.clock_out && ` \u2192 ${new Date(entry.clock_out).toLocaleTimeString()}`}
                    </p>
                    {entry.notes && (
                      <p className="text-xs text-content-quaternary mt-0.5 truncate">{entry.notes}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-semibold text-content-primary">
                      {formatDuration(entry.duration_minutes)}
                    </p>
                    {entry.hourly_rate != null && (
                      <p className="text-xs text-content-quaternary">
                        {formatCurrency(entry.hourly_rate)}/hr
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "financials" && (
          <div className="space-y-3">
            {/* Estimate */}
            <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
              <h3 className="text-sm font-semibold text-content-primary mb-2">{t("estimate")}</h3>
              {financials.estimate ? (
                <div className="flex items-center justify-between">
                  <div>
                    <StatusBadge status={financials.estimate.status as WoStatus} size="sm" />
                    <p className="text-xs text-content-tertiary mt-1">
                      {formatDate(financials.estimate.created_at)}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-content-primary">
                    {formatCurrency(financials.estimate.total)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-content-quaternary">{t("noEstimate")}</p>
              )}
            </div>

            {/* Invoice */}
            <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
              <h3 className="text-sm font-semibold text-content-primary mb-2">{t("invoice")}</h3>
              {financials.invoice ? (
                <div className="flex items-center justify-between">
                  <div>
                    <StatusBadge status={financials.invoice.status as WoStatus} size="sm" />
                    <p className="text-xs text-content-tertiary mt-1">
                      {formatDate(financials.invoice.created_at)}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-content-primary">
                    {formatCurrency(financials.invoice.total)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-content-quaternary">{t("noInvoice")}</p>
              )}
            </div>

            {/* Cost summary */}
            <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
              <h3 className="text-sm font-semibold text-content-primary mb-2">{t("costSummary")}</h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-content-tertiary">{t("stats.materials")}</span>
                  <span className="text-content-primary font-medium">{formatCurrency(financials.materials_total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-content-tertiary">{t("stats.labor")}</span>
                  <span className="text-content-primary font-medium">{formatCurrency(financials.labor_total)}</span>
                </div>
                <div className="flex justify-between border-t border-edge-secondary pt-1.5">
                  <span className="text-content-primary font-semibold">{t("total")}</span>
                  <span className="text-content-primary font-bold">
                    {formatCurrency(financials.materials_total + financials.labor_total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "activity" && <WoTimelineSection events={activity} />}
      </div>
    </div>
  );
}
