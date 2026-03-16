import { getPmEstimates } from "@/app/actions/pm-estimates";
import { getTranslations, getLocale } from "next-intl/server";
import { ESTIMATE_STATUS_COLORS } from "@/lib/vendor/estimate-types";
import type { EstimateStatus } from "@/lib/vendor/types";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format-date";

export default async function PmEstimatesPage() {
  const t = await getTranslations("vendor.estimates");
  const locale = (await getLocale()) as "en" | "es";
  const { data: estimates } = await getPmEstimates();

  // Split into pending review vs resolved
  const pendingStatuses: EstimateStatus[] = [
    "sent",
    "pm_reviewing",
    "with_owner",
  ];
  const pending = estimates.filter((e) =>
    pendingStatuses.includes(e.status as EstimateStatus)
  );
  const resolved = estimates.filter(
    (e) => !pendingStatuses.includes(e.status as EstimateStatus)
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader title={t("pmTitle")} />

      {/* Pending review */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-content-secondary uppercase tracking-wide">
            {t("pendingReview")} ({pending.length})
          </h2>
          {pending.map((est) => {
            const statusColor =
              ESTIMATE_STATUS_COLORS[est.status as EstimateStatus] ?? "";
            return (
              <Link
                key={est.id}
                href={`/estimates/${est.id}`}
                className="block bg-surface-primary rounded-xl border border-edge-primary p-4 hover:border-brand-500/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-content-tertiary">
                        {est.estimate_number}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-content-primary truncate">
                      {est.title || est.property_name || t("untitled")}
                    </h3>
                    {est.property_address && (
                      <p className="text-xs text-content-tertiary truncate">
                        {est.property_address}
                        {est.unit_info ? ` - ${est.unit_info}` : ""}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusColor}`}
                  >
                    {t(`status.${est.status}` as Parameters<typeof t>[0])}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-content-tertiary">
                  <span>
                    {formatDate(est.created_at, locale, { weekday: false })}
                  </span>
                  <span className="font-semibold text-content-primary text-sm">
                    $
                    {Number(est.total).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-content-secondary uppercase tracking-wide">
            {t("resolved")} ({resolved.length})
          </h2>
          {resolved.map((est) => {
            const statusColor =
              ESTIMATE_STATUS_COLORS[est.status as EstimateStatus] ?? "";
            return (
              <Link
                key={est.id}
                href={`/estimates/${est.id}`}
                className="block bg-surface-primary rounded-xl border border-edge-primary p-4 hover:border-edge-secondary transition-colors opacity-80"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-content-secondary truncate">
                      {est.title || est.property_name || t("untitled")}
                    </h3>
                    <span className="text-xs text-content-quaternary">
                      {est.estimate_number}
                    </span>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}
                    >
                      {t(`status.${est.status}` as Parameters<typeof t>[0])}
                    </span>
                    <p className="text-xs text-content-tertiary mt-1">
                      $
                      {Number(est.total).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {estimates.length === 0 && (
        <EmptyState
          icon="calculator"
          title={t("pmNoEstimates")}
        />
      )}
    </div>
  );
}
