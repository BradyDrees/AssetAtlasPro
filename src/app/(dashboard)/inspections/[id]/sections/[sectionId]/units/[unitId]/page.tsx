import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { InspectionUnitDetail } from "@/components/inspection-unit-detail";
import type {
  InspectionUnit,
  InspectionCapture,
  InspectionFinding,
  InspectionProjectSectionWithDetails,
} from "@/lib/inspection-types";

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
          href={`/inspections/${projectId}`}
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
          href={`/inspections/${projectId}/sections/${projectSectionId}`}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="Back to units"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
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
