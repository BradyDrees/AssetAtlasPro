"use client";

import type { DerivedProperty } from "@/app/actions/operate-dashboard";
import { PortfolioSummaryCard } from "./portfolio-summary-card";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TMessages = Record<string, any>;

function t(messages: TMessages, key: string): string {
  const parts = key.split(".");
  let val: unknown = messages;
  for (const part of parts) {
    if (val && typeof val === "object") val = (val as TMessages)[part];
    else return key;
  }
  return typeof val === "string" ? val : key;
}

interface PortfolioPanelProps {
  properties: DerivedProperty[];
  selectedProperty: string | null;
  onSelectProperty: (key: string | null) => void;
  translations: TMessages;
}

export function PortfolioPanel({
  properties,
  selectedProperty,
  onSelectProperty,
  translations: msg,
}: PortfolioPanelProps) {
  return (
    <div className="flex flex-col h-full min-w-0">
      <div className="flex items-center justify-between px-1 pb-2 flex-shrink-0">
        <h2 className="text-sm font-semibold text-content-primary">
          {t(msg, "portfolio.title")}
        </h2>
        <span className="text-xs text-content-quaternary">
          {properties.length}
        </span>
      </div>

      <button
        onClick={() => onSelectProperty(null)}
        className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-2 transition-colors ${
          selectedProperty === null
            ? "bg-green-500/10 text-green-600 font-medium border border-green-500/30"
            : "text-content-secondary hover:bg-surface-secondary"
        }`}
      >
        {t(msg, "portfolio.allProperties")}
        {selectedProperty !== null && (
          <span className="text-xs text-content-quaternary ml-1">
            · {t(msg, "portfolio.clearFilter")}
          </span>
        )}
      </button>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {properties.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-content-tertiary">
              {t(msg, "portfolio.noProperties")}
            </p>
            <p className="text-xs text-content-quaternary mt-1">
              {t(msg, "portfolio.noPropertiesDesc")}
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
              translations={msg}
            />
          ))
        )}
      </div>
    </div>
  );
}
