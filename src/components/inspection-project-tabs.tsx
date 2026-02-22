"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { InspectionGroupChecklist } from "@/components/inspection-group-checklist";
import { INSPECTION_GROUP_KEYS, nameToKey } from "@/lib/translate-sections";
import type {
  InspectionProjectSectionWithDetails,
  InspectionChecklistItem,
  InspectionFinding,
  InspectionCapture,
  InspectionType,
  ProjectRole,
} from "@/lib/inspection-types";

// ============================================
// Color themes per group slug
// ============================================

const GROUP_COLORS: Record<
  string,
  {
    header: string;
    headerHover: string;
    pill: string;
    pillHover: string;
    accent: string;
    border: string;
    findingBadge: string;
    unitBadge: string;
    unitCard: string;
  }
> = {
  "site-exterior": {
    header: "bg-gradient-to-r from-brand-800 to-brand-600",
    headerHover: "hover:from-brand-700 hover:to-brand-500",
    pill: "bg-brand-50 border-brand-200 text-brand-700",
    pillHover: "hover:bg-brand-100 hover:border-brand-400",
    accent: "text-brand-300",
    border: "border-brand-200",
    findingBadge: "bg-gold-500/20 text-gold-200",
    unitBadge: "bg-brand-500/20 text-brand-200",
    unitCard: "hover:border-brand-300",
  },
  "structure-envelope": {
    header: "bg-gradient-to-r from-charcoal-800 to-charcoal-600",
    headerHover: "hover:from-charcoal-700 hover:to-charcoal-500",
    pill: "bg-charcoal-50 border-charcoal-200 text-charcoal-700",
    pillHover: "hover:bg-charcoal-100 hover:border-charcoal-400",
    accent: "text-charcoal-400",
    border: "border-charcoal-200",
    findingBadge: "bg-gold-500/20 text-gold-200",
    unitBadge: "bg-charcoal-500/20 text-charcoal-200",
    unitCard: "hover:border-charcoal-300",
  },
  "life-safety": {
    header: "bg-gradient-to-r from-red-900 to-red-700",
    headerHover: "hover:from-red-800 hover:to-red-600",
    pill: "bg-red-50 border-red-200 text-red-800",
    pillHover: "hover:bg-red-100 hover:border-red-300",
    accent: "text-red-400",
    border: "border-red-200",
    findingBadge: "bg-gold-500/20 text-gold-200",
    unitBadge: "bg-red-500/20 text-red-200",
    unitCard: "hover:border-red-300",
  },
  mep: {
    header: "bg-gradient-to-r from-brand-900 to-charcoal-700",
    headerHover: "hover:from-brand-800 hover:to-charcoal-600",
    pill: "bg-brand-50 border-brand-100 text-brand-800",
    pillHover: "hover:bg-brand-100 hover:border-brand-300",
    accent: "text-brand-400",
    border: "border-brand-100",
    findingBadge: "bg-gold-500/20 text-gold-200",
    unitBadge: "bg-brand-500/20 text-brand-200",
    unitCard: "hover:border-brand-300",
  },
  "common-areas": {
    header: "bg-gradient-to-r from-stone-700 to-stone-500",
    headerHover: "hover:from-stone-600 hover:to-stone-400",
    pill: "bg-stone-50 border-stone-200 text-stone-700",
    pillHover: "hover:bg-stone-100 hover:border-stone-300",
    accent: "text-stone-400",
    border: "border-stone-200",
    findingBadge: "bg-gold-500/20 text-gold-200",
    unitBadge: "bg-stone-500/20 text-stone-200",
    unitCard: "hover:border-stone-300",
  },
  units: {
    header: "bg-gradient-to-r from-gold-700 to-gold-500",
    headerHover: "hover:from-gold-600 hover:to-gold-400",
    pill: "bg-gold-50 border-gold-200 text-gold-800",
    pillHover: "hover:bg-gold-100 hover:border-gold-300",
    accent: "text-gold-300",
    border: "border-gold-200",
    findingBadge: "bg-red-500/20 text-red-200",
    unitBadge: "bg-gold-500/20 text-gold-100",
    unitCard: "hover:border-gold-300",
  },
};

const DEFAULT_COLORS = GROUP_COLORS["mep"];

interface GroupData {
  groupName: string;
  groupSlug: string;
  isUnitMode: boolean;
  sectionsData: {
    projectSection: InspectionProjectSectionWithDetails;
    checklistItems: InspectionChecklistItem[];
    findings: InspectionFinding[];
    captures: InspectionCapture[];
  }[];
  findingCount: number;
  sectionCount: number;
}

interface InspectionProjectTabsProps {
  groups: GroupData[];
  projectId: string;
  inspectionType: InspectionType;
  role?: ProjectRole;
  currentUserId?: string;
}

export function InspectionProjectTabs({
  groups,
  projectId,
  inspectionType,
  role = "owner",
  currentUserId,
  scrollToGroup,
}: InspectionProjectTabsProps & { scrollToGroup?: string }) {
  const tInsp = useTranslations("inspection");
  // Track which groups are collapsed (all expanded by default)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Auto-scroll to group when returning from a sub-page
  useEffect(() => {
    if (scrollToGroup) {
      const el = document.getElementById(`group-${scrollToGroup}`);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    }
  }, [scrollToGroup]);

  if (groups.length === 0) {
    return (
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center text-sm text-content-quaternary shadow-sm">
        No enabled sections. Go to project settings to enable inspection
        sections.
      </div>
    );
  }

  const toggleGroup = (slug: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      {/* Quick-nav: sticky jump links */}
      <div className="sticky top-0 z-10 bg-surface-tertiary/95 backdrop-blur-sm -mx-4 px-4 py-2.5 md:-mx-6 md:px-6 border-b border-edge-primary shadow-sm">
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {groups.map((group) => {
            const colors = GROUP_COLORS[group.groupSlug] ?? DEFAULT_COLORS;
            return (
              <a
                key={group.groupSlug}
                href={`#group-${group.groupSlug}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(`group-${group.groupSlug}`);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
                className={`flex-shrink-0 px-3 py-1.5 text-xs font-semibold border rounded-full transition-all ${colors.pill} ${colors.pillHover}`}
              >
                {INSPECTION_GROUP_KEYS[group.groupName] ? tInsp(`sectionGroups.${INSPECTION_GROUP_KEYS[group.groupName]}`) : group.groupName}
                {group.findingCount > 0 && (
                  <span className="ml-1.5 text-orange-600 font-bold">
                    {group.findingCount}
                  </span>
                )}
              </a>
            );
          })}
        </div>
      </div>

      {/* All groups rendered inline */}
      {groups.map((group) => {
        const isCollapsed = collapsedGroups.has(group.groupSlug);
        const colors = GROUP_COLORS[group.groupSlug] ?? DEFAULT_COLORS;

        return (
          <div
            key={group.groupSlug}
            id={`group-${group.groupSlug}`}
            className="scroll-mt-16"
          >
            {/* Group header — colored gradient */}
            <button
              onClick={() => toggleGroup(group.groupSlug)}
              className={`w-full flex items-center justify-between px-4 py-3.5 text-white rounded-t-xl transition-all shadow-sm ${colors.header} ${colors.headerHover}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs transition-transform ${
                    isCollapsed ? "" : "rotate-90"
                  }`}
                >
                  ▶
                </span>
                <h2 className="text-sm font-bold tracking-wide">{INSPECTION_GROUP_KEYS[group.groupName] ? tInsp(`sectionGroups.${INSPECTION_GROUP_KEYS[group.groupName]}`) : group.groupName}</h2>
                <span className={`text-xs ${colors.accent}`}>
                  {group.sectionCount} section{group.sectionCount !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {group.findingCount > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.findingBadge}`}>
                    {group.findingCount} finding{group.findingCount !== 1 ? "s" : ""}
                  </span>
                )}
                {group.isUnitMode && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.unitBadge}`}>
                    Unit Mode
                  </span>
                )}
              </div>
            </button>

            {/* Group content */}
            {!isCollapsed && (
              <div className={`border border-t-0 ${colors.border} rounded-b-xl bg-surface-primary ${group.isUnitMode ? "p-4" : ""}`}>
                {!group.isUnitMode ? (
                  <InspectionGroupChecklist
                    sections={group.sectionsData}
                    projectId={projectId}
                    inspectionType={inspectionType}
                    role={role}
                    currentUserId={currentUserId}
                  />
                ) : (
                  /* Unit mode: link to section pages */
                  <div className="space-y-3">
                    {group.sectionsData.map((s) => (
                      <Link
                        key={s.projectSection.id}
                        href={`/inspections/${projectId}/sections/${s.projectSection.id}`}
                        className={`block bg-surface-primary rounded-lg border border-edge-primary p-4 ${colors.unitCard} hover:shadow-md transition-all`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-content-primary">
                              {s.projectSection.display_name_override ??
                                (tInsp.has(`inspSections.${nameToKey(s.projectSection.section.name)}`) ? tInsp(`inspSections.${nameToKey(s.projectSection.section.name)}`) : s.projectSection.section.name)}
                            </h3>
                            <p className="text-xs text-content-quaternary mt-0.5">
                              Unit-based inspection — tap to manage units
                            </p>
                          </div>
                          <span className="text-content-muted text-lg">→</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
