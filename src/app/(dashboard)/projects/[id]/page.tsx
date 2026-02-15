import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SectionGroup } from "@/components/section-group";
import { ProjectHeaderMenu } from "@/components/project-header-menu";
import { GROUP_ORDER } from "@/lib/dd-sections";
import type { DDProjectSectionWithDetails, DDSectionGroup } from "@/lib/types";

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

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch project
  const { data: project } = await supabase
    .from("dd_projects")
    .select("*")
    .eq("id", id)
    .single();

  if (!project) notFound();

  // Fetch project sections joined with master section data
  const { data: projectSections } = await supabase
    .from("dd_project_sections")
    .select(
      `
      *,
      section:dd_sections(*)
    `
    )
    .eq("project_id", id)
    .order("sort_order");

  // Fetch capture counts in one batch query
  const sectionIds = (projectSections ?? []).map((ps: any) => ps.id);
  const captureCounts: Record<string, number> = {};

  if (sectionIds.length > 0) {
    const { data: captureRows } = await supabase
      .from("dd_captures")
      .select("project_section_id")
      .in("project_section_id", sectionIds);

    (captureRows ?? []).forEach((row: any) => {
      captureCounts[row.project_section_id] =
        (captureCounts[row.project_section_id] ?? 0) + 1;
    });
  }

  // Fetch unit counts per project_section for unit-mode sections
  const unitCounts: Record<string, number> = {};
  const unitModeSectionIds = (projectSections ?? [])
    .filter((ps: any) => ps.section.is_unit_mode)
    .map((ps: any) => ps.id);

  if (unitModeSectionIds.length > 0) {
    const { data: unitRows } = await supabase
      .from("dd_units")
      .select("project_section_id")
      .in("project_section_id", unitModeSectionIds);

    (unitRows ?? []).forEach((row: any) => {
      unitCounts[row.project_section_id] =
        (unitCounts[row.project_section_id] ?? 0) + 1;
    });
  }

  // Fetch item counts per project_section for non-unit-mode sections
  const itemCounts: Record<string, number> = {};
  const nonUnitSectionIds = (projectSections ?? [])
    .filter((ps: any) => !ps.section.is_unit_mode)
    .map((ps: any) => ps.id);

  if (nonUnitSectionIds.length > 0) {
    const { data: itemRows } = await supabase
      .from("dd_section_items")
      .select("project_section_id")
      .in("project_section_id", nonUnitSectionIds);

    (itemRows ?? []).forEach((row: any) => {
      itemCounts[row.project_section_id] =
        (itemCounts[row.project_section_id] ?? 0) + 1;
    });
  }

  // Group sections by group_name, maintaining GROUP_ORDER
  const grouped: DDSectionGroup[] = GROUP_ORDER.map((groupName) => ({
    group_name: groupName,
    sections: ((projectSections as DDProjectSectionWithDetails[]) ?? []).filter(
      (ps) => ps.section.group_name === groupName
    ),
  })).filter((g) => g.sections.length > 0);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link
          href="/dashboard"
          className="hover:text-brand-600 transition-colors"
        >
          Projects
        </Link>
        <span>/</span>
        <span className="text-gray-900">{project.name}</span>
      </div>

      {/* Project header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                statusStyles[project.status]
              }`}
            >
              {statusLabels[project.status]}
            </span>
          </div>
          <ProjectHeaderMenu project={project} />
        </div>
        <p className="text-gray-600 mt-0.5">{project.property_name}</p>
        {project.address && (
          <p className="text-sm text-gray-400 mt-0.5">{project.address}</p>
        )}
        <Link
          href={`/projects/${id}/review`}
          className="inline-block mt-3 px-5 py-2.5 border-2 border-brand-600 text-brand-600 text-sm font-semibold rounded-lg hover:bg-brand-600 hover:text-white transition-colors"
        >
          Review &amp; Export
        </Link>
      </div>

      {/* Section groups */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Inspection Sections
      </h2>
      <div className="space-y-4">
        {grouped.map((group) => (
          <SectionGroup
            key={group.group_name}
            groupName={group.group_name}
            sections={group.sections}
            projectId={id}
            captureCounts={captureCounts}
            unitCounts={unitCounts}
            itemCounts={itemCounts}
          />
        ))}
      </div>
    </div>
  );
}
