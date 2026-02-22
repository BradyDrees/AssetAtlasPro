"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAppLocale } from "@/components/locale-provider";
import type { DealAnalysis } from "@/lib/deal-analysis-types";

interface DealCardProps {
  deal: DealAnalysis;
}

const statusStyles = {
  DRAFT: "bg-charcoal-100 text-charcoal-600",
  IN_PROGRESS: "bg-brand-100 text-brand-700",
  COMPLETE: "bg-brand-100 text-brand-800",
};

const borderColors = {
  DRAFT: "border-l-charcoal-400",
  IN_PROGRESS: "border-l-gold-500",
  COMPLETE: "border-l-brand-600",
};

export function DealCard({ deal }: DealCardProps) {
  const t = useTranslations();
  const { locale } = useAppLocale();
  const formattedDate = new Date(deal.updated_at).toLocaleDateString(
    locale === "es" ? "es" : "en-US",
    { month: "short", day: "numeric", year: "numeric" }
  );

  return (
    <Link
      href={`/deal-analysis/${deal.id}`}
      className={`block bg-surface-primary rounded-lg border border-edge-primary border-l-4 ${borderColors[deal.status]} p-4 hover:shadow-lg hover:border-edge-secondary transition-all`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-content-primary">{deal.name}</h3>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyles[deal.status]}`}
            >
              {t(`review.statusLabels.${deal.status}`)}
            </span>
          </div>
          <p className="text-sm text-content-tertiary mt-0.5">
            {deal.property_name}
          </p>
          {deal.address && (
            <p className="text-xs text-content-muted mt-0.5">{deal.address}</p>
          )}
          <span className="text-xs text-content-muted mt-1 block md:hidden">
            {formattedDate}
          </span>
        </div>
        <span className="text-xs text-content-muted whitespace-nowrap ml-4 hidden md:block">
          {formattedDate}
        </span>
      </div>
    </Link>
  );
}
