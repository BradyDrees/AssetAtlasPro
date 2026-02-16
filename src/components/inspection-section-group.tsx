"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { InspectionSectionToggle } from "@/components/inspection-section-toggle";
import type { InspectionProjectSectionWithDetails } from "@/lib/inspection-types";

interface InspectionSectionGroupProps {
  groupName: string;
  groupSlug: string;
  sections: InspectionProjectSectionWithDetails[];
  projectId: string;
  findingCounts?: Record<string, number>;
  unitCounts?: Record<string, number>;
  captureCounts?: Record<string, number>;
}

export function InspectionSectionGroup({
  groupName,
  groupSlug,
  sections,
  projectId,
  findingCounts = {},
  unitCounts = {},
  captureCounts = {},
}: InspectionSectionGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleStart = useCallback(() => setIsToggling(true), []);
  const handleToggleEnd = useCallback(() => setIsToggling(false), []);

  const enabledCount = sections.filter((s) => s.enabled).length;
  const isUnitMode = sections.some((s) => s.section.is_unit_mode);
  const totalFindings = sections.reduce(
    (sum, s) =>
      !s.section.is_unit_mode ? sum + (findingCounts[s.id] ?? 0) : sum,
    0
  );
  const totalUnits = sections.reduce(
    (sum, s) => sum + (unitCounts[s.id] ?? 0),
    0
  );
  const totalCaptures = sections.reduce(
    (sum, s) => sum + (captureCounts[s.id] ?? 0),
    0
  );

  // For non-unit groups, the inspect link goes to the group page
  // For unit groups, link goes to the first unit-mode section
  const inspectHref = isUnitMode
    ? `/inspections/${projectId}/sections/${sections.find((s) => s.section.is_unit_mode && s.enabled)?.id ?? sections[0]?.id}`
    : `/inspections/${projectId}/groups/${groupSlug}`;

  const hasEnabledSections = enabledCount > 0;

  return (
    <div className="bg-surface-primary rounded-lg border border-edge-primary overflow-hidden">
      {/* Group header */}
      <div className="flex items-center justify-between px-4 py-3 hover:bg-surface-secondary transition-colors">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          <span
            className={`text-xs transition-transform ${
              isExpanded ? "rotate-90" : ""
            }`}
          >
            ▶
          </span>
          <h3 className="font-semibold text-content-primary text-sm">{groupName}</h3>
          <div className="flex items-center gap-2 ml-2">
            {totalUnits > 0 && (
              <span className="text-xs text-green-600 font-medium">
                {totalUnits} unit{totalUnits !== 1 ? "s" : ""}
              </span>
            )}
            {totalFindings > 0 && (
              <span className="text-xs text-orange-600 font-medium">
                {totalFindings} finding{totalFindings !== 1 ? "s" : ""}
              </span>
            )}
            {totalCaptures > 0 && (
              <span className="text-xs text-brand-600 font-medium">
                {totalCaptures} photo{totalCaptures !== 1 ? "s" : ""}
              </span>
            )}
            <span className="text-xs text-content-muted">
              {enabledCount}/{sections.length}
            </span>
          </div>
        </button>

        {/* Inspect button */}
        {hasEnabledSections && (
          <Link
            href={inspectHref}
            onClick={(e) => e.stopPropagation()}
            className="ml-3 px-3 py-1.5 text-xs font-medium bg-brand-600 text-white rounded-md hover:bg-brand-700 transition-colors flex-shrink-0"
          >
            Inspect →
          </Link>
        )}
      </div>

      {/* Section list (toggles for enable/disable) */}
      {isExpanded && (
        <div className="border-t border-edge-tertiary">
          {sections.map((ps) => (
            <InspectionSectionToggle
              key={ps.id}
              projectSection={ps}
              projectId={projectId}
              findingCount={findingCounts[ps.id] ?? 0}
              unitCount={unitCounts[ps.id] ?? 0}
              captureCount={captureCounts[ps.id] ?? 0}
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
