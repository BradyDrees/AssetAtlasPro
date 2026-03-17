"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  getWorkOrder,
  getWorkOrderMaterials,
  getTimeEntries,
  unarchiveWorkOrder,
} from "@/app/actions/vendor-work-orders";
import type { VendorWorkOrder, VendorWoMaterial, VendorWoTimeEntry } from "@/lib/vendor/work-order-types";
import { StatusBadge } from "@/components/vendor/status-badge";
import { PriorityDot } from "@/components/vendor/priority-dot";
import { JobActions } from "@/components/vendor/job-actions";
import { MaterialsLog } from "@/components/vendor/materials-log";
import { TimeTracker } from "@/components/vendor/time-tracker";
import { MessageThread } from "@/components/vendor/message-thread";
import { PropertyIntelPanel } from "@/components/vendor/property-intel";
import { ChatPanel } from "@/components/vendor/chat-panel";
import { WorkerAssignDropdown } from "@/components/vendor/worker-assign-dropdown";
import { JobProfitabilityCard } from "@/components/vendor/job-profitability-card";
import { PropertyContextCard } from "@/components/vendor/property-context-card";
import { WoPhotoSection } from "@/components/vendor/wo-photo-section";
import { TechRatingCard } from "@/components/vendor/tech-rating-card";
import { createClient } from "@/lib/supabase/client";

export default function JobDetailPage() {
  const params = useParams();
  const woId = params.id as string;
  const t = useTranslations("vendor.jobs");

  const [wo, setWo] = useState<VendorWorkOrder | null>(null);
  const [materials, setMaterials] = useState<VendorWoMaterial[]>([]);
  const [timeEntries, setTimeEntries] = useState<VendorWoTimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMessages, setShowMessages] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [linkedEstimate, setLinkedEstimate] = useState<{
    id: string; estimate_number: string | null; title: string | null; total: number;
  } | null>(null);
  const [isVendorAdmin, setIsVendorAdmin] = useState(false);
  const [techName, setTechName] = useState<string>("");
  const mt = useTranslations("vendor.messages");

  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      // Check if user is admin/owner/manager for rating controls
      const { data: vu } = await supabase
        .from("vendor_users")
        .select("role")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (vu && ["owner", "admin", "office_manager"].includes((vu as { role: string }).role)) {
        setIsVendorAdmin(true);
      }
    }
    const [woRes, matRes, timeRes] = await Promise.all([
      getWorkOrder(woId),
      getWorkOrderMaterials(woId),
      getTimeEntries(woId),
    ]);
    setWo(woRes.data);
    setMaterials(matRes.data);
    setTimeEntries(timeRes.data);

    // Resolve tech name from assigned_to
    if (woRes.data?.assigned_to) {
      const { data: techUser } = await supabase
        .from("vendor_users")
        .select("first_name, last_name")
        .eq("id", woRes.data.assigned_to)
        .maybeSingle();
      if (techUser) {
        const tu = techUser as { first_name: string | null; last_name: string | null };
        setTechName([tu.first_name, tu.last_name].filter(Boolean).join(" ") || "Tech");
      }
    }

    // Fetch linked estimate
    const { data: estData } = await supabase
      .from("vendor_estimates")
      .select("id, estimate_number, title, total")
      .eq("work_order_id", woId)
      .maybeSingle();
    if (estData) setLinkedEstimate(estData as { id: string; estimate_number: string | null; title: string | null; total: number });

    setLoading(false);
  }, [woId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /** Re-fetch materials after add/delete */
  const refreshMaterials = useCallback(async () => {
    const matRes = await getWorkOrderMaterials(woId);
    setMaterials(matRes.data);
  }, [woId]);

  /** Re-fetch time entries after clock-in/out */
  const refreshTimeEntries = useCallback(async () => {
    const timeRes = await getTimeEntries(woId);
    setTimeEntries(timeRes.data);
  }, [woId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-6 animate-pulse">
          <div className="h-6 bg-surface-secondary rounded w-1/2 mb-4" />
          <div className="h-4 bg-surface-secondary rounded w-3/4 mb-2" />
          <div className="h-4 bg-surface-secondary rounded w-1/3" />
        </div>
      </div>
    );
  }

  if (!wo) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
          <p className="text-content-tertiary">Work order not found</p>
          <Link
            href="/pro/jobs"
            className="text-brand-600 hover:text-brand-700 text-sm font-medium mt-2 inline-block"
          >
            ← {t("title")}
          </Link>
        </div>
      </div>
    );
  }

  const isActiveJob = [
    "accepted",
    "scheduled",
    "en_route",
    "on_site",
    "in_progress",
  ].includes(wo.status);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Back link */}
      <Link
        href="/pro/jobs"
        className="inline-flex items-center gap-1 text-sm text-content-tertiary hover:text-content-primary"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        {t("title")}
      </Link>

      {/* Archived Banner */}
      {wo.archived_at && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              {t("actions.archivedBanner")}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
              {t("actions.archivedOn", {
                date: new Date(wo.archived_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }),
              })}
            </p>
          </div>
          <button
            onClick={async () => {
              await unarchiveWorkOrder(wo.id);
              loadData();
            }}
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors"
          >
            {t("actions.unarchive")}
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PriorityDot priority={wo.priority} showLabel />
              <h1 className="text-xl font-bold text-content-primary">
                {wo.property_name || wo.description || wo.trade || t("title")}
              </h1>
            </div>
            {wo.property_address && (
              <p className="text-sm text-content-tertiary">
                {wo.property_address}
              </p>
            )}
            {wo.unit_number && (
              <p className="text-sm text-content-tertiary">
                {t("detail.unit")}: {wo.unit_number}
              </p>
            )}
          </div>
          <StatusBadge status={wo.status} size="md" />
        </div>

        {/* Worker Assignment */}
        <div className="flex items-center gap-3 mb-3">
          <WorkerAssignDropdown
            woId={wo.id}
            currentAssignedTo={wo.assigned_to ?? null}
            onAssigned={loadData}
          />
        </div>

        {/* Actions */}
        <JobActions
          woId={wo.id}
          currentStatus={wo.status}
          trackingToken={wo.tracking_token}
          tenantPhone={wo.tenant_phone}
          archivedAt={wo.archived_at}
          onArchive={loadData}
        />
      </div>

      {/* Details grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Left column: info */}
        <div className="space-y-4">
          {/* Description */}
          {wo.description && (
            <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
              <h3 className="text-sm font-semibold text-content-primary mb-2">
                {t("detail.description")}
              </h3>
              <p className="text-sm text-content-secondary whitespace-pre-wrap">
                {wo.description}
              </p>
            </div>
          )}

          {/* PM Notes */}
          {wo.pm_notes && (
            <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
              <h3 className="text-sm font-semibold text-content-primary mb-2">
                {t("detail.pmNotes")}
              </h3>
              <p className="text-sm text-content-secondary whitespace-pre-wrap">
                {wo.pm_notes}
              </p>
            </div>
          )}

          {/* Linked Estimate */}
          {linkedEstimate && (
            <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
              <h3 className="text-sm font-semibold text-content-primary mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                {t("linkedEstimate.title")}
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-content-secondary">
                    {linkedEstimate.estimate_number} — {linkedEstimate.title || "Estimate"}
                  </p>
                  <p className="text-sm font-medium text-brand-400">
                    ${Number(linkedEstimate.total).toLocaleString()}
                  </p>
                </div>
                <Link
                  href={`/pro/estimates/${linkedEstimate.id}`}
                  className="text-xs text-brand-400 hover:text-brand-300 font-medium"
                >
                  {t("linkedEstimate.view")}
                </Link>
              </div>
            </div>
          )}

          {/* Access Notes */}
          {wo.access_notes && (
            <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
              <h3 className="text-sm font-semibold text-content-primary mb-2">
                {t("detail.accessNotes")}
              </h3>
              <p className="text-sm text-content-secondary whitespace-pre-wrap">
                {wo.access_notes}
              </p>
            </div>
          )}

          {/* Info cards */}
          <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
            <div className="grid grid-cols-2 gap-y-3 gap-x-4">
              {wo.trade && (
                <div>
                  <p className="text-xs text-content-tertiary">{t("detail.trade")}</p>
                  <p className="text-sm font-medium text-content-primary">{wo.trade}</p>
                </div>
              )}
              {wo.budget_amount != null && (
                <div>
                  <p className="text-xs text-content-tertiary">{t("detail.budget")}</p>
                  <p className="text-sm font-medium text-content-primary">
                    ${wo.budget_amount.toLocaleString()}
                    {wo.budget_type && (
                      <span className="text-xs text-content-quaternary ml-1">
                        ({wo.budget_type.toUpperCase()})
                      </span>
                    )}
                  </p>
                </div>
              )}
              {wo.scheduled_date && (
                <div>
                  <p className="text-xs text-content-tertiary">{t("detail.scheduled")}</p>
                  <p className="text-sm font-medium text-content-primary">
                    {new Date(wo.scheduled_date + "T00:00:00").toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                    {wo.scheduled_time_start && (
                      <span className="text-xs text-content-quaternary ml-1">
                        {wo.scheduled_time_start}
                        {wo.scheduled_time_end && ` – ${wo.scheduled_time_end}`}
                      </span>
                    )}
                  </p>
                </div>
              )}
              {wo.tenant_name && (
                <div>
                  <p className="text-xs text-content-tertiary">{t("detail.tenant")}</p>
                  <p className="text-sm font-medium text-content-primary">
                    {wo.tenant_name}
                    {wo.tenant_phone && (
                      <span className="text-xs text-content-quaternary ml-1">
                        {wo.tenant_phone}
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Message Tenant */}
          {wo.tenant_phone && isActiveJob && (
            <div className="bg-surface-primary rounded-xl border border-edge-primary overflow-hidden">
              <button
                type="button"
                onClick={() => setShowMessages(!showMessages)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-secondary transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                  <span className="text-sm font-medium text-content-primary">{mt("messageTenant")}</span>
                </div>
                <svg className={`w-4 h-4 text-content-quaternary transition-transform ${showMessages ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              {showMessages && (
                <div className="h-96 border-t border-edge-primary">
                  <MessageThread
                    workOrderId={wo.id}
                    tenantName={wo.tenant_name}
                    tenantPhone={wo.tenant_phone}
                    propertyName={wo.property_name}
                  />
                </div>
              )}
            </div>
          )}

          {/* PM ↔ Vendor Chat */}
          <div className="bg-surface-primary rounded-xl border border-edge-primary overflow-hidden">
            <button
              type="button"
              onClick={() => setShowChat(!showChat)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-secondary transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                </svg>
                <span className="text-sm font-medium text-content-primary">{t("chat.title")}</span>
              </div>
              <svg className={`w-4 h-4 text-content-quaternary transition-transform ${showChat ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {showChat && userId && (
              <div className="h-96 border-t border-edge-primary">
                <ChatPanel
                  workOrderId={wo.id}
                  currentUserId={userId}
                  role="pm"
                />
              </div>
            )}
          </div>

          {/* Decline reason */}
          {wo.status === "declined" && wo.decline_reason && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-4">
              <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">
                {t("detail.declineReason")}
              </h3>
              <p className="text-sm text-red-600 dark:text-red-300">
                {wo.decline_reason}
              </p>
            </div>
          )}

          {/* Completion notes */}
          {wo.completion_notes && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 p-4">
              <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-1">
                {t("detail.completionNotes")}
              </h3>
              <p className="text-sm text-green-600 dark:text-green-300">
                {wo.completion_notes}
              </p>
            </div>
          )}

          {/* Tech Performance Rating */}
          {["completed", "done_pending_approval", "invoiced", "paid"].includes(wo.status) && wo.assigned_to && (
            <TechRatingCard
              woId={wo.id}
              techName={techName}
              trade={wo.trade}
              canRate={isVendorAdmin}
            />
          )}
        </div>

        {/* Right column: profitability + property context + intel + materials + time */}
        <div className="space-y-4">
          {/* Job Profitability */}
          <JobProfitabilityCard woId={wo.id} woStatus={wo.status} />

          {/* Property Context (homeowner data) */}
          <PropertyContextCard woId={wo.id} />

          {/* Property Intelligence (vendor WO history) */}
          <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
            <h3 className="text-sm font-semibold text-content-primary mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
              </svg>
              {t("intel.title")}
            </h3>
            <PropertyIntelPanel workOrderId={wo.id} />
          </div>

          {/* Job Photos */}
          <WoPhotoSection woId={wo.id} readOnly={!isActiveJob} />

          <MaterialsLog
            workOrderId={wo.id}
            materials={materials}
            readOnly={!isActiveJob}
            onMutate={refreshMaterials}
          />
          <TimeTracker
            workOrderId={wo.id}
            timeEntries={timeEntries}
            readOnly={!isActiveJob}
            onMutate={refreshTimeEntries}
          />
        </div>
      </div>
    </div>
  );
}
