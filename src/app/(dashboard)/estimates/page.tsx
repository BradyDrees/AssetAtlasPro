import { getPmEstimates } from "@/app/actions/pm-estimates";
import { getTranslations } from "next-intl/server";
import { ESTIMATE_STATUS_COLORS } from "@/lib/vendor/estimate-types";
import type { EstimateStatus } from "@/lib/vendor/types";
import Link from "next/link";

export default async function PmEstimatesPage() {
  const t = await getTranslations("vendor.estimates");
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
      <h1 className="text-2xl font-bold text-content-primary">
        {t("pmTitle")}
      </h1>

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
                    {new Date(est.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
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
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
          <svg
            className="w-12 h-12 text-content-quaternary mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
            />
          </svg>
          <p className="text-content-tertiary">{t("pmNoEstimates")}</p>
        </div>
      )}
    </div>
  );
}
