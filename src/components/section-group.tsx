"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { SectionToggle } from "@/components/section-toggle";
import type { DDProjectSectionWithDetails } from "@/lib/types";

interface SectionGroupProps {
  groupName: string;
  groupSlug?: string;
  sections: DDProjectSectionWithDetails[];
  projectId: string;
  captureCounts?: Record<string, number>;
  unitCounts?: Record<string, number>;
  itemCounts?: Record<string, number>;
}

export function SectionGroup({
  groupName,
  groupSlug,
  sections,
  projectId,
  captureCounts = {},
  unitCounts = {},
  itemCounts = {},
}: SectionGroupProps) {
  const t = useTranslations("unit");
  const [isExpanded, setIsExpanded] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleStart = useCallback(() => setIsToggling(true), []);
  const handleToggleEnd = useCallback(() => setIsToggling(false), []);

  const enabledCount = sections.filter((s) => s.enabled).length;
  // Only count captures for unit-mode sections (non-unit sections use item count)
  const totalCaptures = sections.reduce(
    (sum, s) =>
      s.section.is_unit_mode ? sum + (captureCounts[s.id] ?? 0) : sum,
    0
  );
  const totalUnits = sections.reduce(
    (sum, s) => sum + (unitCounts[s.id] ?? 0),
    0
  );
  const totalItems = sections.reduce(
    (sum, s) => sum + (itemCounts[s.id] ?? 0),
    0
  );

  return (
    <div id={groupSlug ? `group-${groupSlug}` : undefined} className="scroll-mt-4 bg-surface-primary rounded-lg border border-edge-primary overflow-hidden">
      {/* Group header - clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-secondary transition-colors"
      >
        <div className="flex items-center gap-2">
          <span
            className={`text-xs transition-transform ${
              isExpanded ? "rotate-90" : ""
            }`}
          >
            ▶
          </span>
          <h3 className="font-semibold text-content-primary text-sm">{groupName}</h3>
        </div>
        <div className="flex items-center gap-3">
          {totalUnits > 0 && (
            <span className="text-xs text-green-600 font-medium">
              {t("unitCount", { count: totalUnits })}
            </span>
          )}
          {totalItems > 0 && (
            <span className="text-xs text-gold-700 font-medium">
              {t("itemCount", { count: totalItems })}
            </span>
          )}
          {totalCaptures > 0 && (
            <span className="text-xs text-brand-600 font-medium">
              {t("captureCount", { count: totalCaptures })}
            </span>
          )}
          <span className="text-xs text-content-muted">
            {enabledCount}/{sections.length} {t("enabled")}
          </span>
        </div>
      </button>

      {/* Section list */}
      {isExpanded && (
        <div className="border-t border-edge-tertiary">
          {sections.map((ps) => (
            <SectionToggle
              key={ps.id}
              projectSection={ps}
              projectId={projectId}
              captureCount={captureCounts[ps.id] ?? 0}
              unitCount={unitCounts[ps.id] ?? 0}
              itemCount={itemCounts[ps.id] ?? 0}
              isGroupBusy={isToggling}
              onToggleStart={handleToggleStart}
              onToggleEnd={handleToggleEnd}
            />
          ))}
        </div>
      )}
    </div>
  );
}
