import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { InspectionUnitDetail } from "@/components/inspection-unit-detail";
import { INSPECTION_GROUP_SLUGS } from "@/lib/inspection-sections";
import type {
  InspectionUnit,
  InspectionCapture,
  InspectionProjectSectionWithDetails,
} from "@/lib/inspection-types";
import type {
  UnitTurnCategoryData,
  UnitTurnUnitItemWithTemplate,
  UnitTurnNoteWithPhotos,
} from "@/lib/unit-turn-types";

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

  // Fire all queries in parallel
  const [
    { data: { user } },
    { data: project },
    { data: projectSection },
    { data: unit },
    { data: captures },
    { data: allUnits },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("inspection_projects")
      .select("*")
      .eq("id", projectId)
      .single(),
    supabase
      .from("inspection_project_sections")
      .select("*, section:inspection_sections(*)")
      .eq("id", projectSectionId)
      .single(),
    supabase
      .from("inspection_units")
      .select("*")
      .eq("id", unitId)
      .single(),
    supabase
      .from("inspection_captures")
      .select("*")
      .eq("unit_id", unitId)
      .order("sort_order"),
    supabase
      .from("inspection_units")
      .select("id, building, unit_number")
      .eq("project_section_id", projectSectionId)
      .order("building")
      .order("unit_number"),
  ]);

  if (!project || !projectSection || !unit) notFound();

  const ps = projectSection as InspectionProjectSectionWithDetails;
  const groupSlug = INSPECTION_GROUP_SLUGS[ps.section.group_name] ?? "";

  const unitsList = allUnits ?? [];
  const currentIdx = unitsList.findIndex((u: any) => u.id === unitId);
  const prevUnit = currentIdx > 0 ? unitsList[currentIdx - 1] : null;
  const nextUnit =
    currentIdx >= 0 && currentIdx < unitsList.length - 1
      ? unitsList[currentIdx + 1]
      : null;

  // Load unit turn checklist data if turn_unit_id exists (Rent Ready = No)
  let turnCategoryData: UnitTurnCategoryData[] = [];
  const typedUnit = unit as InspectionUnit;
  if (typedUnit.turn_unit_id) {
    const [
      { data: categories },
      { data: turnItems },
      { data: turnNotes },
    ] = await Promise.all([
      supabase
        .from("unit_turn_categories")
        .select("*")
        .order("sort_order"),
      supabase
        .from("unit_turn_unit_items")
        .select("*, template_item:unit_turn_template_items(*)")
        .eq("unit_id", typedUnit.turn_unit_id)
        .order("sort_order")
        .order("id"),
      supabase
        .from("unit_turn_notes")
        .select("*, photos:unit_turn_note_photos(*)")
        .eq("unit_id", typedUnit.turn_unit_id)
        .order("created_at"),
    ]);

    const allCats = categories ?? [];
    const allItems = (turnItems ?? []) as UnitTurnUnitItemWithTemplate[];
    const allNotes = (turnNotes ?? []) as UnitTurnNoteWithPhotos[];

    // Exclude cleaning category
    turnCategoryData = allCats
      .filter((cat: any) => cat.category_type !== "cleaning")
      .map((cat: any) => ({
        category: cat,
        items: allItems.filter((i) => i.category_id === cat.id),
        notes: allNotes.filter((n) => n.category_id === cat.id),
      }));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  return (
    <div>
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
        <Link
          href={`/inspections/${projectId}/sections/${projectSectionId}`}
          className="hover:text-brand-600 transition-colors"
        >
          {ps.section.name}
        </Link>
        <span>/</span>
        <span className="text-content-primary">
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
        <h1 className="text-2xl font-bold text-content-primary">
          {(unit as InspectionUnit).building} -{" "}
          {(unit as InspectionUnit).unit_number}
        </h1>
      </div>

      <InspectionUnitDetail
        unit={unit as InspectionUnit}
        captures={(captures ?? []) as InspectionCapture[]}
        projectId={projectId}
        projectSectionId={projectSectionId}
        sectionSlug={ps.section.slug}
        inspectionType={project.inspection_type}
        currentUserId={user?.id ?? ""}
        turnCategoryData={turnCategoryData}
        supabaseUrl={supabaseUrl}
      />

      {/* Prev / Next unit navigation */}
      {(prevUnit || nextUnit) && (
        <div className="mt-6 flex items-center justify-between">
          {prevUnit ? (
            <Link
              href={`/inspections/${projectId}/sections/${projectSectionId}/units/${prevUnit.id}`}
              className="px-4 py-2 bg-surface-secondary text-content-primary text-sm rounded-md border border-edge-secondary hover:bg-surface-tertiary transition-colors"
            >
              ← {(prevUnit as any).building} - {(prevUnit as any).unit_number}
            </Link>
          ) : (
            <div />
          )}
          {nextUnit ? (
            <Link
              href={`/inspections/${projectId}/sections/${projectSectionId}/units/${nextUnit.id}`}
              className="px-4 py-2 bg-brand-600 text-white text-sm rounded-md hover:bg-brand-700 transition-colors"
            >
              {(nextUnit as any).building} - {(nextUnit as any).unit_number} →
            </Link>
          ) : (
            <div />
          )}
        </div>
      )}
    </div>
  );
}
