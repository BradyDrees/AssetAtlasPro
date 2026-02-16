import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { InspectionUnitDetail } from "@/components/inspection-unit-detail";
import { INSPECTION_GROUP_SLUGS } from "@/lib/inspection-sections";
import type {
  InspectionUnit,
  InspectionCapture,
  InspectionFinding,
  InspectionProjectSectionWithDetails,
} from "@/lib/inspection-types";

export const dynamic = "force-dynamic";

export default async function InspectionUnitPage({
  params,
}: {
  params: Promise<{ id: string; sectionId: string; unitId: string }>;
}) {
  const {
    id: projectId,
    sectionId: projectSectionId,
    unitId,
  } = await params;
  const supabase = await createClient();

  // Fetch project
  const { data: project } = await supabase
    .from("inspection_projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (!project) notFound();

  // Fetch project section + master section
  const { data: projectSection } = await supabase
    .from("inspection_project_sections")
    .select("*, section:inspection_sections(*)")
    .eq("id", projectSectionId)
    .single();

  if (!projectSection) notFound();

  const ps = projectSection as InspectionProjectSectionWithDetails;
  const groupSlug = INSPECTION_GROUP_SLUGS[ps.section.group_name] ?? "";

  // Fetch this unit
  const { data: unit } = await supabase
    .from("inspection_units")
    .select("*")
    .eq("id", unitId)
    .single();

  if (!unit) notFound();

  // Fetch captures for this unit
  const { data: captures } = await supabase
    .from("inspection_captures")
    .select("*")
    .eq("unit_id", unitId)
    .order("sort_order");

  // Fetch findings for this project section (will filter to unit in component)
  const { data: findingsData } = await supabase
    .from("inspection_findings")
    .select("*")
    .eq("project_section_id", projectSectionId)
    .order("sort_order");

  const findings = (findingsData ?? []) as InspectionFinding[];

  // Get all units for next unit navigation
  const { data: allUnits } = await supabase
    .from("inspection_units")
    .select("id, building, unit_number")
    .eq("project_section_id", projectSectionId)
    .order("building")
    .order("unit_number");

  const currentIdx = (allUnits ?? []).findIndex((u: any) => u.id === unitId);
  const nextUnit =
    currentIdx >= 0 && currentIdx < (allUnits ?? []).length - 1
      ? (allUnits ?? [])[currentIdx + 1]
      : null;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
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
        <Link
          href={`/inspections/${projectId}/sections/${projectSectionId}`}
          className="hover:text-brand-600 transition-colors"
        >
          {ps.section.name}
        </Link>
        <span>/</span>
        <span className="text-gray-900">
          {(unit as InspectionUnit).building} -{" "}
          {(unit as InspectionUnit).unit_number}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
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
        <h1 className="text-2xl font-bold text-gray-900">
          {(unit as InspectionUnit).building} -{" "}
          {(unit as InspectionUnit).unit_number}
        </h1>
      </div>

      <InspectionUnitDetail
        unit={unit as InspectionUnit}
        captures={(captures ?? []) as InspectionCapture[]}
        findings={findings}
        projectId={projectId}
        projectSectionId={projectSectionId}
        sectionSlug={ps.section.slug}
        inspectionType={project.inspection_type}
      />

      {/* Next unit navigation */}
      {nextUnit && (
        <div className="mt-6 flex justify-end">
          <Link
            href={`/inspections/${projectId}/sections/${projectSectionId}/units/${nextUnit.id}`}
            className="px-4 py-2 bg-brand-600 text-white text-sm rounded-md hover:bg-brand-700 transition-colors"
          >
            Next Unit: {(nextUnit as any).building} -{" "}
            {(nextUnit as any).unit_number} →
          </Link>
        </div>
      )}
    </div>
  );
}
