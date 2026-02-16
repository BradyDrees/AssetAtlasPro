"use client";

import { useState, useCallback } from "react";
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
    <div id={groupSlug ? `group-${groupSlug}` : undefined} className="scroll-mt-4 bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Group header - clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span
            className={`text-xs transition-transform ${
              isExpanded ? "rotate-90" : ""
            }`}
          >
            ▶
          </span>
          <h3 className="font-semibold text-gray-900 text-sm">{groupName}</h3>
        </div>
        <div className="flex items-center gap-3">
          {totalUnits > 0 && (
            <span className="text-xs text-green-600 font-medium">
              {totalUnits} unit{totalUnits !== 1 ? "s" : ""}
            </span>
          )}
          {totalItems > 0 && (
            <span className="text-xs text-gold-700 font-medium">
              {totalItems} item{totalItems !== 1 ? "s" : ""}
            </span>
          )}
          {totalCaptures > 0 && (
            <span className="text-xs text-brand-600 font-medium">
              {totalCaptures} capture{totalCaptures !== 1 ? "s" : ""}
            </span>
          )}
          <span className="text-xs text-gray-400">
            {enabledCount}/{sections.length} enabled
          </span>
        </div>
      </button>

      {/* Section list */}
      {isExpanded && (
        <div className="border-t border-gray-100">
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
