"use client";

import { useTranslations } from "next-intl";
import type { DerivedProperty } from "@/app/actions/operate-dashboard";

interface PortfolioSummaryCardProps {
  property: DerivedProperty;
  selected: boolean;
  onSelect: () => void;
}

const COLOR_BAR: Record<DerivedProperty["color"], string> = {
  red: "bg-red-500",
  yellow: "bg-amber-400",
  green: "bg-green-500",
};

export function PortfolioSummaryCard({
  property,
  selected,
  onSelect,
}: PortfolioSummaryCardProps) {
  const t = useTranslations("operate.dashboard");

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left flex rounded-lg border transition-all overflow-hidden ${
        selected
          ? "border-green-500 bg-green-500/10 shadow-sm"
          : "border-edge-tertiary bg-surface-primary hover:border-edge-secondary hover:bg-surface-secondary/50"
      }`}
    >
      {/* Color bar */}
      <div className={`w-1 flex-shrink-0 ${COLOR_BAR[property.color]}`} />

      <div className="flex-1 min-w-0 px-3 py-2">
        {/* Name + address */}
        <p className="text-sm font-medium text-content-primary truncate">
          {property.displayName || t("portfolio.unknownProperty")}
        </p>
        {property.address && (
          <p className="text-xs text-content-quaternary truncate">
            {property.address}
          </p>
        )}

        {/* Stat pills */}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-xs text-content-tertiary">
            {t("portfolio.openWos", { count: property.open_wo_count })}
          </span>
          {property.overdue_count > 0 && (
            <span className="text-xs text-red-500 font-medium">
              {t("portfolio.overdue", { count: property.overdue_count })}
            </span>
          )}
          {property.emergency_count > 0 && (
            <span className="text-xs text-red-500 font-medium">
              {t("portfolio.emergency", { count: property.emergency_count })}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
