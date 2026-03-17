"use client";

import { useTranslations } from "next-intl";
import type { DerivedProperty } from "@/app/actions/operate-dashboard";
import { PortfolioSummaryCard } from "./portfolio-summary-card";

interface PortfolioPanelProps {
  properties: DerivedProperty[];
  selectedProperty: string | null;
  onSelectProperty: (key: string | null) => void;
}

export function PortfolioPanel({
  properties,
  selectedProperty,
  onSelectProperty,
}: PortfolioPanelProps) {
  const t = useTranslations("operate.dashboard");

  return (
    <div className="flex flex-col h-full min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-2 flex-shrink-0">
        <h2 className="text-sm font-semibold text-content-primary">
          {t("portfolio.title")}
        </h2>
        <span className="text-xs text-content-quaternary">
          {properties.length}
        </span>
      </div>

      {/* All Properties toggle */}
      <button
        onClick={() => onSelectProperty(null)}
        className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-2 transition-colors ${
          selectedProperty === null
            ? "bg-green-500/10 text-green-600 font-medium border border-green-500/30"
            : "text-content-secondary hover:bg-surface-secondary"
        }`}
      >
        {t("portfolio.allProperties")}
        {selectedProperty !== null && (
          <span className="text-xs text-content-quaternary ml-1">
            · {t("portfolio.clearFilter")}
          </span>
        )}
      </button>

      {/* Scrollable property list */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {properties.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-content-tertiary">
              {t("portfolio.noProperties")}
            </p>
            <p className="text-xs text-content-quaternary mt-1">
              {t("portfolio.noPropertiesDesc")}
            </p>
          </div>
        ) : (
          properties.map((prop) => (
            <PortfolioSummaryCard
              key={prop.key}
              property={prop}
              selected={selectedProperty === prop.key}
              onSelect={() =>
                onSelectProperty(selectedProperty === prop.key ? null : prop.key)
              }
            />
          ))
        )}
      </div>
    </div>
  );
}
