"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { VendorWorkOrder } from "@/lib/vendor/work-order-types";
import { StatusBadge } from "./status-badge";
import { PriorityDot } from "./priority-dot";

interface JobCardProps {
  wo: VendorWorkOrder;
}

export function JobCard({ wo }: JobCardProps) {
  const t = useTranslations("vendor.jobs");

  const formattedDate = wo.scheduled_date
    ? new Date(wo.scheduled_date + "T00:00:00").toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <Link
      href={`/vendor/jobs/${wo.id}`}
      className="block bg-surface-primary rounded-xl border border-edge-primary p-4 hover:border-brand-500/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <PriorityDot priority={wo.priority} />
            <h3 className="text-sm font-semibold text-content-primary truncate">
              {wo.property_name || t("detail.property")}
            </h3>
          </div>
          {wo.unit_number && (
            <p className="text-xs text-content-tertiary">
              {t("detail.unit")}: {wo.unit_number}
            </p>
          )}
        </div>
        <StatusBadge status={wo.status} />
      </div>

      {wo.description && (
        <p className="text-sm text-content-secondary line-clamp-2 mb-3">
          {wo.description}
        </p>
      )}

      <div className="flex items-center gap-3 text-xs text-content-tertiary">
        {wo.trade && (
          <span className="inline-flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
            </svg>
            {wo.trade}
          </span>
        )}
        {formattedDate && (
          <span className="inline-flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            {formattedDate}
          </span>
        )}
        {wo.budget_amount != null && (
          <span className="inline-flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ${wo.budget_amount.toLocaleString()}
          </span>
        )}
      </div>
    </Link>
  );
}
