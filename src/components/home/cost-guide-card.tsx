"use client";

import { useTranslations } from "next-intl";
import type { CostGuideEntry } from "@/lib/home/cost-guide-data";

interface Props {
  guides: CostGuideEntry[];
  /** Collapsible mode for WO wizard */
  collapsible?: boolean;
}

export function CostGuideCard({ guides, collapsible = false }: Props) {
  const t = useTranslations("home.costGuide");

  if (guides.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-content-quaternary">{t("noGuides")}</p>
      </div>
    );
  }

  const content = (
    <div className="space-y-3">
      {guides.map((guide) => {
        const range = guide.highEstimate - guide.lowEstimate;
        const mid = (guide.lowEstimate + guide.highEstimate) / 2;
        const leftPct = Math.round((guide.lowEstimate / (guide.highEstimate * 1.2)) * 100);
        const widthPct = Math.round((range / (guide.highEstimate * 1.2)) * 100);

        return (
          <div key={guide.repairType} className="p-3 rounded-lg bg-surface-secondary">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-content-primary">
                {t(guide.titleKey)}
              </span>
              <span className="text-sm font-semibold text-rose-400">
                ${guide.lowEstimate.toLocaleString()}–${guide.highEstimate.toLocaleString()}
              </span>
            </div>
            {/* Price range bar */}
            <div className="w-full h-2 rounded-full bg-surface-tertiary mb-1 relative">
              <div
                className="absolute h-full rounded-full bg-rose-400/60"
                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
              />
              <div
                className="absolute h-full w-1 rounded-full bg-rose-500"
                style={{ left: `${Math.round((mid / (guide.highEstimate * 1.2)) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-content-quaternary">
              {t("duration")}: {guide.avgDuration}
            </p>
          </div>
        );
      })}
      <p className="text-[10px] text-content-quaternary italic mt-2">
        {t("disclaimer")}
      </p>
    </div>
  );

  if (!collapsible) return content;

  // Collapsible wrapper for WO wizard
  return (
    <details className="group">
      <summary className="flex items-center justify-between cursor-pointer py-2 text-sm font-medium text-content-secondary hover:text-content-primary transition-colors">
        {t("whatToExpect")}
        <svg
          className="w-4 h-4 text-content-quaternary group-open:rotate-180 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="mt-2">{content}</div>
    </details>
  );
}
