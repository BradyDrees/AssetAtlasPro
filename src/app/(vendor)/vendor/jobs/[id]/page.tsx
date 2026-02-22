"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  getWorkOrder,
  getWorkOrderMaterials,
  getTimeEntries,
} from "@/app/actions/vendor-work-orders";
import type { VendorWorkOrder, VendorWoMaterial, VendorWoTimeEntry } from "@/lib/vendor/work-order-types";
import { StatusBadge } from "@/components/vendor/status-badge";
import { PriorityDot } from "@/components/vendor/priority-dot";
import { JobActions } from "@/components/vendor/job-actions";
import { MaterialsLog } from "@/components/vendor/materials-log";
import { TimeTracker } from "@/components/vendor/time-tracker";

export default function JobDetailPage() {
  const params = useParams();
  const woId = params.id as string;
  const t = useTranslations("vendor.jobs");

  const [wo, setWo] = useState<VendorWorkOrder | null>(null);
  const [materials, setMaterials] = useState<VendorWoMaterial[]>([]);
  const [timeEntries, setTimeEntries] = useState<VendorWoTimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [woRes, matRes, timeRes] = await Promise.all([
        getWorkOrder(woId),
        getWorkOrderMaterials(woId),
        getTimeEntries(woId),
      ]);
      setWo(woRes.data);
      setMaterials(matRes.data);
      setTimeEntries(timeRes.data);
      setLoading(false);
    }
    load();
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
            href="/vendor/jobs"
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
        href="/vendor/jobs"
        className="inline-flex items-center gap-1 text-sm text-content-tertiary hover:text-content-primary"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        {t("title")}
      </Link>

      {/* Header */}
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PriorityDot priority={wo.priority} showLabel />
              <h1 className="text-xl font-bold text-content-primary">
                {wo.property_name || t("detail.property")}
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

        {/* Actions */}
        <JobActions woId={wo.id} currentStatus={wo.status} />
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
        </div>

        {/* Right column: materials + time */}
        <div className="space-y-4">
          <MaterialsLog
            workOrderId={wo.id}
            materials={materials}
            readOnly={!isActiveJob}
          />
          <TimeTracker
            workOrderId={wo.id}
            timeEntries={timeEntries}
            readOnly={!isActiveJob}
          />
        </div>
      </div>
    </div>
  );
}
