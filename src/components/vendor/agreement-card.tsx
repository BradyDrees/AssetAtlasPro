"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ServiceAgreement } from "@/lib/vendor/agreement-types";
import { AGREEMENT_STATUS_COLORS } from "@/lib/vendor/agreement-types";

interface AgreementCardProps {
  agreement: ServiceAgreement;
  basePath?: string;
}

export function AgreementCard({ agreement, basePath = "/vendor" }: AgreementCardProps) {
  const t = useTranslations("vendor.agreements");

  const nextDueLabel = agreement.next_due
    ? new Date(agreement.next_due + "T00:00:00").toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  const statusColor = AGREEMENT_STATUS_COLORS[agreement.status] ?? "";

  return (
    <Link
      href={`${basePath}/agreements/${agreement.id}`}
      className="block bg-surface-primary rounded-xl border border-edge-primary p-4 hover:border-brand-500/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-content-primary truncate">
              {agreement.service_type || agreement.trade}
            </h3>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColor}`}>
              {t(`status.${agreement.status}` as Parameters<typeof t>[0])}
            </span>
          </div>
          {agreement.property_name && (
            <p className="text-xs text-content-tertiary truncate">{agreement.property_name}</p>
          )}
          {agreement.description && (
            <p className="text-xs text-content-quaternary mt-1 line-clamp-1">{agreement.description}</p>
          )}
        </div>

        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-content-primary">
            ${Number(agreement.price).toFixed(2)}
          </p>
          <p className="text-[10px] text-content-quaternary">
            / {t(`frequency.${agreement.frequency}` as Parameters<typeof t>[0])}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3 pt-2 border-t border-edge-primary/50 text-xs text-content-tertiary">
        <span>
          {t("nextDue")}: <span className="text-content-secondary">{nextDueLabel}</span>
        </span>
        {agreement.trade && (
          <span className="px-1.5 py-0.5 bg-surface-secondary rounded text-[10px] text-content-quaternary uppercase">
            {agreement.trade}
          </span>
        )}
      </div>
    </Link>
  );
}
