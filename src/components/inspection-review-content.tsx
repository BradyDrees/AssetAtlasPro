"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { updateInspectionProjectStatus } from "@/app/actions/inspections";
import {
  PRIORITY_LABELS,
  RISK_FLAG_LABELS,
  INSPECTION_CONDITION_LABELS,
  RUL_COLORS,
} from "@/lib/inspection-constants";
import type {
  InspectionProject,
  InspectionSectionGroup,
  InspectionFinding,
  InspectionUnit,
  InspectionCapture,
  PriorityLevel,
  RiskFlag,
  ProjectStatus,
} from "@/lib/inspection-types";

const riskFlagKey = (flag: string) => {
  const map: Record<string, string> = {
    life_safety: "lifeSafety",
    water_intrusion: "waterIntrusion",
    electrical_hazard: "electricalHazard",
    structural: "structural",
  };
  return map[flag] ?? flag;
};

interface InspectionReviewContentProps {
  project: InspectionProject;
  groupedSections: InspectionSectionGroup[];
  findings: InspectionFinding[];
  units: InspectionUnit[];
  allCaptures: InspectionCapture[];
  metrics: {
    totalFindings: number;
    immediateFindings: number;
    urgentFindings: number;
    shortTermFindings: number;
    immediateExposure: number;
    shortTermExposure: number;
    totalExposure: number;
    totalUnits: number;
    totalCaptures: number;
    riskFlagCounts: Record<string, number>;
    sectionsWithoutRating: number;
    sectionsWithoutRul: number;
  };
}

export function InspectionReviewContent({
  project,
  groupedSections,
  findings,
  units,
  allCaptures,
  metrics,
}: InspectionReviewContentProps) {
  const t = useTranslations();
  const router = useRouter();
  const [status, setStatus] = useState(project.status);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [expandedRiskFlags, setExpandedRiskFlags] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const isBankReady = project.inspection_type === "bank_ready";

  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(true);
    try {
      await updateInspectionProjectStatus(
        project.id,
        newStatus as ProjectStatus
      );
      setStatus(newStatus as ProjectStatus);
      router.refresh();
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const fmtCurrency = (val: number) =>
    "$" + val.toLocaleString();

  return (
    <div className="space-y-6">
      {/* Status Control */}
      <div className="bg-surface-primary rounded-lg border border-edge-primary p-4">
        <h3 className="text-sm font-semibold text-content-secondary mb-2">
          {t("inspection.projectStatus")}
        </h3>
        <div className="flex gap-2">
          {(["DRAFT", "IN_PROGRESS", "COMPLETE"] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              disabled={updatingStatus}
              className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                status === s
                  ? s === "COMPLETE"
                    ? "bg-green-600 text-white border-green-600"
                    : s === "IN_PROGRESS"
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-gray-600 text-white border-gray-600"
                  : "bg-surface-primary text-content-tertiary border-edge-secondary hover:bg-surface-secondary"
              } disabled:opacity-50`}
            >
              {s === "IN_PROGRESS" ? t("common.inProgress") : s === "COMPLETE" ? t("common.complete") : t("common.draft")}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label={t("review.totalFindings")}
          value={metrics.totalFindings.toString()}
        />
        <MetricCard
          label={t("review.immediateP1")}
          value={metrics.immediateFindings.toString()}
          color="text-red-700"
        />
        <MetricCard
          label={t("review.urgentP2")}
          value={metrics.urgentFindings.toString()}
          color="text-orange-700"
        />
        <MetricCard
          label={t("review.shortTermP3")}
          value={metrics.shortTermFindings.toString()}
          color="text-yellow-700"
        />
      </div>

      {/* Exposure Summary */}
      <div className="bg-surface-primary rounded-lg border border-edge-primary p-4">
        <h3 className="text-sm font-semibold text-content-secondary mb-3">
          {t("review.repairExposureSummary")}
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-content-quaternary">{t("review.immediateRepairs")}</p>
            <p className="text-lg font-bold text-red-700">
              {fmtCurrency(metrics.immediateExposure)}
            </p>
          </div>
          <div>
            <p className="text-xs text-content-quaternary">{t("review.shortTermMonths")}</p>
            <p className="text-lg font-bold text-orange-700">
              {fmtCurrency(metrics.shortTermExposure)}
            </p>
          </div>
          <div>
            <p className="text-xs text-content-quaternary">{t("review.totalIdentified")}</p>
            <p className="text-lg font-bold text-content-primary">
              {fmtCurrency(metrics.totalExposure)}
            </p>
          </div>
        </div>
      </div>

      {/* Risk Flags — expandable */}
      {Object.keys(metrics.riskFlagCounts).length > 0 && (
        <div className="bg-surface-primary rounded-lg border border-edge-primary p-4">
          <h3 className="text-sm font-semibold text-content-secondary mb-3">
            {t("review.riskFlags")}
          </h3>
          <div className="space-y-2">
            {Object.entries(metrics.riskFlagCounts).map(([flag, count]) => {
              const info = RISK_FLAG_LABELS[flag as RiskFlag];
              const isExpanded = expandedRiskFlags.has(flag);
              const flagFindings = findings.filter(
                (f) => (f.risk_flags ?? []).includes(flag as RiskFlag)
              );
              return (
                <div key={flag}>
                  <button
                    onClick={() =>
                      setExpandedRiskFlags((prev) => {
                        const next = new Set(prev);
                        if (next.has(flag)) next.delete(flag);
                        else next.add(flag);
                        return next;
                      })
                    }
                    className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm rounded-full font-medium transition-all ${
                      info?.color ?? "bg-surface-tertiary text-content-tertiary"
                    } ${isExpanded ? "ring-2 ring-offset-1 ring-current" : "hover:opacity-80"}`}
                  >
                    <span
                      className={`text-[10px] transition-transform ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    >
                      ▶
                    </span>
                    {t(`inspection.riskFlags.${riskFlagKey(flag)}`)}: {count}
                  </button>
                  {isExpanded && flagFindings.length > 0 && (
                    <div className="mt-2 ml-2 space-y-1.5 border-l-2 border-edge-primary pl-3">
                      {flagFindings.map((f) => {
                        const pInfo = f.priority
                          ? PRIORITY_LABELS[f.priority as PriorityLevel]
                          : null;
                        const sectionPs = groupedSections
                          .flatMap((g) => g.sections)
                          .find((s) => s.id === f.project_section_id);
                        return (
                          <div
                            key={f.id}
                            className="flex items-center gap-2 py-1 text-sm"
                          >
                            {pInfo ? (
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${pInfo.bgColor}`}
                              >
                                P{f.priority}
                              </span>
                            ) : (
                              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-surface-tertiary text-content-quaternary">
                                {t("inspection.good.label")}
                              </span>
                            )}
                            <span className="text-content-primary font-medium">
                              {f.title || t("common.untitled")}
                            </span>
                            {f.location && (
                              <span className="text-xs text-content-muted">
                                📍 {f.location}
                              </span>
                            )}
                            {sectionPs && (
                              <span className="text-xs text-content-muted">
                                — {sectionPs.section.name}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity by Section — expandable */}
      <div className="bg-surface-primary rounded-lg border border-edge-primary p-4">
        <h3 className="text-sm font-semibold text-content-secondary mb-3">
          {t("inspection.activityBySection")}
        </h3>
        {groupedSections.map((group) => (
          <div key={group.group_name} className="mb-4 last:mb-0">
            <h4 className="text-xs font-semibold text-content-quaternary uppercase tracking-wide mb-2">
              {group.group_name}
            </h4>
            <div className="space-y-1">
              {group.sections.map((section) => {
                const sectionFindings = findings.filter(
                  (f) => f.project_section_id === section.id
                );
                const sectionCaptures = allCaptures.filter(
                  (c) => c.project_section_id === section.id
                );
                const sectionUnits = units.filter(
                  (u) => u.project_section_id === section.id
                );
                const conditionLabel = section.condition_rating
                  ? INSPECTION_CONDITION_LABELS[section.condition_rating]
                  : null;
                const rulBucket = section.rul_bucket;
                const isExpanded = expandedSections.has(section.id);
                const hasDetails = sectionFindings.length > 0 || sectionUnits.length > 0;

                return (
                  <div key={section.id}>
                    <button
                      onClick={() =>
                        setExpandedSections((prev) => {
                          const next = new Set(prev);
                          if (next.has(section.id)) next.delete(section.id);
                          else next.add(section.id);
                          return next;
                        })
                      }
                      className={`w-full flex items-center justify-between py-1.5 px-2 rounded transition-colors ${
                        isExpanded ? "bg-surface-tertiary" : "hover:bg-surface-secondary"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {hasDetails && (
                          <span
                            className={`text-[10px] text-content-muted transition-transform ${
                              isExpanded ? "rotate-90" : ""
                            }`}
                          >
                            ▶
                          </span>
                        )}
                        <span className="text-sm text-content-primary">
                          {section.section.name}
                        </span>
                        {section.is_na && (
                          <span className="text-xs bg-surface-tertiary text-content-muted px-1.5 py-0.5 rounded-full">
                            {t("common.na")}
                          </span>
                        )}
                        {section.condition_rating && (
                          <span className="text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">
                            {t(`inspection.condition.${section.condition_rating}`)}
                          </span>
                        )}
                        {rulBucket && (
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded-full ${
                              RUL_COLORS[
                                rulBucket as keyof typeof RUL_COLORS
                              ] ?? "bg-surface-tertiary text-content-tertiary"
                            }`}
                          >
                            {rulBucket}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        {sectionUnits.length > 0 && (
                          <span className="text-green-600">
                            {sectionUnits.length} {sectionUnits.length === 1 ? t("pdf.tableHeaders.unit") : t("pdf.tableHeaders.unit") + "s"}
                          </span>
                        )}
                        {sectionFindings.length > 0 && (
                          <span className="text-orange-600">
                            {sectionFindings.length} {sectionFindings.length === 1 ? t("pdf.tableHeaders.finding") : t("pdf.tableHeaders.findings")}
                          </span>
                        )}
                        <span className="text-brand-600">
                          {sectionCaptures.length} {t("pdf.tableHeaders.photos").toLowerCase()}
                        </span>
                      </div>
                    </button>
                    {/* Expanded details */}
                    {isExpanded && hasDetails && (
                      <div className="ml-6 mt-1 mb-2 space-y-1 border-l-2 border-edge-primary pl-3">
                        {sectionFindings.map((f) => {
                          const pInfo = f.priority
                            ? PRIORITY_LABELS[f.priority as PriorityLevel]
                            : null;
                          return (
                            <div
                              key={f.id}
                              className="flex items-center gap-2 py-0.5 text-sm"
                            >
                              {pInfo ? (
                                <span
                                  className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${pInfo.bgColor}`}
                                >
                                  P{f.priority}
                                </span>
                              ) : (
                                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-surface-tertiary text-content-quaternary">
                                  {t("inspection.good.label")}
                                </span>
                              )}
                              <span className="text-content-primary">
                                {f.title || t("common.untitled")}
                              </span>
                              {f.location && (
                                <span className="text-xs text-content-muted">
                                  📍 {f.location}
                                </span>
                              )}
                              {f.notes && (
                                <span className="text-xs text-content-muted truncate max-w-[200px]">
                                  — {f.notes}
                                </span>
                              )}
                            </div>
                          );
                        })}
                        {sectionUnits.length > 0 && (
                          <div className="pt-1">
                            <span className="text-xs font-medium text-content-quaternary">
                              {t("inspection.sectionGroups.units")}:
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {sectionUnits.slice(0, 20).map((u) => (
                                <span
                                  key={u.id}
                                  className="text-xs bg-surface-tertiary text-content-tertiary px-1.5 py-0.5 rounded"
                                >
                                  {u.building}-{u.unit_number}
                                </span>
                              ))}
                              {sectionUnits.length > 20 && (
                                <span className="text-xs text-content-muted">
                                  {t("common.more", { count: sectionUnits.length - 20 })}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bank-Ready Warnings */}
      {isBankReady && (
        <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">
            {t("review.bankReadyValidation")}
          </h3>
          <BankReadyCheck
            label={t("review.allFindingsHavePriority")}
            ok={findings.every((f) => f.priority !== null)}
          />
          <BankReadyCheck
            label={t("review.p1to3HaveExposure")}
            ok={findings
              .filter((f) => f.priority && f.priority <= 3)
              .every((f) => f.exposure_bucket !== null)}
          />
          <BankReadyCheck
            label={t("review.allSectionsHaveCondition")}
            ok={metrics.sectionsWithoutRating === 0}
          />
          <BankReadyCheck
            label={t("review.allSectionsHaveRul")}
            ok={metrics.sectionsWithoutRul === 0}
          />
          <BankReadyCheck
            label={t("review.p1to2HavePhotos")}
            ok={findings
              .filter((f) => f.priority && f.priority <= 2)
              .every((f) =>
                allCaptures.some((c) => c.finding_id === f.id)
              )}
          />
        </div>
      )}

      {/* Totals bar */}
      <div className="bg-surface-primary rounded-lg border border-edge-primary p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-content-tertiary">
            {metrics.totalUnits} {t("inspection.sectionGroups.units").toLowerCase()} &bull; {metrics.totalFindings} {t("pdf.tableHeaders.findings").toLowerCase()}
            &bull; {metrics.totalCaptures} {t("pdf.tableHeaders.photos").toLowerCase()}
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      {isBankReady && (
        <div className="text-xs text-content-muted italic leading-relaxed">
          {t("pdf.disclaimer")}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  color = "text-content-primary",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-surface-primary rounded-lg border border-edge-primary p-4">
      <p className="text-xs text-content-quaternary">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function BankReadyCheck({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className={`text-sm ${ok ? "text-green-600" : "text-red-600"}`}>
        {ok ? "✓" : "✗"}
      </span>
      <span
        className={`text-sm ${ok ? "text-content-secondary" : "text-red-700 font-medium"}`}
      >
        {label}
      </span>
    </div>
  );
}
