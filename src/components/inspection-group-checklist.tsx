"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createInspectionFinding } from "@/app/actions/inspection-findings";
import { toggleInspectionSectionNA } from "@/app/actions/inspections";
import { FindingCard } from "@/components/inspection-finding-card";
import {
  PRIORITY_LABELS,
  GOOD_LABEL,
  INSPECTION_CONDITION_LABELS,
} from "@/lib/inspection-constants";
import type {
  InspectionProjectSectionWithDetails,
  InspectionChecklistItem,
  InspectionFinding,
  InspectionCapture,
  InspectionType,
  PriorityLevel,
  ProjectRole,
} from "@/lib/inspection-types";

// ============================================
// Types
// ============================================

interface SectionData {
  projectSection: InspectionProjectSectionWithDetails;
  checklistItems: InspectionChecklistItem[];
  findings: InspectionFinding[];
  captures: InspectionCapture[];
}

interface InspectionGroupChecklistProps {
  sections: SectionData[];
  projectId: string;
  inspectionType: InspectionType;
  role?: ProjectRole;
  currentUserId?: string;
}

// ============================================
// Health Score Calculation
// ============================================

export interface SubsectionHealth {
  name: string;
  score: number;
  label: string;
  itemCount: number;
  completedCount: number;
}

function computeSubsectionHealth(
  checklistItems: InspectionChecklistItem[],
  findings: InspectionFinding[],
  priorities: Map<string, number | null>,
  name: string
): SubsectionHealth {
  if (checklistItems.length === 0) {
    return { name, score: 5, label: "Excellent", itemCount: 0, completedCount: 0 };
  }

  // Map checklist item id → findings (1:many)
  const findingsByChecklist = new Map<string, InspectionFinding[]>();
  findings.forEach((f) => {
    if (f.checklist_item_id) {
      const existing = findingsByChecklist.get(f.checklist_item_id) ?? [];
      existing.push(f);
      findingsByChecklist.set(f.checklist_item_id, existing);
    }
  });

  let totalScore = 0;
  let completedCount = 0;

  checklistItems.forEach((item) => {
    const itemFindings = findingsByChecklist.get(item.id);
    if (itemFindings && itemFindings.length > 0) {
      // Use worst (lowest) priority among all findings for this item
      let worstScore = 5;
      itemFindings.forEach((finding) => {
        const localPriority = priorities.has(finding.id)
          ? priorities.get(finding.id)
          : finding.priority;
        const score = localPriority ?? 5;
        if (score < worstScore) worstScore = score;
      });
      totalScore += worstScore;
      completedCount++;
    } else {
      // No finding = Good = 5
      totalScore += 5;
    }
  });

  const avgScore = totalScore / checklistItems.length;
  const roundedScore = Math.round(avgScore);
  const clampedScore = Math.max(1, Math.min(5, roundedScore));
  const label = INSPECTION_CONDITION_LABELS[clampedScore] ?? "Unknown";

  return {
    name,
    score: Math.round(avgScore * 10) / 10,
    label,
    itemCount: checklistItems.length,
    completedCount,
  };
}

// ============================================
// Main Component
// ============================================

export function InspectionGroupChecklist({
  sections,
  projectId,
  inspectionType,
  role = "owner",
  currentUserId,
}: InspectionGroupChecklistProps) {
  const router = useRouter();

  // Track expanded checklist items (by checklist item id)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Track items being created (loading state)
  const [creatingItems, setCreatingItems] = useState<Set<string>>(new Set());

  // Track local priority overrides for health score calculation
  // Map<findingId, priority>
  const [localPriorities, setLocalPriorities] = useState<Map<string, number | null>>(
    new Map()
  );

  // Track deleted finding ids so we can hide them immediately
  const [deletedFindings, setDeletedFindings] = useState<Set<string>>(new Set());

  // Custom finding state per section
  const [customFindingSections, setCustomFindingSections] = useState<Set<string>>(
    new Set()
  );
  const [customTitles, setCustomTitles] = useState<Map<string, string>>(new Map());
  const [addingCustom, setAddingCustom] = useState<Set<string>>(new Set());

  // Collapsed sub-sections
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // N/A toggles — track locally so UI updates instantly
  const [naOverrides, setNaOverrides] = useState<Map<string, boolean>>(
    () => new Map(sections.map((s) => [s.projectSection.id, s.projectSection.is_na ?? false]))
  );

  const handleToggleNA = useCallback(
    async (projectSectionId: string, currentNa: boolean) => {
      const newNa = !currentNa;
      setNaOverrides((prev) => {
        const next = new Map(prev);
        next.set(projectSectionId, newNa);
        return next;
      });
      try {
        await toggleInspectionSectionNA(projectSectionId, projectId, newNa);
      } catch (err) {
        console.error("Failed to toggle N/A:", err);
        // revert on error
        setNaOverrides((prev) => {
          const next = new Map(prev);
          next.set(projectSectionId, currentNa);
          return next;
        });
      }
    },
    [projectId]
  );

  const handlePriorityChange = useCallback(
    (findingId: string, newPriority: number | null) => {
      setLocalPriorities((prev) => {
        const next = new Map(prev);
        next.set(findingId, newPriority);
        return next;
      });
    },
    []
  );

  const handleFindingDeleted = useCallback((findingId: string) => {
    setDeletedFindings((prev) => new Set(prev).add(findingId));
    setLocalPriorities((prev) => {
      const next = new Map(prev);
      next.delete(findingId);
      return next;
    });
  }, []);

  const handleChecklistItemClick = useCallback(
    async (
      item: InspectionChecklistItem,
      sectionData: SectionData
    ) => {
      // Find existing findings for this checklist item (exclude deleted)
      const existingFindings = sectionData.findings.filter(
        (f) =>
          f.checklist_item_id === item.id && !deletedFindings.has(f.id)
      );

      if (existingFindings.length > 0) {
        // Toggle expand/collapse
        setExpandedItems((prev) => {
          const next = new Set(prev);
          if (next.has(item.id)) {
            next.delete(item.id);
          } else {
            next.add(item.id);
          }
          return next;
        });
      } else {
        // Create new finding and expand
        setCreatingItems((prev) => new Set(prev).add(item.id));
        try {
          await createInspectionFinding({
            project_id: projectId,
            project_section_id: sectionData.projectSection.id,
            checklist_item_id: item.id,
            unit_id: null,
            title: item.name,
          });
          setExpandedItems((prev) => new Set(prev).add(item.id));
          router.refresh();
        } catch (err) {
          console.error("Failed to create finding:", err);
        } finally {
          setCreatingItems((prev) => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
        }
      }
    },
    [projectId, router, deletedFindings]
  );

  // Add a sibling finding for a checklist item (called from FindingCard's "Add Finding" button)
  const handleAddSiblingFinding = useCallback(
    async (
      checklistItemId: string | null,
      sectionData: SectionData,
      title: string
    ) => {
      try {
        await createInspectionFinding({
          project_id: projectId,
          project_section_id: sectionData.projectSection.id,
          checklist_item_id: checklistItemId,
          unit_id: null,
          title,
        });
        router.refresh();
      } catch (err) {
        console.error("Failed to add sibling finding:", err);
      }
    },
    [projectId, router]
  );

  const handleAddCustomFinding = useCallback(
    async (sectionData: SectionData) => {
      const title = customTitles.get(sectionData.projectSection.id) ?? "";
      if (!title.trim()) return;

      setAddingCustom((prev) => new Set(prev).add(sectionData.projectSection.id));
      try {
        await createInspectionFinding({
          project_id: projectId,
          project_section_id: sectionData.projectSection.id,
          checklist_item_id: null,
          unit_id: null,
          title: title.trim(),
        });
        setCustomTitles((prev) => {
          const next = new Map(prev);
          next.delete(sectionData.projectSection.id);
          return next;
        });
        setCustomFindingSections((prev) => {
          const next = new Set(prev);
          next.delete(sectionData.projectSection.id);
          return next;
        });
        router.refresh();
      } catch (err) {
        console.error("Failed to create custom finding:", err);
      } finally {
        setAddingCustom((prev) => {
          const next = new Set(prev);
          next.delete(sectionData.projectSection.id);
          return next;
        });
      }
    },
    [projectId, router, customTitles]
  );

  // Compute health scores (exclude N/A sections)
  const healthScores = useMemo(() => {
    return sections.map((s) => {
      const isNa = naOverrides.get(s.projectSection.id) ?? false;
      if (isNa) {
        return {
          name: s.projectSection.display_name_override ?? s.projectSection.section.name,
          score: -1, // sentinel for N/A
          label: "N/A",
          itemCount: s.checklistItems.length,
          completedCount: 0,
        } as SubsectionHealth;
      }
      const activeFindings = s.findings.filter((f) => !deletedFindings.has(f.id));
      return computeSubsectionHealth(
        s.checklistItems,
        activeFindings,
        localPriorities,
        s.projectSection.display_name_override ?? s.projectSection.section.name
      );
    });
  }, [sections, localPriorities, deletedFindings, naOverrides]);

  const overallScore = useMemo(() => {
    const scoredSections = healthScores.filter((h) => h.score >= 0);
    if (scoredSections.length === 0) return 5;
    const avg = scoredSections.reduce((sum, h) => sum + h.score, 0) / scoredSections.length;
    return Math.round(avg * 10) / 10;
  }, [healthScores]);

  return (
    <div className="space-y-6">
      {sections.map((sectionData) => {
        const { projectSection, checklistItems, findings, captures } = sectionData;
        const sectionName =
          projectSection.display_name_override ?? projectSection.section.name;
        const isCollapsed = collapsedSections.has(projectSection.id);
        const isNa = naOverrides.get(projectSection.id) ?? false;

        // Build finding lookup by checklist_item_id (excluding deleted) — 1:many
        const findingsByChecklist = new Map<string, InspectionFinding[]>();
        const customFindings: InspectionFinding[] = [];
        findings.forEach((f) => {
          if (deletedFindings.has(f.id)) return;
          if (f.checklist_item_id) {
            const existing = findingsByChecklist.get(f.checklist_item_id) ?? [];
            existing.push(f);
            findingsByChecklist.set(f.checklist_item_id, existing);
          } else {
            customFindings.push(f);
          }
        });

        // Get health for this sub-section
        const health = healthScores.find((h) => h.name === sectionName);
        const healthColor = isNa
          ? "bg-surface-tertiary text-content-muted border-edge-primary"
          : health
            ? health.score >= 4.5
              ? "bg-green-100 text-green-700 border-green-200"
              : health.score >= 3.5
                ? "bg-lime-100 text-lime-700 border-lime-200"
                : health.score >= 2.5
                  ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                  : health.score >= 1.5
                    ? "bg-orange-100 text-orange-700 border-orange-200"
                    : "bg-red-100 text-red-700 border-red-200"
            : "bg-surface-tertiary text-content-tertiary border-edge-primary";

        const sectionBorder = isNa
          ? "border-gray-300/40"
          : health
            ? health.score >= 4.5
              ? "border-green-500/40"
              : health.score >= 3.5
                ? "border-lime-500/40"
                : health.score >= 2.5
                  ? "border-yellow-500/40"
                  : health.score >= 1.5
                    ? "border-orange-500/40"
                    : "border-red-500/40"
            : "border-gray-300/40";

        return (
          <div
            key={projectSection.id}
            className={`bg-surface-primary rounded-lg border-2 ${sectionBorder} overflow-hidden shadow-sm ${isNa ? "opacity-60" : ""}`}
          >
            {/* Sub-section header */}
            <div className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-50 to-white">
              <button
                onClick={() =>
                  setCollapsedSections((prev) => {
                    const next = new Set(prev);
                    if (next.has(projectSection.id)) next.delete(projectSection.id);
                    else next.add(projectSection.id);
                    return next;
                  })
                }
                className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity"
              >
                <span
                  className={`text-xs text-content-quaternary transition-transform ${
                    isCollapsed ? "" : "rotate-90"
                  }`}
                >
                  ▶
                </span>
                <h3 className={`text-sm font-bold ${isNa ? "text-content-muted line-through" : "text-content-primary"}`}>
                  {sectionName}
                </h3>
                <span className="text-xs text-content-muted font-medium">
                  {checklistItems.length} item{checklistItems.length !== 1 ? "s" : ""}
                </span>
              </button>
              <div className="flex items-center gap-3 flex-shrink-0">
                {health && (
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${healthColor}`}
                  >
                    {isNa ? "N/A" : `${health.score.toFixed(1)} — ${health.label}`}
                  </span>
                )}
                {/* N/A toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleNA(projectSection.id, isNa);
                  }}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    isNa ? "bg-gray-400" : "bg-gray-200"
                  }`}
                  title={isNa ? "Section marked N/A — click to re-enable" : "Mark section as N/A (not applicable)"}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-surface-primary shadow-sm transition-transform ${
                      isNa ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <span className={`text-xs font-medium ${isNa ? "text-content-quaternary" : "text-content-muted"}`}>
                  N/A
                </span>
              </div>
            </div>

            {/* Checklist items */}
            {!isCollapsed && (
              <div className="border-t border-edge-tertiary">
                {checklistItems.map((item) => {
                  const itemFindings = findingsByChecklist.get(item.id) ?? [];
                  const hasFindings = itemFindings.length > 0;
                  const isExpanded = expandedItems.has(item.id);
                  const isCreating = creatingItems.has(item.id);

                  // Gather all captures across all findings for this item
                  const allItemCaptures = hasFindings
                    ? captures.filter((c) =>
                        itemFindings.some((f) => f.id === c.finding_id)
                      )
                    : [];

                  // Determine worst priority across all findings for badge display
                  let worstPriority: number | null = null;
                  if (hasFindings) {
                    itemFindings.forEach((f) => {
                      const p = localPriorities.has(f.id)
                        ? localPriorities.get(f.id)!
                        : f.priority;
                      if (p !== null) {
                        if (worstPriority === null || p < worstPriority) {
                          worstPriority = p;
                        }
                      }
                    });
                  }

                  const priorityInfo = worstPriority
                    ? PRIORITY_LABELS[worstPriority as PriorityLevel]
                    : null;

                  return (
                    <div key={item.id}>
                      {/* Checklist item row */}
                      <button
                        onClick={() =>
                          handleChecklistItemClick(item, sectionData)
                        }
                        disabled={isCreating}
                        className={`w-full flex items-center justify-between px-4 py-2.5 transition-all disabled:opacity-50 border-b border-edge-tertiary last:border-b-0 ${
                          isExpanded
                            ? "bg-brand-50/50"
                            : hasFindings
                              ? "hover:bg-brand-50/30"
                              : "hover:bg-surface-secondary"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span
                            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors ${
                              hasFindings
                                ? worstPriority !== null && worstPriority <= 2
                                  ? "bg-red-500"
                                  : worstPriority === 3
                                    ? "bg-yellow-500"
                                    : "bg-brand-500"
                                : "bg-charcoal-300"
                            }`}
                          />
                          <span className={`text-sm text-left ${hasFindings ? "text-content-primary font-medium" : "text-content-tertiary"}`}>
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isCreating ? (
                            <span className="text-xs text-content-muted">
                              Creating...
                            </span>
                          ) : hasFindings ? (
                            <>
                              {itemFindings.length > 1 && (
                                <span className="text-xs bg-gold-100 text-gold-800 px-1.5 py-0.5 rounded-full font-medium">
                                  {itemFindings.length} findings
                                </span>
                              )}
                              {priorityInfo ? (
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityInfo.bgColor}`}
                                >
                                  {priorityInfo.label}
                                </span>
                              ) : (
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${GOOD_LABEL.bgColor}`}
                                >
                                  Good
                                </span>
                              )}
                              {allItemCaptures.length > 0 && (
                                <span className="text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-medium">
                                  {allItemCaptures.length}
                                </span>
                              )}
                              <span
                                className={`text-xs transition-transform ${
                                  isExpanded ? "rotate-90" : ""
                                }`}
                              >
                                ▶
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-gold-600 font-medium">
                              Tap to inspect
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Inline FindingCards when expanded — one per finding */}
                      {isExpanded && hasFindings && (
                        <div className="px-4 pb-3 space-y-2">
                          {itemFindings.map((finding) => {
                            const findingCaptures = captures.filter(
                              (c) => c.finding_id === finding.id
                            );
                            return (
                              <FindingCard
                                key={finding.id}
                                finding={finding}
                                captures={findingCaptures}
                                projectId={projectId}
                                projectSectionId={projectSection.id}
                                sectionSlug={projectSection.section.slug}
                                inspectionType={inspectionType}
                                defaultExpanded={true}
                                role={role}
                                currentUserId={currentUserId}
                                onPriorityChange={handlePriorityChange}
                                onDeleted={handleFindingDeleted}
                                onAddFinding={() =>
                                  handleAddSiblingFinding(
                                    item.id,
                                    sectionData,
                                    item.name
                                  )
                                }
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Custom findings that aren't linked to checklist items */}
                {customFindings.map((finding) => {
                  const isExpanded = expandedItems.has(`custom-${finding.id}`);
                  const itemCaptures = captures.filter(
                    (c) => c.finding_id === finding.id
                  );
                  const currentPriority = localPriorities.has(finding.id)
                    ? localPriorities.get(finding.id)
                    : finding.priority;
                  const priorityInfo = currentPriority
                    ? PRIORITY_LABELS[currentPriority as PriorityLevel]
                    : null;

                  return (
                    <div key={finding.id}>
                      <button
                        onClick={() =>
                          setExpandedItems((prev) => {
                            const next = new Set(prev);
                            const key = `custom-${finding.id}`;
                            if (next.has(key)) next.delete(key);
                            else next.add(key);
                            return next;
                          })
                        }
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-secondary transition-colors border-b border-gray-50"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="w-2 h-2 rounded-full flex-shrink-0 bg-gold-500" />
                          <span className="text-sm text-content-primary text-left italic">
                            {finding.title}
                          </span>
                          <span className="text-xs text-gold-600">Custom</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {priorityInfo ? (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityInfo.bgColor}`}
                            >
                              {priorityInfo.label}
                            </span>
                          ) : (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${GOOD_LABEL.bgColor}`}
                            >
                              Good
                            </span>
                          )}
                          <span
                            className={`text-xs transition-transform ${
                              isExpanded ? "rotate-90" : ""
                            }`}
                          >
                            ▶
                          </span>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-3">
                          <FindingCard
                            finding={finding}
                            captures={itemCaptures}
                            projectId={projectId}
                            projectSectionId={projectSection.id}
                            sectionSlug={projectSection.section.slug}
                            inspectionType={inspectionType}
                            defaultExpanded={true}
                            role={role}
                            currentUserId={currentUserId}
                            onPriorityChange={handlePriorityChange}
                            onDeleted={handleFindingDeleted}
                            onAddFinding={() =>
                              handleAddSiblingFinding(
                                null,
                                sectionData,
                                finding.title
                              )
                            }
                          />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add custom finding */}
                <div className="px-4 py-2 border-t border-edge-tertiary">
                  {customFindingSections.has(projectSection.id) ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customTitles.get(projectSection.id) ?? ""}
                        onChange={(e) =>
                          setCustomTitles((prev) => {
                            const next = new Map(prev);
                            next.set(projectSection.id, e.target.value);
                            return next;
                          })
                        }
                        placeholder="Custom finding title..."
                        className="flex-1 px-3 py-1.5 text-sm border border-edge-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        autoFocus
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            (customTitles.get(projectSection.id) ?? "").trim()
                          ) {
                            handleAddCustomFinding(sectionData);
                          }
                          if (e.key === "Escape") {
                            setCustomFindingSections((prev) => {
                              const next = new Set(prev);
                              next.delete(projectSection.id);
                              return next;
                            });
                            setCustomTitles((prev) => {
                              const next = new Map(prev);
                              next.delete(projectSection.id);
                              return next;
                            });
                          }
                        }}
                      />
                      <button
                        onClick={() => handleAddCustomFinding(sectionData)}
                        disabled={
                          !(customTitles.get(projectSection.id) ?? "").trim() ||
                          addingCustom.has(projectSection.id)
                        }
                        className="px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 font-medium"
                      >
                        {addingCustom.has(projectSection.id) ? "..." : "Add"}
                      </button>
                      <button
                        onClick={() => {
                          setCustomFindingSections((prev) => {
                            const next = new Set(prev);
                            next.delete(projectSection.id);
                            return next;
                          });
                          setCustomTitles((prev) => {
                            const next = new Map(prev);
                            next.delete(projectSection.id);
                            return next;
                          });
                        }}
                        className="px-2 py-1.5 text-sm text-content-quaternary hover:text-content-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() =>
                        setCustomFindingSections((prev) =>
                          new Set(prev).add(projectSection.id)
                        )
                      }
                      className="text-sm text-brand-600 hover:text-brand-800 font-medium transition-colors"
                    >
                      + Add Custom Finding
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* System Health Report */}
      <HealthReport
        sections={healthScores}
        overallScore={overallScore}
      />
    </div>
  );
}

// ============================================
// Inline Health Report
// ============================================

function HealthReport({
  sections,
  overallScore,
}: {
  sections: SubsectionHealth[];
  overallScore: number;
}) {
  if (sections.length === 0) return null;

  const overallRounded = Math.max(1, Math.min(5, Math.round(overallScore)));
  const overallLabel = INSPECTION_CONDITION_LABELS[overallRounded] ?? "Unknown";

  const getBarColor = (score: number) => {
    if (score >= 4.5) return "bg-green-500";
    if (score >= 3.5) return "bg-lime-500";
    if (score >= 2.5) return "bg-yellow-500";
    if (score >= 1.5) return "bg-orange-500";
    return "bg-red-500";
  };

  const getBadgeColor = (score: number) => {
    if (score >= 4.5) return "bg-green-100 text-green-700";
    if (score >= 3.5) return "bg-lime-100 text-lime-700";
    if (score >= 2.5) return "bg-yellow-100 text-yellow-700";
    if (score >= 1.5) return "bg-orange-100 text-orange-700";
    return "bg-red-100 text-red-700";
  };

  return (
    <div className="bg-gradient-to-br from-charcoal-900 to-charcoal-800 rounded-xl p-5 shadow-lg">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-1.5 h-5 bg-gold-500 rounded-full" />
        <h3 className="text-sm font-bold text-gold-400 uppercase tracking-wider">
          System Health Report
        </h3>
      </div>

      <div className="space-y-3">
        {sections.map((section) => (
          <div key={section.name} className={`flex items-center gap-3 ${section.score < 0 ? "opacity-50" : ""}`}>
            <span className="text-sm text-charcoal-200 min-w-[180px] truncate font-medium">
              {section.name}
            </span>
            {section.score < 0 ? (
              <>
                <div className="flex-1 h-2.5 bg-charcoal-700 rounded-full overflow-hidden" />
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold min-w-[100px] text-center bg-charcoal-600 text-charcoal-300">
                  N/A
                </span>
              </>
            ) : (
              <>
                <div className="flex-1 h-2.5 bg-charcoal-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getBarColor(
                      section.score
                    )}`}
                    style={{ width: `${(section.score / 5) * 100}%` }}
                  />
                </div>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-semibold min-w-[100px] text-center ${getBadgeColor(
                    section.score
                  )}`}
                >
                  {section.score.toFixed(1)} — {section.label}
                </span>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Overall */}
      <div className="mt-5 pt-4 border-t border-charcoal-700">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gold-300 uppercase tracking-wide">
            Overall Score
          </span>
          <span
            className={`text-sm px-4 py-1.5 rounded-full font-bold shadow-sm ${getBadgeColor(
              overallScore
            )}`}
          >
            {overallScore.toFixed(1)} — {overallLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
