/**
 * Inspection Export — Data Fetcher
 * Server-only utility that fetches everything needed for any inspection export format.
 */

import { createClient } from "@/lib/supabase/server";
import { INSPECTION_GROUP_ORDER } from "@/lib/inspection-sections";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  InspectionProject,
  InspectionProjectSectionWithDetails,
  InspectionFinding,
  InspectionUnit,
  InspectionCapture,
  InspectionChecklistItem,
  PriorityLevel,
  RiskFlag,
} from "@/lib/inspection-types";

// ---- Exported types ----

export interface InspectionExportMetrics {
  totalFindings: number;
  immediateFindings: number;
  urgentFindings: number;
  shortTermFindings: number;
  plannedFindings: number;
  monitorFindings: number;
  goodFindings: number; // priority === null
  immediateExposure: number;
  shortTermExposure: number; // priority 1-3
  totalExposure: number;
  totalUnits: number;
  totalCaptures: number;
  imageCaptures: number;
  riskFlagCounts: Record<string, number>;
  priorityCounts: Record<number, number>;
  priorityExposure: Record<number, number>;
  sectionsWithoutRating: number;
  sectionsWithoutRul: number;
}

export interface InspectionExportData {
  project: InspectionProject;
  supabase: SupabaseClient;
  sectionsByGroup: {
    groupName: string;
    sections: InspectionProjectSectionWithDetails[];
  }[];
  enabledSections: InspectionProjectSectionWithDetails[];
  findings: InspectionFinding[];
  units: InspectionUnit[];
  captures: InspectionCapture[]; // image captures only
  allCaptures: InspectionCapture[]; // all types
  checklistItems: InspectionChecklistItem[];
  // Lookup maps
  findingsBySection: Record<string, InspectionFinding[]>;
  findingsByUnit: Record<string, InspectionFinding[]>;
  unitsBySection: Record<string, InspectionUnit[]>;
  capturesByFinding: Record<string, InspectionCapture[]>;
  capturesByUnit: Record<string, InspectionCapture[]>;
  capturesBySection: Record<string, InspectionCapture[]>; // section-level only
  checklistItemMap: Record<string, InspectionChecklistItem>;
  metrics: InspectionExportMetrics;
  warnings: { label: string }[];
}

// Exposure bucket → dollar amount
const EXPOSURE_MAP: Record<string, number> = {
  "500": 500,
  "1000": 1000,
  "2000": 2000,
  "3000": 3000,
};

function getExposureAmount(finding: InspectionFinding): number {
  if (finding.exposure_bucket === "custom" && finding.exposure_custom) {
    return finding.exposure_custom;
  }
  if (finding.exposure_bucket) {
    return EXPOSURE_MAP[finding.exposure_bucket] ?? 0;
  }
  return 0;
}

// ---- Main fetcher ----

export async function fetchInspectionData(
  projectId: string
): Promise<InspectionExportData | null> {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. Project
  const { data: project } = await supabase
    .from("inspection_projects")
    .select("*")
    .eq("id", projectId)
    .single();
  if (!project) return null;

  // 2. All project sections with master section data
  const { data: rawSections } = await supabase
    .from("inspection_project_sections")
    .select("*, section:inspection_sections(*)")
    .eq("project_id", projectId)
    .order("sort_order");

  const allSections: InspectionProjectSectionWithDetails[] = (
    rawSections ?? []
  ).filter((ps: any) => ps.enabled);

  const sectionIds = allSections.map((ps) => ps.id);

  // 3. Findings
  const { data: findingsData } = await supabase
    .from("inspection_findings")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order");

  const findings = (findingsData ?? []) as InspectionFinding[];

  // 4. Units
  const { data: unitsData } = await supabase
    .from("inspection_units")
    .select("*")
    .eq("project_id", projectId)
    .order("building")
    .order("unit_number");

  const units = (unitsData ?? []) as InspectionUnit[];

  // 5. All captures
  let rawCaptures: InspectionCapture[] = [];
  if (sectionIds.length > 0) {
    const { data: capturesData } = await supabase
      .from("inspection_captures")
      .select("*")
      .in("project_section_id", sectionIds);
    rawCaptures = (capturesData ?? []) as InspectionCapture[];
  }
  rawCaptures.sort((a, b) => {
    const soCmp = a.sort_order - b.sort_order;
    if (soCmp !== 0) return soCmp;
    return a.created_at.localeCompare(b.created_at);
  });

  const imageCaptures = rawCaptures.filter((c) => c.file_type === "image");

  // 6. Checklist items (master templates for section_ids in this project)
  const masterSectionIds = [
    ...new Set(allSections.map((ps) => ps.section_id)),
  ];
  let checklistItems: InspectionChecklistItem[] = [];
  if (masterSectionIds.length > 0) {
    const { data: ciData } = await supabase
      .from("inspection_checklist_items")
      .select("*")
      .in("section_id", masterSectionIds)
      .order("sort_order");
    checklistItems = (ciData ?? []) as InspectionChecklistItem[];
  }

  // ---- Build lookup maps ----
  const findingsBySection: Record<string, InspectionFinding[]> = {};
  const findingsByUnit: Record<string, InspectionFinding[]> = {};
  for (const f of findings) {
    if (!findingsBySection[f.project_section_id])
      findingsBySection[f.project_section_id] = [];
    findingsBySection[f.project_section_id].push(f);

    if (f.unit_id) {
      if (!findingsByUnit[f.unit_id]) findingsByUnit[f.unit_id] = [];
      findingsByUnit[f.unit_id].push(f);
    }
  }

  const unitsBySection: Record<string, InspectionUnit[]> = {};
  for (const u of units) {
    if (!unitsBySection[u.project_section_id])
      unitsBySection[u.project_section_id] = [];
    unitsBySection[u.project_section_id].push(u);
  }

  const capturesByFinding: Record<string, InspectionCapture[]> = {};
  const capturesByUnit: Record<string, InspectionCapture[]> = {};
  const capturesBySection: Record<string, InspectionCapture[]> = {};
  for (const c of imageCaptures) {
    if (c.finding_id) {
      if (!capturesByFinding[c.finding_id])
        capturesByFinding[c.finding_id] = [];
      capturesByFinding[c.finding_id].push(c);
    } else if (c.unit_id) {
      if (!capturesByUnit[c.unit_id]) capturesByUnit[c.unit_id] = [];
      capturesByUnit[c.unit_id].push(c);
    } else {
      if (!capturesBySection[c.project_section_id])
        capturesBySection[c.project_section_id] = [];
      capturesBySection[c.project_section_id].push(c);
    }
  }

  const checklistItemMap: Record<string, InspectionChecklistItem> = {};
  for (const ci of checklistItems) {
    checklistItemMap[ci.id] = ci;
  }

  // ---- Group sections by INSPECTION_GROUP_ORDER ----
  const sectionsByGroup: {
    groupName: string;
    sections: InspectionProjectSectionWithDetails[];
  }[] = [];
  for (const groupName of INSPECTION_GROUP_ORDER) {
    const grouped = allSections.filter(
      (ps) => ps.section.group_name === groupName
    );
    if (grouped.length > 0) {
      grouped.sort((a, b) => a.section.sort_order - b.section.sort_order);
      sectionsByGroup.push({ groupName, sections: grouped });
    }
  }

  // ---- Compute metrics ----
  const priorityCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const priorityExposure: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let immediateExposure = 0;
  let shortTermExposure = 0;
  let totalExposure = 0;
  let goodFindings = 0;

  const riskFlagCounts: Record<string, number> = {};

  for (const f of findings) {
    const amount = getExposureAmount(f);
    totalExposure += amount;

    if (f.priority) {
      priorityCounts[f.priority] = (priorityCounts[f.priority] ?? 0) + 1;
      priorityExposure[f.priority] =
        (priorityExposure[f.priority] ?? 0) + amount;
      if (f.priority === 1) immediateExposure += amount;
      if (f.priority <= 3) shortTermExposure += amount;
    } else {
      goodFindings++;
    }

    for (const flag of f.risk_flags ?? []) {
      riskFlagCounts[flag] = (riskFlagCounts[flag] ?? 0) + 1;
    }
  }

  const nonUnitSections = allSections.filter((s) => !s.section.is_unit_mode);

  const metrics: InspectionExportMetrics = {
    totalFindings: findings.length,
    immediateFindings: priorityCounts[1] ?? 0,
    urgentFindings: priorityCounts[2] ?? 0,
    shortTermFindings: priorityCounts[3] ?? 0,
    plannedFindings: priorityCounts[4] ?? 0,
    monitorFindings: priorityCounts[5] ?? 0,
    goodFindings,
    immediateExposure,
    shortTermExposure,
    totalExposure,
    totalUnits: units.length,
    totalCaptures: rawCaptures.length,
    imageCaptures: imageCaptures.length,
    riskFlagCounts,
    priorityCounts,
    priorityExposure,
    sectionsWithoutRating: nonUnitSections.filter(
      (s) => s.condition_rating === null
    ).length,
    sectionsWithoutRul: nonUnitSections.filter(
      (s) => s.rul_bucket === null
    ).length,
  };

  // ---- Warnings ----
  const warnings: { label: string }[] = [];

  // Bank-ready validation warnings
  if (project.inspection_type === "bank_ready") {
    const unratedFindings = findings.filter((f) => f.priority === null);
    if (unratedFindings.length > 0) {
      warnings.push({
        label: `${unratedFindings.length} finding(s) missing priority`,
      });
    }

    const missingExposure = findings.filter(
      (f) => f.priority && f.priority <= 3 && !f.exposure_bucket
    );
    if (missingExposure.length > 0) {
      warnings.push({
        label: `${missingExposure.length} P1-P3 finding(s) missing exposure`,
      });
    }

    if (metrics.sectionsWithoutRating > 0) {
      warnings.push({
        label: `${metrics.sectionsWithoutRating} section(s) missing condition rating`,
      });
    }
    if (metrics.sectionsWithoutRul > 0) {
      warnings.push({
        label: `${metrics.sectionsWithoutRul} section(s) missing RUL`,
      });
    }

    const p1p2NoPhotos = findings
      .filter((f) => f.priority && f.priority <= 2)
      .filter((f) => !rawCaptures.some((c) => c.finding_id === f.id));
    if (p1p2NoPhotos.length > 0) {
      warnings.push({
        label: `${p1p2NoPhotos.length} P1/P2 finding(s) without photos`,
      });
    }
  }

  // General warnings
  allSections.forEach((ps) => {
    const sf = findingsBySection[ps.id] ?? [];
    const su = unitsBySection[ps.id] ?? [];
    if (sf.length === 0 && su.length === 0) {
      warnings.push({ label: `${ps.section.name} — no activity` });
    }
  });

  return {
    project: project as InspectionProject,
    supabase,
    sectionsByGroup,
    enabledSections: allSections,
    findings,
    units,
    captures: imageCaptures,
    allCaptures: rawCaptures,
    checklistItems,
    findingsBySection,
    findingsByUnit,
    unitsBySection,
    capturesByFinding,
    capturesByUnit,
    capturesBySection,
    checklistItemMap,
    metrics,
    warnings,
  };
}
