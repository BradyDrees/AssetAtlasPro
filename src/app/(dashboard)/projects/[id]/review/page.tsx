import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ProjectStatusControls } from "@/components/project-status-controls";
import { ExportButtons } from "@/components/export-buttons";
import type { ProjectStatus } from "@/lib/types";

const statusStyles: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-brand-100 text-brand-700",
  COMPLETE: "bg-green-100 text-green-700",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "In Progress",
  COMPLETE: "Complete",
};

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const supabase = await createClient();

  // Fetch project
  const { data: project } = await supabase
    .from("dd_projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (!project) notFound();

  // Fetch all project sections with master data
  const { data: projectSections } = await supabase
    .from("dd_project_sections")
    .select(`*, section:dd_sections(*)`)
    .eq("project_id", projectId)
    .order("sort_order");

  const enabledSections = (projectSections ?? []).filter(
    (ps: any) => ps.enabled
  );
  const unitModeSections = enabledSections.filter(
    (ps: any) => ps.section.is_unit_mode
  );
  const nonUnitSections = enabledSections.filter(
    (ps: any) => !ps.section.is_unit_mode
  );

  // Fetch ALL units for this project
  const unitSectionIds = unitModeSections.map((ps: any) => ps.id);
  let allUnits: any[] = [];
  if (unitSectionIds.length > 0) {
    const { data: units } = await supabase
      .from("dd_units")
      .select("id, project_section_id, building, unit_number, bd_ba, tenant_grade, unit_grade")
      .in("project_section_id", unitSectionIds);
    allUnits = units ?? [];
  }

  // Fetch ALL section items for non-unit sections
  const nonUnitSectionIds = nonUnitSections.map((ps: any) => ps.id);
  let allItems: any[] = [];
  if (nonUnitSectionIds.length > 0) {
    const { data: items } = await supabase
      .from("dd_section_items")
      .select("id, project_section_id")
      .in("project_section_id", nonUnitSectionIds);
    allItems = items ?? [];
  }

  // Fetch ALL captures for this project
  const allSectionIds = (projectSections ?? []).map((ps: any) => ps.id);
  let allCaptures: any[] = [];
  if (allSectionIds.length > 0) {
    const { data: captures } = await supabase
      .from("dd_captures")
      .select("id, project_section_id, unit_id, section_item_id")
      .in("project_section_id", allSectionIds);
    allCaptures = captures ?? [];
  }

  // ===== COMPUTE METRICS =====

  // Section activity: non-unit has activity if ≥1 item, unit has activity if ≥1 unit
  const itemCountsBySection: Record<string, number> = {};
  allItems.forEach((item: any) => {
    itemCountsBySection[item.project_section_id] =
      (itemCountsBySection[item.project_section_id] ?? 0) + 1;
  });

  const unitCountsBySection: Record<string, number> = {};
  allUnits.forEach((unit: any) => {
    unitCountsBySection[unit.project_section_id] =
      (unitCountsBySection[unit.project_section_id] ?? 0) + 1;
  });

  const sectionsWithActivity = enabledSections.filter((ps: any) => {
    if (ps.section.is_unit_mode) {
      return (unitCountsBySection[ps.id] ?? 0) > 0;
    }
    return (itemCountsBySection[ps.id] ?? 0) > 0;
  });

  const sectionsUntouched = enabledSections.filter((ps: any) => {
    if (ps.section.is_unit_mode) {
      return (unitCountsBySection[ps.id] ?? 0) === 0;
    }
    return (itemCountsBySection[ps.id] ?? 0) === 0;
  });

  // Unit metrics
  const unitIdsWithPhotos = new Set(
    allCaptures
      .filter((c: any) => c.unit_id)
      .map((c: any) => c.unit_id)
  );
  const unitsWithPhotos = allUnits.filter((u: any) =>
    unitIdsWithPhotos.has(u.id)
  );
  const unitsMissingGrades = allUnits.filter(
    (u: any) => !u.unit_grade && !u.tenant_grade
  );
  const unitsMissingBdBa = allUnits.filter((u: any) => !u.bd_ba);

  // Capture metrics
  const unitLevelCaptures = allCaptures.filter((c: any) => c.unit_id);
  const itemLevelCaptures = allCaptures.filter((c: any) => c.section_item_id);
  const sectionLevelCaptures = allCaptures.filter(
    (c: any) => !c.unit_id && !c.section_item_id
  );

  // ===== BUILD WARNINGS =====
  const warnings: { label: string; href: string }[] = [];

  // Untouched sections
  sectionsUntouched.forEach((ps: any) => {
    warnings.push({
      label: `${ps.section.name} — no activity`,
      href: `/projects/${projectId}/sections/${ps.id}`,
    });
  });

  // Units missing grades
  unitsMissingGrades.forEach((u: any) => {
    warnings.push({
      label: `B${u.building} - ${u.unit_number} — missing grades`,
      href: `/projects/${projectId}/sections/${u.project_section_id}/units/${u.id}`,
    });
  });

  // Units missing BD/BA
  unitsMissingBdBa.forEach((u: any) => {
    // Avoid duplicate if already in missing grades
    if (u.unit_grade || u.tenant_grade) {
      warnings.push({
        label: `B${u.building} - ${u.unit_number} — missing BD/BA`,
        href: `/projects/${projectId}/sections/${u.project_section_id}/units/${u.id}`,
      });
    }
  });

  const formattedDate = new Date(project.updated_at).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }
  );

  return (
    <div className="pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4 flex-wrap">
        <Link href="/dashboard" className="hover:text-brand-600 transition-colors">
          Projects
        </Link>
        <span>/</span>
        <Link
          href={`/projects/${projectId}`}
          className="hover:text-brand-600 transition-colors"
        >
          {project.name}
        </Link>
        <span>/</span>
        <span className="text-gray-900">Review</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              statusStyles[project.status]
            }`}
          >
            {statusLabels[project.status]}
          </span>
        </div>
        <p className="text-gray-600">{project.property_name}</p>
        {project.address && (
          <p className="text-sm text-gray-400 mt-0.5">{project.address}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">Last updated: {formattedDate}</p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {/* Sections card */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Sections
          </h3>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Enabled</span>
              <span className="font-medium">{enabledSections.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">With activity</span>
              <span className="font-medium text-green-600">
                {sectionsWithActivity.length}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Untouched</span>
              <span
                className={`font-medium ${
                  sectionsUntouched.length > 0 ? "text-orange-600" : "text-green-600"
                }`}
              >
                {sectionsUntouched.length}
              </span>
            </div>
          </div>
        </div>

        {/* Units card */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Units
          </h3>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total</span>
              <span className="font-medium">{allUnits.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">With photos</span>
              <span className="font-medium">{unitsWithPhotos.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Missing grades</span>
              <span
                className={`font-medium ${
                  unitsMissingGrades.length > 0 ? "text-orange-600" : "text-green-600"
                }`}
              >
                {unitsMissingGrades.length}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Missing BD/BA</span>
              <span
                className={`font-medium ${
                  unitsMissingBdBa.length > 0 ? "text-orange-600" : "text-green-600"
                }`}
              >
                {unitsMissingBdBa.length}
              </span>
            </div>
          </div>
        </div>

        {/* Captures card */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Captures
          </h3>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total</span>
              <span className="font-medium">{allCaptures.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Unit photos</span>
              <span className="font-medium">{unitLevelCaptures.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Item photos</span>
              <span className="font-medium">{itemLevelCaptures.length}</span>
            </div>
            {sectionLevelCaptures.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Section-level</span>
                <span className="font-medium">{sectionLevelCaptures.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Needs Attention */}
      {warnings.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Needs Attention ({warnings.length})
          </h2>
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {/* Jump to first missing item */}
            <Link
              href={warnings[0].href}
              className="block px-4 py-3 bg-orange-50 hover:bg-orange-100 transition-colors rounded-t-lg"
            >
              <span className="text-sm font-semibold text-orange-700">
                Jump to first missing item &rarr;
              </span>
            </Link>
            {warnings.map((w, i) => (
              <Link
                key={i}
                href={w.href}
                className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition-colors"
              >
                <span className="text-orange-500 text-sm">⚠</span>
                <span className="text-sm text-gray-700">{w.label}</span>
                <span className="ml-auto text-gray-400 text-xs">&rarr;</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* All good message */}
      {warnings.length === 0 && enabledSections.length > 0 && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700 font-medium">
            All sections have activity and all units have grades. This inspection looks complete!
          </p>
        </div>
      )}

      {/* Export */}
      <div className="mb-6">
        <ExportButtons projectId={projectId} projectCode={project.name} />
      </div>

      {/* Status Controls */}
      <div className="flex items-center gap-4">
        <ProjectStatusControls
          projectId={projectId}
          currentStatus={project.status as ProjectStatus}
          warnings={warnings}
        />
        <Link
          href={`/projects/${projectId}`}
          className="px-5 py-2.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          Back to Project
        </Link>
      </div>
    </div>
  );
}
