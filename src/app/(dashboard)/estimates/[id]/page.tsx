import { getPmEstimateDetail } from "@/app/actions/pm-estimates";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { ESTIMATE_STATUS_COLORS } from "@/lib/vendor/estimate-types";
import type { EstimateStatus } from "@/lib/vendor/types";
import { PmEstimateActions } from "@/components/vendor/pm-estimate-actions";
import { EstimateSummary } from "@/components/vendor/estimate-summary";
import Link from "next/link";

interface PmEstimateDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PmEstimateDetailPage({
  params,
}: PmEstimateDetailPageProps) {
  const { id } = await params;
  const t = await getTranslations("vendor.estimates");
  const { estimate, sections, error } = await getPmEstimateDetail(id);

  if (error || !estimate) {
    redirect("/estimates");
  }

  const statusColor =
    ESTIMATE_STATUS_COLORS[estimate.status as EstimateStatus] ?? "";

  const canAct = ["sent", "pm_reviewing", "with_owner"].includes(
    estimate.status
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/estimates"
          className="p-2 text-content-tertiary hover:text-content-primary transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-content-tertiary">
              {estimate.estimate_number}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}
            >
              {t(`status.${estimate.status}` as Parameters<typeof t>[0])}
            </span>
          </div>
          <h1 className="text-xl font-bold text-content-primary truncate">
            {estimate.title || estimate.property_name || t("untitled")}
          </h1>
        </div>
      </div>

      {/* Property info */}
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
        <h2 className="text-sm font-semibold text-content-primary mb-3">
          {t("estimateDetails")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {estimate.property_name && (
            <div>
              <span className="text-content-tertiary">{t("propertyName")}:</span>
              <span className="ml-2 text-content-primary">
                {estimate.property_name}
              </span>
            </div>
          )}
          {estimate.property_address && (
            <div>
              <span className="text-content-tertiary">{t("propertyAddress")}:</span>
              <span className="ml-2 text-content-primary">
                {estimate.property_address}
              </span>
            </div>
          )}
          {estimate.unit_info && (
            <div>
              <span className="text-content-tertiary">{t("unitInfo")}:</span>
              <span className="ml-2 text-content-primary">
                {estimate.unit_info}
              </span>
            </div>
          )}
          {estimate.valid_until && (
            <div>
              <span className="text-content-tertiary">{t("validUntil")}:</span>
              <span className="ml-2 text-content-primary">
                {new Date(estimate.valid_until + "T00:00:00").toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
        {estimate.description && (
          <p className="mt-3 text-sm text-content-secondary">
            {estimate.description}
          </p>
        )}
      </div>

      {/* Sections + line items (read-only) */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-content-primary">
          {t("sections")}
        </h2>

        {sections.map((section) => (
          <div
            key={section.id}
            className="bg-surface-primary rounded-xl border border-edge-primary overflow-hidden"
          >
            <div className="flex items-center justify-between p-3 bg-surface-secondary/50 border-b border-edge-primary">
              <h3 className="text-sm font-semibold text-content-primary">
                {section.name}
              </h3>
              <span className="text-sm font-medium text-content-secondary">
                ${Number(section.subtotal).toFixed(2)}
              </span>
            </div>

            {/* Column headers */}
            {section.items.length > 0 && (
              <div className="hidden sm:flex items-center gap-3 py-1.5 px-3 text-xs font-medium text-content-quaternary uppercase border-b border-edge-primary/50">
                <span className="flex-1">{t("description")}</span>
                <span className="w-16 text-center">{t("type")}</span>
                <span className="w-16 text-right">{t("qty")}</span>
                <span className="w-20 text-right">{t("price")}</span>
                <span className="w-24 text-right">{t("lineTotal")}</span>
              </div>
            )}

            {section.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 py-2 px-3 text-sm border-b border-edge-primary/50 last:border-0"
              >
                <span className="flex-1 text-content-primary">
                  {item.description}
                </span>
                <span className="text-content-tertiary text-xs uppercase w-16 text-center hidden sm:block">
                  {t(`itemType.${item.item_type}` as Parameters<typeof t>[0])}
                </span>
                <span className="text-content-secondary w-16 text-right hidden sm:block">
                  {item.quantity} {item.unit}
                </span>
                <span className="text-content-secondary w-20 text-right hidden sm:block">
                  ${Number(item.unit_price).toFixed(2)}
                </span>
                <span className="text-content-primary font-medium w-24 text-right">
                  ${Number(item.total).toFixed(2)}
                </span>
              </div>
            ))}

            {section.items.length === 0 && (
              <div className="py-4 text-center text-sm text-content-quaternary">
                {t("noItems")}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Financial summary */}
      <EstimateSummary
        subtotal={Number(estimate.subtotal) || 0}
        markupPct={Number(estimate.markup_pct) || 0}
        markupAmount={Number(estimate.markup_amount) || 0}
        taxPct={Number(estimate.tax_pct) || 0}
        taxAmount={Number(estimate.tax_amount) || 0}
        total={Number(estimate.total) || 0}
        readOnly
      />

      {/* Terms */}
      {estimate.terms && (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
          <h3 className="text-sm font-semibold text-content-primary mb-2">
            {t("terms")}
          </h3>
          <p className="text-sm text-content-secondary whitespace-pre-wrap">
            {estimate.terms}
          </p>
        </div>
      )}

      {/* PM Actions */}
      {canAct && <PmEstimateActions estimateId={estimate.id} />}
    </div>
  );
}
