"use client";

import { useState } from "react";
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
    "$" + val.toLocaleString("en-US");

  return (
    <div className="space-y-6">
      {/* Status Control */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Project Status
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
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              } disabled:opacity-50`}
            >
              {s === "IN_PROGRESS" ? "In Progress" : s === "COMPLETE" ? "Complete" : "Draft"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Findings"
          value={metrics.totalFindings.toString()}
        />
        <MetricCard
          label="Immediate (P1)"
          value={metrics.immediateFindings.toString()}
          color="text-red-700"
        />
        <MetricCard
          label="Urgent (P2)"
          value={metrics.urgentFindings.toString()}
          color="text-orange-700"
        />
        <MetricCard
          label="Short-term (P3)"
          value={metrics.shortTermFindings.toString()}
          color="text-yellow-700"
        />
      </div>

      {/* Exposure Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Repair Exposure Summary
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500">Immediate Repairs</p>
            <p className="text-lg font-bold text-red-700">
              {fmtCurrency(metrics.immediateExposure)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Short-Term (0–6 months)</p>
            <p className="text-lg font-bold text-orange-700">
              {fmtCurrency(metrics.shortTermExposure)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Identified</p>
            <p className="text-lg font-bold text-gray-900">
              {fmtCurrency(metrics.totalExposure)}
            </p>
          </div>
        </div>
      </div>

      {/* Risk Flags — expandable */}
      {Object.keys(metrics.riskFlagCounts).length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Risk Flags
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
                      info?.color ?? "bg-gray-100 text-gray-600"
                    } ${isExpanded ? "ring-2 ring-offset-1 ring-current" : "hover:opacity-80"}`}
                  >
                    <span
                      className={`text-[10px] transition-transform ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    >
                      ▶
                    </span>
                    {info?.label ?? flag}: {count}
                  </button>
                  {isExpanded && flagFindings.length > 0 && (
                    <div className="mt-2 ml-2 space-y-1.5 border-l-2 border-gray-200 pl-3">
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
                              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">
                                Good
                              </span>
                            )}
                            <span className="text-gray-800 font-medium">
                              {f.title || "Untitled"}
                            </span>
                            {f.location && (
                              <span className="text-xs text-gray-400">
                                📍 {f.location}
                              </span>
                            )}
                            {sectionPs && (
                              <span className="text-xs text-gray-400">
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
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Activity by Section
        </h3>
        {groupedSections.map((group) => (
          <div key={group.group_name} className="mb-4 last:mb-0">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
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
                        isExpanded ? "bg-gray-100" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {hasDetails && (
                          <span
                            className={`text-[10px] text-gray-400 transition-transform ${
                              isExpanded ? "rotate-90" : ""
                            }`}
                          >
                            ▶
                          </span>
                        )}
                        <span className="text-sm text-gray-800">
                          {section.section.name}
                        </span>
                        {section.is_na && (
                          <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">
                            N/A
                          </span>
                        )}
                        {conditionLabel && (
                          <span className="text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">
                            {conditionLabel}
                          </span>
                        )}
                        {rulBucket && (
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded-full ${
                              RUL_COLORS[
                                rulBucket as keyof typeof RUL_COLORS
                              ] ?? "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {rulBucket}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        {sectionUnits.length > 0 && (
                          <span className="text-green-600">
                            {sectionUnits.length} units
                          </span>
                        )}
                        {sectionFindings.length > 0 && (
                          <span className="text-orange-600">
                            {sectionFindings.length} findings
                          </span>
                        )}
                        <span className="text-brand-600">
                          {sectionCaptures.length} photos
                        </span>
                      </div>
                    </button>
                    {/* Expanded details */}
                    {isExpanded && hasDetails && (
                      <div className="ml-6 mt-1 mb-2 space-y-1 border-l-2 border-gray-200 pl-3">
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
                                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">
                                  Good
                                </span>
                              )}
                              <span className="text-gray-800">
                                {f.title || "Untitled"}
                              </span>
                              {f.location && (
                                <span className="text-xs text-gray-400">
                                  📍 {f.location}
                                </span>
                              )}
                              {f.notes && (
                                <span className="text-xs text-gray-400 truncate max-w-[200px]">
                                  — {f.notes}
                                </span>
                              )}
                            </div>
                          );
                        })}
                        {sectionUnits.length > 0 && (
                          <div className="pt-1">
                            <span className="text-xs font-medium text-gray-500">
                              Units:
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {sectionUnits.slice(0, 20).map((u) => (
                                <span
                                  key={u.id}
                                  className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                                >
                                  {u.building}-{u.unit_number}
                                </span>
                              ))}
                              {sectionUnits.length > 20 && (
                                <span className="text-xs text-gray-400">
                                  +{sectionUnits.length - 20} more
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
            Bank-Ready Validation
          </h3>
          <BankReadyCheck
            label="All findings have priority assigned"
            ok={findings.every((f) => f.priority !== null)}
          />
          <BankReadyCheck
            label="Priority 1-3 findings have exposure"
            ok={findings
              .filter((f) => f.priority && f.priority <= 3)
              .every((f) => f.exposure_bucket !== null)}
          />
          <BankReadyCheck
            label="All sections have condition rating"
            ok={metrics.sectionsWithoutRating === 0}
          />
          <BankReadyCheck
            label="All sections have RUL"
            ok={metrics.sectionsWithoutRul === 0}
          />
          <BankReadyCheck
            label="Priority 1-2 findings have photos"
            ok={findings
              .filter((f) => f.priority && f.priority <= 2)
              .every((f) =>
                allCaptures.some((c) => c.finding_id === f.id)
              )}
          />
        </div>
      )}

      {/* Totals bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {metrics.totalUnits} units &bull; {metrics.totalFindings} findings
            &bull; {metrics.totalCaptures} captures
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      {isBankReady && (
        <div className="text-xs text-gray-400 italic leading-relaxed">
          Repair Exposure Estimate — Visual Assessment Only. This report
          provides preliminary cost estimates based on visual observations
          during a limited property inspection. Actual repair costs may vary
          significantly. This is not a substitute for a full Property
          Condition Assessment (PCA) per ASTM E2018.
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  color = "text-gray-900",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-xs text-gray-500">{label}</p>
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
        className={`text-sm ${ok ? "text-gray-700" : "text-red-700 font-medium"}`}
      >
        {label}
      </span>
    </div>
  );
}
