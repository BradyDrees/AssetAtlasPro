import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { InspectionSectionFields } from "@/components/inspection-section-fields";
import { InspectionChecklistPanel } from "@/components/inspection-checklist-panel";
import { InspectionFindingsList } from "@/components/inspection-findings-list";
import { InspectionUnitList } from "@/components/inspection-unit-list";
import { SnapshotSync } from "@/components/snapshot-sync";
import { INSPECTION_GROUP_SLUGS } from "@/lib/inspection-sections";
import type {
  InspectionProjectSectionWithDetails,
  InspectionChecklistItem,
  InspectionFinding,
  InspectionUnit,
  InspectionCapture,
} from "@/lib/inspection-types";

export const dynamic = "force-dynamic";

export default async function InspectionSectionPage({
  params,
}: {
  params: Promise<{ id: string; sectionId: string }>;
}) {
  const { id: projectId, sectionId: projectSectionId } = await params;
  const supabase = await createClient();

  // Fetch user + project in parallel
  const [
    { data: { user } },
    { data: project },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("inspection_projects")
      .select("*")
      .eq("id", projectId)
      .single(),
  ]);

  if (!project) notFound();

  // Fetch this project section + joined master section
  const { data: projectSection } = await supabase
    .from("inspection_project_sections")
    .select(
      `
      *,
      section:inspection_sections(*)
    `
    )
    .eq("id", projectSectionId)
    .single();

  if (!projectSection) notFound();

  const ps = projectSection as InspectionProjectSectionWithDetails;
  const isUnitMode = ps.section.is_unit_mode;
  const groupSlug = INSPECTION_GROUP_SLUGS[ps.section.group_name] ?? "";

  // Fetch checklist items for this section (master template)
  const { data: checklistItems } = await supabase
    .from("inspection_checklist_items")
    .select("*")
    .eq("section_id", ps.section_id)
    .order("sort_order");

  // Fetch findings for this section
  const { data: findings } = await supabase
    .from("inspection_findings")
    .select("*")
    .eq("project_section_id", projectSectionId)
    .order("sort_order");

  // Fetch captures for this section
  const { data: captures } = await supabase
    .from("inspection_captures")
    .select("*")
    .eq("project_section_id", projectSectionId)
    .order("sort_order");

  // Fetch units (if unit mode)
  let units: InspectionUnit[] = [];
  if (isUnitMode) {
    const { data: unitData } = await supabase
      .from("inspection_units")
      .select("*")
      .eq("project_section_id", projectSectionId)
      .order("building")
      .order("unit_number");

    units = (unitData ?? []) as InspectionUnit[];
  }

  // Calculate next section for navigation
  const { data: allSections } = await supabase
    .from("inspection_project_sections")
    .select("id, sort_order, enabled, section:inspection_sections(name)")
    .eq("project_id", projectId)
    .eq("enabled", true)
    .order("sort_order");

  const currentIdx = (allSections ?? []).findIndex(
    (s: any) => s.id === projectSectionId
  );
  const nextSection =
    currentIdx >= 0 && currentIdx < (allSections ?? []).length - 1
      ? (allSections ?? [])[currentIdx + 1]
      : null;

  return (
    <div>
      {/* Silently cache page data to Dexie for offline access */}
      <SnapshotSync
        pageId={`section:${projectId}:${projectSectionId}`}
        pageType="section"
        dataVersion={`${projectSectionId}:${(findings ?? []).length}:${(captures ?? []).length}:${units.length}`}
        data={{
          project,
          projectSection: ps,
          checklistItems: (checklistItems ?? []) as InspectionChecklistItem[],
          findings: (findings ?? []) as InspectionFinding[],
          captures: (captures ?? []) as InspectionCapture[],
          units,
          nextSection,
          allSections,
          isUnitMode,
          groupSlug,
        }}
      />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-content-quaternary mb-4">
        <Link
          href="/inspections"
          className="hover:text-brand-600 transition-colors"
        >
          Inspections
        </Link>
        <span>/</span>
        <Link
          href={`/inspections/${projectId}?group=${groupSlug}`}
          className="hover:text-brand-600 transition-colors"
        >
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
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4"
              />
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

      {/* Section-level fields (Condition Rating, RUL, Notes) — hide for unit-mode sections on internal inspections */}
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
          units={units}
          captures={(captures ?? []) as InspectionCapture[]}
          projectId={projectId}
          projectSectionId={projectSectionId}
          sectionSlug={ps.section.slug}
          currentUserId={user?.id}
        />
      ) : (
        <>
          {/* Checklist items panel */}
          <InspectionChecklistPanel
            checklistItems={
              (checklistItems ?? []) as InspectionChecklistItem[]
            }
            findings={(findings ?? []) as InspectionFinding[]}
            projectId={projectId}
            projectSectionId={projectSectionId}
          />

          {/* Findings list */}
          <InspectionFindingsList
            findings={(findings ?? []) as InspectionFinding[]}
            captures={(captures ?? []) as InspectionCapture[]}
            projectId={projectId}
            projectSectionId={projectSectionId}
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
            Next: {(nextSection as any).section.name} →
          </Link>
        </div>
      )}
    </div>
  );
}
