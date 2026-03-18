"use client";

import type { DerivedProperty } from "@/app/actions/operate-dashboard";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TMessages = Record<string, any>;

function t(messages: TMessages, key: string, params?: Record<string, string | number>): string {
  const parts = key.split(".");
  let val: unknown = messages;
  for (const part of parts) {
    if (val && typeof val === "object") val = (val as TMessages)[part];
    else return key;
  }
  if (typeof val !== "string") return key;
  if (!params) return val;
  return val.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`));
}

interface PortfolioSummaryCardProps {
  property: DerivedProperty;
  selected: boolean;
  onSelect: () => void;
  translations: TMessages;
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
  translations: msg,
}: PortfolioSummaryCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left flex rounded-lg border transition-all overflow-hidden ${
        selected
          ? "border-green-500 bg-green-500/10 shadow-sm"
          : "border-edge-tertiary bg-surface-primary hover:border-edge-secondary hover:bg-surface-secondary/50"
      }`}
    >
      <div className={`w-1 flex-shrink-0 ${COLOR_BAR[property.color]}`} />
      <div className="flex-1 min-w-0 px-3 py-2">
        <p className="text-sm font-medium text-content-primary truncate">
          {property.displayName || t(msg, "portfolio.unknownProperty")}
        </p>
        {property.address && (
          <p className="text-xs text-content-quaternary truncate">
            {property.address}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-xs text-content-tertiary">
            {t(msg, "portfolio.openWos", { count: property.open_wo_count })}
          </span>
          {property.overdue_count > 0 && (
            <span className="text-xs text-red-500 font-medium">
              {t(msg, "portfolio.overdue", { count: property.overdue_count })}
            </span>
          )}
          {property.emergency_count > 0 && (
            <span className="text-xs text-red-500 font-medium">
              {t(msg, "portfolio.emergency", { count: property.emergency_count })}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
