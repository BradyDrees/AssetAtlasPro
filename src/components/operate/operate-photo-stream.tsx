"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  updateInspectionFindingField,
  deleteInspectionFinding,
} from "@/app/actions/inspection-findings";
import {
  PRIORITY_LABELS,
  RISK_FLAG_LABELS,
  OPERATIONAL_TAG_LABELS,
} from "@/lib/inspection-constants";
import type {
  InspectionFinding,
  InspectionCapture,
  PriorityLevel,
  RiskFlag,
  OperationalTag,
} from "@/lib/inspection-types";

interface OperatePhotoStreamProps {
  findings: InspectionFinding[];
  captures: InspectionCapture[];
  projectId: string;
  projectSectionId: string;
}

/**
 * Photo stream grid — replaces checklist+findings list on Operate inspections.
 * Shows captured photos with category/location badges, priority pips,
 * risk flag icons, and operational tag chips.
 */
export function OperatePhotoStream({
  findings: initialFindings,
  captures,
  projectId,
  projectSectionId,
}: OperatePhotoStreamProps) {
  const t = useTranslations();
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  // Group captures by finding_id
  const capturesByFinding = captures.reduce(
    (acc, cap) => {
      const key = cap.finding_id ?? "__orphan";
      if (!acc[key]) acc[key] = [];
      acc[key].push(cap);
      return acc;
    },
    {} as Record<string, InspectionCapture[]>
  );

  const handleDelete = useCallback(
    async (findingId: string) => {
      if (!confirm(t("inspection.confirmDeleteFinding"))) return;
      setDeletingId(findingId);
      try {
        await deleteInspectionFinding(findingId, projectId, projectSectionId);
        router.refresh();
      } catch (err) {
        console.error("Delete finding error:", err);
      } finally {
        setDeletingId(null);
      }
    },
    [projectId, projectSectionId, router, t]
  );

  const handleFieldUpdate = useCallback(
    async (findingId: string, field: string, value: string | number | string[] | null) => {
      try {
        await updateInspectionFindingField(
          findingId,
          projectId,
          projectSectionId,
          field,
          value
        );
        router.refresh();
      } catch (err) {
        console.error("Update finding error:", err);
      }
    },
    [projectId, projectSectionId, router]
  );

  if (initialFindings.length === 0) {
    return (
      <div className="text-center py-12 text-content-quaternary">
        <svg className="w-16 h-16 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-sm">{t("inspection.capture.addPhoto")}</p>
        <p className="text-xs mt-1">{t("inspection.noFindings")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-content-primary">
          {t("inspection.findings")} ({initialFindings.length})
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {initialFindings.map((finding) => {
          const findingCaptures = capturesByFinding[finding.id] ?? [];
          const isExpanded = expandedId === finding.id;
          const isDeleting = deletingId === finding.id;
          const priorityInfo = finding.priority
            ? PRIORITY_LABELS[finding.priority as PriorityLevel]
            : null;

          return (
            <div
              key={finding.id}
              className={`border border-edge-secondary rounded-xl overflow-hidden transition-all ${
                isDeleting ? "opacity-40" : ""
              }`}
            >
              {/* Photo row */}
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : finding.id)}
                className="w-full"
              >
                <div className="flex gap-0">
                  {/* Primary photo */}
                  {findingCaptures.length > 0 ? (
                    <div className="relative w-28 h-28 shrink-0">
                      <img
                        src={`${supabaseUrl}/storage/v1/object/public/dd-captures/${findingCaptures[0].image_path}`}
                        alt={finding.title || "Finding"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {findingCaptures.length > 1 && (
                        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                          +{findingCaptures.length - 1}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="w-28 h-28 shrink-0 bg-surface-tertiary flex items-center justify-center">
                      <svg className="w-8 h-8 text-content-quaternary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex-1 p-3 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      {/* Category badge */}
                      <span className="text-sm font-medium text-content-primary truncate">
                        {finding.title || "—"}
                      </span>
                      {/* Priority pip */}
                      {priorityInfo && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${priorityInfo.bgColor}`}
                        >
                          P{finding.priority}
                        </span>
                      )}
                    </div>

                    {/* Location */}
                    {finding.location && (
                      <p className="text-xs text-content-quaternary mb-1 truncate">
                        📍 {finding.location}
                      </p>
                    )}

                    {/* Risk flags + Tags */}
                    <div className="flex flex-wrap gap-1">
                      {(finding.risk_flags ?? []).map((flag) => {
                        const info = RISK_FLAG_LABELS[flag as RiskFlag];
                        return info ? (
                          <span
                            key={flag}
                            className={`text-[10px] px-1.5 py-0.5 rounded-full ${info.color}`}
                          >
                            {info.label}
                          </span>
                        ) : null;
                      })}
                      {(finding.tags ?? []).map((tag) => {
                        const info = OPERATIONAL_TAG_LABELS[tag as OperationalTag];
                        return info ? (
                          <span
                            key={tag}
                            className={`text-[10px] px-1.5 py-0.5 rounded-full ${info.color}`}
                          >
                            {info.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>

                  {/* Chevron */}
                  <div className="flex items-center pr-3">
                    <svg
                      className={`w-4 h-4 text-content-quaternary transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-edge-secondary p-4 space-y-3 bg-surface-secondary">
                  {/* All photos */}
                  {findingCaptures.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {findingCaptures.map((cap) => (
                        <img
                          key={cap.id}
                          src={`${supabaseUrl}/storage/v1/object/public/dd-captures/${cap.image_path}`}
                          alt=""
                          className="w-full h-20 object-cover rounded-lg"
                          loading="lazy"
                        />
                      ))}
                    </div>
                  )}

                  {/* Notes */}
                  {finding.notes && (
                    <div>
                      <p className="text-xs font-medium text-content-secondary mb-0.5">
                        {t("inspection.capture.notes")}
                      </p>
                      <p className="text-sm text-content-primary">{finding.notes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleDelete(finding.id)}
                      disabled={isDeleting}
                      className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
