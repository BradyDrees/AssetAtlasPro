"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { VendorEstimate } from "@/lib/vendor/estimate-types";
import { ESTIMATE_STATUS_COLORS } from "@/lib/vendor/estimate-types";
import type { EstimateStatus } from "@/lib/vendor/types";

interface EstimateCardProps {
  estimate: VendorEstimate;
}

export function EstimateCard({ estimate }: EstimateCardProps) {
  const t = useTranslations("vendor.estimates");

  const statusColor =
    ESTIMATE_STATUS_COLORS[estimate.status as EstimateStatus] ?? "";

  const statusLabel =
    t(`status.${estimate.status}` as Parameters<typeof t>[0]);

  const formattedDate = new Date(estimate.created_at).toLocaleDateString(
    undefined,
    { month: "short", day: "numeric", year: "numeric" }
  );

  return (
    <Link
      href={`/vendor/estimates/${estimate.id}`}
      className="block bg-surface-primary rounded-xl border border-edge-primary p-4 hover:border-brand-500/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-content-tertiary">
              {estimate.estimate_number}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-content-primary truncate">
            {estimate.title || estimate.property_name || t("untitled")}
          </h3>
          {estimate.property_address && (
            <p className="text-xs text-content-tertiary truncate">
              {estimate.property_address}
              {estimate.unit_info ? ` - ${estimate.unit_info}` : ""}
            </p>
          )}
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusColor}`}
        >
          {statusLabel}
        </span>
      </div>

      {estimate.description && (
        <p className="text-sm text-content-secondary line-clamp-2 mb-3">
          {estimate.description}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-content-tertiary">
        <span>{formattedDate}</span>
        <span className="font-semibold text-content-primary">
          ${Number(estimate.total).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      </div>

      {estimate.change_request_notes && estimate.status === "changes_requested" && (
        <div className="mt-2 p-2 bg-amber-900/20 border border-amber-700/30 rounded-lg">
          <p className="text-xs text-amber-400 line-clamp-2">
            {estimate.change_request_notes}
          </p>
        </div>
      )}
    </Link>
  );
}
