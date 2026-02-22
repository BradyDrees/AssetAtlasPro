/**
 * PDF Export — Data Fetcher
 * Server-only utility that fetches everything needed for any export format.
 */

import { createClient } from "@/lib/supabase/server";
import { GROUP_ORDER } from "@/lib/dd-sections";
import { CONDITION_LABELS } from "@/lib/types";
import type {
  DDProject,
  DDUnit,
  DDCapture,
  DDSectionItem,
  DDProjectSectionWithDetails,
  ConditionRating,
} from "@/lib/types";

// ---- Exported types ----

export interface ExportMetrics {
  enabledSections: number;
  sectionsWithActivity: number;
  sectionsUntouched: number;
  totalUnits: number;
  unitsWithPhotos: number;
  unitsMissingGrades: number;
  unitsMissingBdBa: number;
  totalCaptures: number;
  unitLevelCaptures: number;
  itemLevelCaptures: number;
  sectionLevelCaptures: number;
}

export interface ProjectExportData {
  project: DDProject;
  sectionsByGroup: {
    groupName: string;
    sections: DDProjectSectionWithDetails[];
  }[];
  units: DDUnit[];
  sectionItems: DDSectionItem[];
  captures: DDCapture[]; // image captures only
  allCaptures: DDCapture[]; // all types (for counts)
  unitsBySection: Record<string, DDUnit[]>;
  itemsBySection: Record<string, DDSectionItem[]>;
  capturesByUnit: Record<string, DDCapture[]>;
  capturesByItem: Record<string, DDCapture[]>;
  capturesBySection: Record<string, DDCapture[]>; // section-level only (no unit/item)
  metrics: ExportMetrics;
  warnings: { label: string }[];
  avgRatingBySection: Record<string, { avg: number; label: string }>;
}

// ---- Main fetcher ----

export async function fetchProjectData(
  projectId: string
): Promise<ProjectExportData | null> {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. Project
  const { data: project } = await supabase
    .from("dd_projects")
    .select("*")
    .eq("id", projectId)
    .single();
  if (!project) return null;

  // 2. All project sections with master data
  const { data: rawSections } = await supabase
    .from("dd_project_sections")
    .select(`*, section:dd_sections(*)`)
    .eq("project_id", projectId)
    .order("sort_order");

  const allSections: DDProjectSectionWithDetails[] = (rawSections ?? []).filter(
    (ps: any) => ps.enabled
  );

  const unitModeSections = allSections.filter(
    (ps) => ps.section.is_unit_mode
  );
  const nonUnitSections = allSections.filter(
    (ps) => !ps.section.is_unit_mode
  );

  // 3. Units (for unit-mode sections)
  const unitSectionIds = unitModeSections.map((ps) => ps.id);
  let allUnits: DDUnit[] = [];
  if (unitSectionIds.length > 0) {
    const { data: units } = await supabase
      .from("dd_units")
      .select("*")
      .in("project_section_id", unitSectionIds);
    allUnits = (units ?? []) as DDUnit[];
  }
  // Deterministic sort: building ASC, unit_number ASC
  allUnits.sort((a, b) => {
    const bCmp = a.building.localeCompare(b.building);
    if (bCmp !== 0) return bCmp;
    return a.unit_number.localeCompare(b.unit_number, undefined, {
      numeric: true,
    });
  });

  // 4. Section items (for non-unit sections)
  const nonUnitSectionIds = nonUnitSections.map((ps) => ps.id);
  let allItems: DDSectionItem[] = [];
  if (nonUnitSectionIds.length > 0) {
    const { data: items } = await supabase
      .from("dd_section_items")
      .select("*")
      .in("project_section_id", nonUnitSectionIds);
    allItems = (items ?? []) as DDSectionItem[];
  }
  // Sort by sort_order ASC
  allItems.sort((a, b) => a.sort_order - b.sort_order);

  // 5. All captures
  const allSectionIds = allSections.map((ps) => ps.id);
  let rawCaptures: DDCapture[] = [];
  if (allSectionIds.length > 0) {
    const { data: captures } = await supabase
      .from("dd_captures")
      .select("*")
      .in("project_section_id", allSectionIds);
    rawCaptures = (captures ?? []) as DDCapture[];
  }
  // Sort by sort_order ASC, then created_at ASC
  rawCaptures.sort((a, b) => {
    const soCmp = a.sort_order - b.sort_order;
    if (soCmp !== 0) return soCmp;
    return a.created_at.localeCompare(b.created_at);
  });

  // Filter to image captures only for embedding
  const imageCaptures = rawCaptures.filter((c) => c.file_type === "image");

  // ---- Build lookup maps ----
  const unitsBySection: Record<string, DDUnit[]> = {};
  for (const u of allUnits) {
    if (!unitsBySection[u.project_section_id])
      unitsBySection[u.project_section_id] = [];
    unitsBySection[u.project_section_id].push(u);
  }

  const itemsBySection: Record<string, DDSectionItem[]> = {};
  for (const item of allItems) {
    if (!itemsBySection[item.project_section_id])
      itemsBySection[item.project_section_id] = [];
    itemsBySection[item.project_section_id].push(item);
  }

  const capturesByUnit: Record<string, DDCapture[]> = {};
  const capturesByItem: Record<string, DDCapture[]> = {};
  const capturesBySection: Record<string, DDCapture[]> = {};
  for (const c of imageCaptures) {
    if (c.unit_id) {
      if (!capturesByUnit[c.unit_id]) capturesByUnit[c.unit_id] = [];
      capturesByUnit[c.unit_id].push(c);
    } else if (c.section_item_id) {
      if (!capturesByItem[c.section_item_id])
        capturesByItem[c.section_item_id] = [];
      capturesByItem[c.section_item_id].push(c);
    } else {
      if (!capturesBySection[c.project_section_id])
        capturesBySection[c.project_section_id] = [];
      capturesBySection[c.project_section_id].push(c);
    }
  }

  // ---- Group sections by GROUP_ORDER ----
  const sectionsByGroup: {
    groupName: string;
    sections: DDProjectSectionWithDetails[];
  }[] = [];
  for (const groupName of GROUP_ORDER) {
    const grouped = allSections.filter(
      (ps) => ps.section.group_name === groupName
    );
    if (grouped.length > 0) {
      // Sort within group by section sort_order
      grouped.sort((a, b) => a.section.sort_order - b.section.sort_order);
      sectionsByGroup.push({ groupName, sections: grouped });
    }
  }

  // ---- Compute metrics ----
  const unitIdsWithPhotos = new Set(
    rawCaptures.filter((c) => c.unit_id).map((c) => c.unit_id)
  );

  const metrics: ExportMetrics = {
    enabledSections: allSections.length,
    sectionsWithActivity: allSections.filter((ps) => {
      if (ps.section.is_unit_mode)
        return (unitsBySection[ps.id]?.length ?? 0) > 0;
      return (itemsBySection[ps.id]?.length ?? 0) > 0;
    }).length,
    sectionsUntouched: allSections.filter((ps) => {
      if (ps.section.is_unit_mode)
        return (unitsBySection[ps.id]?.length ?? 0) === 0;
      return (itemsBySection[ps.id]?.length ?? 0) === 0;
    }).length,
    totalUnits: allUnits.length,
    unitsWithPhotos: allUnits.filter((u) => unitIdsWithPhotos.has(u.id)).length,
    unitsMissingGrades: allUnits.filter(
      (u) => !u.unit_grade && !u.tenant_grade
    ).length,
    unitsMissingBdBa: allUnits.filter((u) => !u.bd_ba).length,
    totalCaptures: rawCaptures.length,
    unitLevelCaptures: rawCaptures.filter((c) => c.unit_id).length,
    itemLevelCaptures: rawCaptures.filter((c) => c.section_item_id).length,
    sectionLevelCaptures: rawCaptures.filter(
      (c) => !c.unit_id && !c.section_item_id
    ).length,
  };

  // ---- Warnings ----
  const warnings: { label: string }[] = [];
  allSections.forEach((ps) => {
    const hasActivity = ps.section.is_unit_mode
      ? (unitsBySection[ps.id]?.length ?? 0) > 0
      : (itemsBySection[ps.id]?.length ?? 0) > 0;
    if (!hasActivity) {
      warnings.push({ label: `${ps.section.name} — no activity` });
    }
  });
  allUnits.forEach((u) => {
    if (!u.unit_grade && !u.tenant_grade) {
      warnings.push({
        label: `B${u.building} - ${u.unit_number} — missing grades`,
      });
    }
  });
  allUnits.forEach((u) => {
    if (!u.bd_ba && (u.unit_grade || u.tenant_grade)) {
      warnings.push({
        label: `B${u.building} - ${u.unit_number} — missing BD/BA`,
      });
    }
  });

  // ---- Average condition rating per non-unit section ----
  const avgRatingBySection: Record<string, { avg: number; label: string }> = {};
  for (const ps of nonUnitSections) {
    const items = itemsBySection[ps.id] ?? [];
    const rated = items.filter((i) => i.condition_rating != null);
    if (rated.length === 0) {
      avgRatingBySection[ps.id] = { avg: 0, label: "N/A" };
    } else {
      const avg =
        rated.reduce((s, i) => s + (i.condition_rating as number), 0) /
        rated.length;
      const rounded = Math.round(avg) as ConditionRating;
      const label =
        CONDITION_LABELS[rounded] ?? `${avg.toFixed(1)}`;
      avgRatingBySection[ps.id] = { avg, label };
    }
  }

  return {
    project: project as DDProject,
    sectionsByGroup,
    units: allUnits,
    sectionItems: allItems,
    captures: imageCaptures,
    allCaptures: rawCaptures,
    unitsBySection,
    itemsBySection,
    capturesByUnit,
    capturesByItem,
    capturesBySection,
    metrics,
    warnings,
    avgRatingBySection,
  };
}
