"use client";

import { useState } from "react";
import Link from "next/link";
import { toggleInspectionSection } from "@/app/actions/inspections";
import type { InspectionProjectSectionWithDetails } from "@/lib/inspection-types";
import { INSPECTION_CONDITION_LABELS } from "@/lib/inspection-constants";
import { RUL_COLORS } from "@/lib/inspection-constants";

interface InspectionSectionToggleProps {
  projectSection: InspectionProjectSectionWithDetails;
  projectId: string;
  findingCount?: number;
  unitCount?: number;
  captureCount?: number;
  isGroupBusy?: boolean;
  onToggleStart?: () => void;
  onToggleEnd?: () => void;
}

export function InspectionSectionToggle({
  projectSection,
  projectId,
  findingCount = 0,
  unitCount = 0,
  captureCount = 0,
  isGroupBusy = false,
  onToggleStart,
  onToggleEnd,
}: InspectionSectionToggleProps) {
  const [enabled, setEnabled] = useState(projectSection.enabled);
  const [loading, setLoading] = useState(false);

  const isUnitMode = projectSection.section.is_unit_mode;
  const isBusy = loading || isGroupBusy;

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isGroupBusy) return;

    const newValue = !enabled;
    setEnabled(newValue); // optimistic update
    setLoading(true);
    onToggleStart?.();

    try {
      await toggleInspectionSection(projectSection.id, projectId, newValue);
    } catch (err) {
      console.error("Section toggle failed:", err);
      setEnabled(!newValue); // revert on error
    } finally {
      setLoading(false);
      onToggleEnd?.();
    }
  };

  const conditionLabel = projectSection.condition_rating
    ? INSPECTION_CONDITION_LABELS[projectSection.condition_rating]
    : null;

  const rulBucket = projectSection.rul_bucket;

  const content = (
    <div className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-secondary transition-colors border-b border-gray-50 last:border-b-0">
      <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
        <span
          className={`text-sm ${enabled ? "text-content-primary" : "text-content-muted"}`}
        >
          {projectSection.display_name_override ?? projectSection.section.name}
        </span>
        {isUnitMode && (
          <span className="text-xs text-brand-600 font-medium">Unit Mode</span>
        )}
        {/* Condition rating badge */}
        {enabled && conditionLabel && (
          <span className="text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-medium">
            {conditionLabel}
          </span>
        )}
        {/* RUL badge */}
        {enabled && rulBucket && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
              RUL_COLORS[rulBucket as keyof typeof RUL_COLORS] ?? "bg-surface-tertiary text-content-tertiary"
            }`}
          >
            RUL: {rulBucket}
          </span>
        )}
        {/* Unit count for unit-mode sections */}
        {enabled && isUnitMode && unitCount > 0 && (
          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
            {unitCount} unit{unitCount !== 1 ? "s" : ""}
          </span>
        )}
        {/* Finding count for non-unit sections */}
        {enabled && !isUnitMode && findingCount > 0 && (
          <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">
            {findingCount} finding{findingCount !== 1 ? "s" : ""}
          </span>
        )}
        {/* Capture count */}
        {enabled && captureCount > 0 && (
          <span className="text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-medium">
            {captureCount}
          </span>
        )}
      </div>

      {/* Toggle switch */}
      <button
        onClick={handleToggle}
        disabled={isBusy}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 flex-shrink-0 ml-3 ${
          enabled ? "bg-brand-600" : "bg-gray-300"
        }`}
        role="switch"
        aria-checked={enabled}
      >
        <span
          className={`inline-block h-4.5 w-4.5 transform rounded-full bg-surface-primary transition-transform ${
            enabled ? "translate-x-5.5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );

  // Wrap in Link when enabled
  if (enabled) {
    return (
      <Link
        href={`/inspections/${projectId}/sections/${projectSection.id}`}
      >
        {content}
      </Link>
    );
  }

  return content;
}
