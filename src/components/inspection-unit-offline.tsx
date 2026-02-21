"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { getPageSnapshot } from "@/lib/offline/page-snapshot";
import { InspectionUnitDetail } from "@/components/inspection-unit-detail";
import type {
  InspectionProject,
  InspectionProjectSectionWithDetails,
  InspectionUnit,
  InspectionCapture,
} from "@/lib/inspection-types";
import type { UnitTurnCategoryData } from "@/lib/unit-turn-types";

interface UnitSnapshotData {
  project: InspectionProject;
  projectSection: InspectionProjectSectionWithDetails;
  unit: InspectionUnit;
  captures: InspectionCapture[];
  allUnits: { id: string; building: string; unit_number: string }[];
  turnCategoryData: UnitTurnCategoryData[];
  supabaseUrl: string;
  groupSlug: string;
  prevUnit: { id: string; building: string; unit_number: string } | null;
  nextUnit: { id: string; building: string; unit_number: string } | null;
}

interface InspectionUnitOfflineProps {
  projectId: string;
  sectionId: string;
  unitId: string;
  onRetry?: () => void;
}

export function InspectionUnitOffline({
  projectId,
  sectionId,
  unitId,
  onRetry,
}: InspectionUnitOfflineProps) {
  const t = useTranslations();
  const [snapshot, setSnapshot] = useState<UnitSnapshotData | null>(null);
  const [snapshotAt, setSnapshotAt] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pageId = `unit:${projectId}:${sectionId}:${unitId}`;
    getPageSnapshot<UnitSnapshotData>(pageId)
      .then((result) => {
        if (result) {
          setSnapshot(result.data);
          setSnapshotAt(result.snapshotAt);
        }
      })
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, [projectId, sectionId, unitId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm text-content-quaternary">{t("offline.loadingOfflineData")}</p>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="bg-surface-primary rounded-lg border border-edge-primary p-8 text-center">
        <svg className="w-12 h-12 text-content-muted mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728m12.728 0L5.636 18.364" />
        </svg>
        <h2 className="text-lg font-semibold text-content-primary mb-2">{t("offline.noDataTitle")}</h2>
        <p className="text-sm text-content-quaternary mb-4">
          {t("offline.noUnitDataDescription")}
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href={`/inspections/${projectId}/sections/${sectionId}`}
            className="px-4 py-2 bg-surface-secondary text-content-primary text-sm rounded-md border border-edge-secondary hover:bg-surface-tertiary transition-colors"
          >
            {t("offline.backToSection")}
          </Link>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-brand-600 text-white text-sm rounded-md hover:bg-brand-700 transition-colors"
            >
              {t("offline.retry")}
            </button>
          )}
        </div>
      </div>
    );
  }

  const { project, projectSection: ps, unit, captures, allUnits, turnCategoryData, supabaseUrl, groupSlug, prevUnit, nextUnit } = snapshot;
  const cachedTime = new Date(snapshotAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div>
      {/* Offline banner */}
      <div className="bg-amber-900/30 border border-amber-600/40 rounded-lg px-4 py-2.5 mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728" />
        </svg>
        <span className="text-sm text-amber-200">
          {t("offline.offlineBanner", { time: cachedTime })}
        </span>
        {onRetry && (
          <button onClick={onRetry} className="ml-auto text-xs text-amber-400 hover:text-amber-300 underline">
            {t("offline.retry")}
          </button>
        )}
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-content-quaternary mb-4">
        <Link href="/inspections" className="hover:text-brand-600 transition-colors">
          {t("nav.inspections")}
        </Link>
        <span>/</span>
        <Link href={`/inspections/${projectId}?group=${groupSlug}`} className="hover:text-brand-600 transition-colors">
          {project.name}
        </Link>
        <span>/</span>
        <Link href={`/inspections/${projectId}/sections/${sectionId}`} className="hover:text-brand-600 transition-colors">
          {ps.section.name}
        </Link>
        <span>/</span>
        <span className="text-content-primary">
          {unit.building} - {unit.unit_number}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/inspections/${projectId}?group=${groupSlug}`}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
          title="Back to project"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" />
          </svg>
          {t("common.project")}
        </Link>
        <h1 className="text-2xl font-bold text-content-primary">
          {unit.building} - {unit.unit_number}
        </h1>
      </div>

      <InspectionUnitDetail
        unit={unit}
        captures={captures ?? []}
        projectId={projectId}
        projectSectionId={sectionId}
        sectionSlug={ps.section.slug}
        inspectionType={project.inspection_type}
        currentUserId=""
        turnCategoryData={turnCategoryData ?? []}
        supabaseUrl={supabaseUrl ?? ""}
      />

      {/* Prev / Next unit navigation */}
      {(prevUnit || nextUnit) && (
        <div className="mt-6 flex items-center justify-between">
          {prevUnit ? (
            <Link
              href={`/inspections/${projectId}/sections/${sectionId}/units/${prevUnit.id}`}
              className="px-4 py-2 bg-surface-secondary text-content-primary text-sm rounded-md border border-edge-secondary hover:bg-surface-tertiary transition-colors"
            >
              ← {prevUnit.building} - {prevUnit.unit_number}
            </Link>
          ) : (
            <div />
          )}
          {nextUnit ? (
            <Link
              href={`/inspections/${projectId}/sections/${sectionId}/units/${nextUnit.id}`}
              className="px-4 py-2 bg-brand-600 text-white text-sm rounded-md hover:bg-brand-700 transition-colors"
            >
              {nextUnit.building} - {nextUnit.unit_number} →
            </Link>
          ) : (
            <div />
          )}
        </div>
      )}
    </div>
  );
}
