import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { UnitListPage } from "@/components/unit-list-page";
import { SectionItemListPage } from "@/components/section-item-list-page";
import type { DDCapture, DDUnit, DDSectionItem } from "@/lib/types";

export default async function SectionCapturePage({
  params,
}: {
  params: Promise<{ id: string; sectionId: string }>;
}) {
  const { id: projectId, sectionId: projectSectionId } = await params;
  const supabase = await createClient();

  // Fetch project (for breadcrumb)
  const { data: project } = await supabase
    .from("dd_projects")
    .select("id, name, property_name")
    .eq("id", projectId)
    .single();

  if (!project) notFound();

  // Fetch project section with master section data
  const { data: projectSection } = await supabase
    .from("dd_project_sections")
    .select(`
      *,
      section:dd_sections(*)
    `)
    .eq("id", projectSectionId)
    .eq("project_id", projectId)
    .single();

  if (!projectSection) notFound();

  // Fetch all enabled sections for "Next Section" navigation
  const { data: allEnabledSections } = await supabase
    .from("dd_project_sections")
    .select("id, sort_order, section:dd_sections(name)")
    .eq("project_id", projectId)
    .eq("enabled", true)
    .order("sort_order", { ascending: true });

  const currentIndex = (allEnabledSections ?? []).findIndex(
    (s: any) => s.id === projectSectionId
  );
  const nextSection =
    currentIndex >= 0 &&
    currentIndex < (allEnabledSections ?? []).length - 1
      ? (allEnabledSections ?? [])[currentIndex + 1]
      : null;

  const nextSectionId = nextSection ? nextSection.id : null;
  const nextSectionName = nextSection
    ? (nextSection as any).section.name
    : null;

  // ===== UNIT MODE =====
  if (projectSection.section.is_unit_mode) {
    // Fetch units for this section
    const { data: units } = await supabase
      .from("dd_units")
      .select("*")
      .eq("project_section_id", projectSectionId)
      .order("created_at", { ascending: true });

    // Fetch capture counts per unit in one batch
    const unitIds = (units ?? []).map((u: DDUnit) => u.id);
    const unitCaptureCounts: Record<string, number> = {};

    if (unitIds.length > 0) {
      const { data: captureRows } = await supabase
        .from("dd_captures")
        .select("unit_id")
        .in("unit_id", unitIds);

      (captureRows ?? []).forEach((row: { unit_id: string }) => {
        if (row.unit_id) {
          unitCaptureCounts[row.unit_id] =
            (unitCaptureCounts[row.unit_id] ?? 0) + 1;
        }
      });
    }

    return (
      <UnitListPage
        projectId={projectId}
        projectSectionId={projectSectionId}
        projectName={project.name}
        sectionName={projectSection.section.name}
        units={(units as DDUnit[]) ?? []}
        captureCounts={unitCaptureCounts}
        nextSectionId={nextSectionId}
        nextSectionName={nextSectionName}
      />
    );
  }

  // ===== MULTI-ITEM MODE (for all non-unit sections) =====
  // Fetch section items
  const { data: items } = await supabase
    .from("dd_section_items")
    .select("*")
    .eq("project_section_id", projectSectionId)
    .order("sort_order", { ascending: true });

  // Fetch capture counts per item in one batch
  const itemIds = (items ?? []).map((i: DDSectionItem) => i.id);
  const itemCaptureCounts: Record<string, number> = {};

  if (itemIds.length > 0) {
    const { data: captureRows } = await supabase
      .from("dd_captures")
      .select("section_item_id")
      .in("section_item_id", itemIds);

    (captureRows ?? []).forEach((row: { section_item_id: string }) => {
      if (row.section_item_id) {
        itemCaptureCounts[row.section_item_id] =
          (itemCaptureCounts[row.section_item_id] ?? 0) + 1;
      }
    });
  }

  return (
    <SectionItemListPage
      projectId={projectId}
      projectSectionId={projectSectionId}
      projectName={project.name}
      sectionName={projectSection.section.name}
      items={(items as DDSectionItem[]) ?? []}
      captureCounts={itemCaptureCounts}
      nextSectionId={nextSectionId}
      nextSectionName={nextSectionName}
    />
  );
}
