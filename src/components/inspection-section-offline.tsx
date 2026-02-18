"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getPageSnapshot } from "@/lib/offline/page-snapshot";
import { useOffline } from "@/components/offline-provider";
import { useLocalFindings, useLocalUnits } from "@/lib/offline/use-local-data";
import { InspectionSectionFields } from "@/components/inspection-section-fields";
import { InspectionChecklistPanel } from "@/components/inspection-checklist-panel";
import { InspectionFindingsList } from "@/components/inspection-findings-list";
import { InspectionUnitList } from "@/components/inspection-unit-list";
import type {
  InspectionProject,
  InspectionProjectSectionWithDetails,
  InspectionChecklistItem,
  InspectionFinding,
  InspectionCapture,
  InspectionUnit,
} from "@/lib/inspection-types";

interface SectionSnapshotData {
  project: InspectionProject;
  projectSection: InspectionProjectSectionWithDetails;
  checklistItems: InspectionChecklistItem[];
  findings: InspectionFinding[];
  captures: InspectionCapture[];
  units: InspectionUnit[];
  nextSection: { id: string; section: { name: string } } | null;
  isUnitMode: boolean;
  groupSlug: string;
}

interface InspectionSectionOfflineProps {
  projectId: string;
  sectionId: string;
  onRetry?: () => void;
}

export function InspectionSectionOffline({
  projectId,
  sectionId,
  onRetry,
}: InspectionSectionOfflineProps) {
  const { localRevision } = useOffline();
  const [snapshot, setSnapshot] = useState<SectionSnapshotData | null>(null);
  const [snapshotAt, setSnapshotAt] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Load local findings and units to merge with snapshot
  const localFindings = useLocalFindings(sectionId);
  const localUnits = useLocalUnits(sectionId);

  useEffect(() => {
    const pageId = `section:${projectId}:${sectionId}`;
    getPageSnapshot<SectionSnapshotData>(pageId)
      .then((result) => {
        if (result) {
          setSnapshot(result.data);
          setSnapshotAt(result.snapshotAt);
        }
      })
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, [projectId, sectionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm text-content-quaternary">Loading offline data...</p>
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
        <h2 className="text-lg font-semibold text-content-primary mb-2">No offline data available</h2>
        <p className="text-sm text-content-quaternary mb-4">
          This page hasn&apos;t been cached for offline use yet. Visit it while online to cache the data.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/inspections"
            className="px-4 py-2 bg-surface-secondary text-content-primary text-sm rounded-md border border-edge-secondary hover:bg-surface-tertiary transition-colors"
          >
            Back to Inspections
          </Link>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-brand-600 text-white text-sm rounded-md hover:bg-brand-700 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  const { project, projectSection: ps, checklistItems, findings, captures, units, nextSection, isUnitMode, groupSlug } = snapshot;

  // Merge server findings with local unsynced findings
  const mergedFindings: InspectionFinding[] = [
    ...findings,
    ...localFindings
      .filter((lf) => lf.syncStatus !== "synced")
      .map((lf) => ({
        id: lf.localId,
        project_id: lf.projectId,
        project_section_id: lf.projectSectionId,
        checklist_item_id: lf.checklistItemId ?? null,
        unit_id: lf.unitId ?? null,
        created_by: lf.createdBy,
        title: lf.checklistItemId ? "Offline finding" : "Custom finding",
        location: "",
        priority: (lf.priority as InspectionFinding["priority"]) ?? null,
        exposure_bucket: null,
        exposure_custom: null,
        risk_flags: [] as InspectionFinding["risk_flags"],
        notes: lf.notes ?? "",
        sort_order: findings.length + 1,
        created_at: new Date(lf.createdAt).toISOString(),
        updated_at: new Date(lf.updatedAt).toISOString(),
      })),
  ];

  const cachedTime = new Date(snapshotAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div>
      {/* Offline banner */}
      <div className="bg-amber-900/30 border border-amber-600/40 rounded-lg px-4 py-2.5 mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728" />
        </svg>
        <span className="text-sm text-amber-200">
          Offline — using cached data from {cachedTime}
        </span>
        {onRetry && (
          <button onClick={onRetry} className="ml-auto text-xs text-amber-400 hover:text-amber-300 underline">
            Retry
          </button>
        )}
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-content-quaternary mb-4">
        <Link href="/inspections" className="hover:text-brand-600 transition-colors">
          Inspections
        </Link>
        <span>/</span>
        <Link href={`/inspections/${projectId}?group=${groupSlug}`} className="hover:text-brand-600 transition-colors">
          {project.name}
        </Link>
        <span>/</span>
        <span className="text-content-primary">{ps.section.name}</span>
      </div>

      {/* Section header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/inspections/${projectId}?group=${groupSlug}`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
            title="Back to project"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" />
            </svg>
            Project
          </Link>
          <div>
            <p className="text-xs text-content-quaternary uppercase tracking-wide">
              {ps.section.group_name}
            </p>
            <h1 className="text-2xl font-bold text-content-primary">
              {ps.section.name}
            </h1>
          </div>
        </div>
      </div>

      {/* Section-level fields */}
      {!(isUnitMode && project.inspection_type === "internal") && (
        <InspectionSectionFields
          projectSection={ps}
          projectId={projectId}
          inspectionType={project.inspection_type}
        />
      )}

      {/* Main content area */}
      {isUnitMode ? (
        <InspectionUnitList
          units={units ?? []}
          captures={captures ?? []}
          projectId={projectId}
          projectSectionId={sectionId}
          sectionSlug={ps.section.slug}
        />
      ) : (
        <>
          <InspectionChecklistPanel
            checklistItems={checklistItems ?? []}
            findings={mergedFindings}
            projectId={projectId}
            projectSectionId={sectionId}
          />
          <InspectionFindingsList
            findings={mergedFindings}
            captures={captures ?? []}
            projectId={projectId}
            projectSectionId={sectionId}
            sectionSlug={ps.section.slug}
            inspectionType={project.inspection_type}
          />
        </>
      )}

      {/* Next section navigation */}
      {nextSection && (
        <div className="mt-6 flex justify-end">
          <Link
            href={`/inspections/${projectId}/sections/${nextSection.id}`}
            className="px-4 py-2 bg-brand-600 text-white text-sm rounded-md hover:bg-brand-700 transition-colors"
          >
            Next: {(nextSection as any).section?.name ?? "Next Section"} →
          </Link>
        </div>
      )}
    </div>
  );
}
