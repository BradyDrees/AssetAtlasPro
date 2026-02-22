"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toggleProjectSection } from "@/app/actions/sections";
import { nameToKey } from "@/lib/translate-sections";
import type { DDProjectSectionWithDetails } from "@/lib/types";

interface SectionToggleProps {
  projectSection: DDProjectSectionWithDetails;
  projectId: string;
  captureCount?: number;
  unitCount?: number;
  itemCount?: number;
  isGroupBusy?: boolean;
  onToggleStart?: () => void;
  onToggleEnd?: () => void;
}

export function SectionToggle({
  projectSection,
  projectId,
  captureCount = 0,
  unitCount = 0,
  itemCount = 0,
  isGroupBusy = false,
  onToggleStart,
  onToggleEnd,
}: SectionToggleProps) {
  const t = useTranslations("unit");
  const tInsp = useTranslations("inspection");
  const [enabled, setEnabled] = useState(projectSection.enabled);
  const [loading, setLoading] = useState(false);

  const isUnitMode = projectSection.section.is_unit_mode;
  const isBusy = loading || isGroupBusy;

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isGroupBusy) return; // Another toggle in this group is in-flight

    const newValue = !enabled;
    setEnabled(newValue); // optimistic update
    setLoading(true);
    onToggleStart?.();

    try {
      await toggleProjectSection(projectSection.id, projectId, newValue);
    } catch (err) {
      console.error("Section toggle failed:", err);
      setEnabled(!newValue); // revert on error
    } finally {
      setLoading(false);
      onToggleEnd?.();
    }
  };

  const content = (
    <div className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-secondary transition-colors border-b border-gray-50 last:border-b-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span
          className={`text-sm ${enabled ? "text-content-primary" : "text-content-muted"}`}
        >
          {tInsp.has(`ddSections.${nameToKey(projectSection.section.name)}`) ? tInsp(`ddSections.${nameToKey(projectSection.section.name)}`) : tInsp.has(`inspSections.${nameToKey(projectSection.section.name)}`) ? tInsp(`inspSections.${nameToKey(projectSection.section.name)}`) : projectSection.section.name}
        </span>
        {isUnitMode && (
          <span className="text-xs text-brand-600 font-medium">{t("grading")}</span>
        )}
        {/* Show unit count for unit-mode sections */}
        {enabled && isUnitMode && unitCount > 0 && (
          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
            {t("unitCount", { count: unitCount })}
          </span>
        )}
        {/* Show item count for non-unit-mode sections */}
        {enabled && !isUnitMode && itemCount > 0 && (
          <span className="text-xs bg-gold-100 text-gold-800 px-1.5 py-0.5 rounded-full font-medium">
            {t("itemCount", { count: itemCount })}
          </span>
        )}
        {/* Show capture count — only for unit-mode sections (non-unit uses itemCount instead) */}
        {enabled && isUnitMode && captureCount > 0 && (
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

  // Wrap in Link when enabled — clicking the row navigates to capture page
  if (enabled) {
    return (
      <Link href={`/projects/${projectId}/sections/${projectSection.id}`}>
        {content}
      </Link>
    );
  }

  return content;
}
