/**
 * Inspection Export — Excel Workbook Generator
 * Produces a .xlsx workbook with three sheets:
 *   Sheet 1: "Findings" — all findings with priority, exposure, risk flags
 *   Sheet 2: "Unit Grading" — all inspection units with component grades
 *   Sheet 3: "Section Overview" — section condition, RUL, finding/photo counts
 */

import ExcelJS from "exceljs";
import {
  PRIORITY_LABELS,
  RISK_FLAG_LABELS,
  INSPECTION_CONDITION_LABELS,
  INSPECTION_UNIT_GRADES,
  OVERALL_CONDITION_LABELS,
  OCCUPANCY_STATUS_LABELS,
  WALK_STATUS_LABELS,
  TURN_STAGE_LABELS,
} from "@/lib/inspection-constants";
import type {
  PriorityLevel,
  RiskFlag,
  InspectionUnitGrade,
} from "@/lib/inspection-types";
import type { InspectionExportData } from "./fetch-inspection-data";

// ---- Shared styling helpers ----

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF2D5F3F" }, // forest green
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFFFFFFF" },
  size: 11,
};

const HEADER_ALIGNMENT: Partial<ExcelJS.Alignment> = {
  horizontal: "center",
  vertical: "middle",
};

function styleHeaderRow(sheet: ExcelJS.Worksheet) {
  const row = sheet.getRow(1);
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = HEADER_ALIGNMENT;
    cell.border = {
      bottom: { style: "thin", color: { argb: "FF1F3D2A" } },
    };
  });
  row.height = 24;
}

function autoFitColumns(
  sheet: ExcelJS.Worksheet,
  minWidth = 10,
  maxWidth = 50
) {
  sheet.columns.forEach((col) => {
    let max = minWidth;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? "").length + 2;
      if (len > max) max = len;
    });
    col.width = Math.min(max, maxWidth);
  });
}

function addStripes(sheet: ExcelJS.Worksheet) {
  for (let i = 2; i <= sheet.rowCount; i++) {
    if (i % 2 === 0) {
      sheet.getRow(i).eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF3F4F6" }, // gray-100
        };
      });
    }
  }
}

// ---- Label helpers ----

function priorityLabel(p: PriorityLevel | null): string {
  if (!p) return "Good / No Issue";
  const info = PRIORITY_LABELS[p];
  return `P${p} - ${info.label}`;
}

function gradeLabel(g: string | null): string {
  if (!g) return "";
  const info = INSPECTION_UNIT_GRADES[g as InspectionUnitGrade];
  return info ? `${g} - ${info.label}` : g;
}

function conditionLabel(c: number | null): string {
  if (c == null) return "";
  const info = OVERALL_CONDITION_LABELS[c];
  return info ? `${c} - ${info.label}` : String(c);
}

function sectionConditionLabel(c: number | null): string {
  if (c == null) return "";
  const label = INSPECTION_CONDITION_LABELS[c] ?? "";
  return `${c}/5 - ${label}`;
}

// Exposure dollar lookup
const EXPOSURE_MAP: Record<string, number> = {
  "500": 500,
  "1000": 1000,
  "2000": 2000,
  "3000": 3000,
};

// ============================================
// Main Excel generator
// ============================================

export async function generateInspectionExcel(
  data: InspectionExportData
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Asset Atlas Pro";
  wb.created = new Date();

  // ---- Sheet 1: Findings ----
  const findingSheet = wb.addWorksheet("Findings");

  findingSheet.columns = [
    { header: "Group", key: "group" },
    { header: "Section", key: "section" },
    { header: "Checklist Item", key: "checklist_item" },
    { header: "Finding Title", key: "title" },
    { header: "Priority", key: "priority" },
    { header: "Exposure $", key: "exposure" },
    { header: "Risk Flags", key: "risk_flags" },
    { header: "Notes", key: "notes" },
    { header: "Photos", key: "photos" },
  ];

  // Build section name lookup
  const sectionNameMap: Record<string, string> = {};
  const sectionGroupMap: Record<string, string> = {};
  for (const ps of data.enabledSections) {
    sectionNameMap[ps.id] = ps.section.name;
    sectionGroupMap[ps.id] = ps.section.group_name;
  }

  for (const f of data.findings) {
    const amount =
      f.exposure_bucket === "custom" && f.exposure_custom
        ? f.exposure_custom
        : f.exposure_bucket
          ? (EXPOSURE_MAP[f.exposure_bucket] ?? 0)
          : 0;
    const flags = (f.risk_flags ?? [])
      .map((flag) => RISK_FLAG_LABELS[flag as RiskFlag]?.label ?? flag)
      .join(", ");
    const ciName = f.checklist_item_id
      ? data.checklistItemMap[f.checklist_item_id]?.name ?? ""
      : "";
    const photoCount = (data.capturesByFinding[f.id] ?? []).length;

    findingSheet.addRow({
      group: sectionGroupMap[f.project_section_id] ?? "",
      section: sectionNameMap[f.project_section_id] ?? "",
      checklist_item: ciName,
      title: f.title,
      priority: priorityLabel(f.priority),
      exposure: amount > 0 ? amount : "",
      risk_flags: flags,
      notes: f.notes ?? "",
      photos: photoCount > 0 ? photoCount : "",
    });
  }

  styleHeaderRow(findingSheet);
  autoFitColumns(findingSheet);
  findingSheet.views = [{ state: "frozen", ySplit: 1, xSplit: 0 }];
  addStripes(findingSheet);

  // ---- Sheet 2: Unit Grading ----
  const unitSheet = wb.addWorksheet("Unit Grading");

  unitSheet.columns = [
    { header: "Building", key: "building" },
    { header: "Unit #", key: "unit_number" },
    { header: "Occupancy", key: "occupancy" },
    { header: "Walk Status", key: "walk_status" },
    { header: "Turn Stage", key: "turn_stage" },
    { header: "Overall Condition", key: "overall_condition" },
    { header: "Housekeeping", key: "housekeeping" },
    { header: "Floors", key: "floors" },
    { header: "Cabinets", key: "cabinets" },
    { header: "Countertops", key: "countertops" },
    { header: "Bath", key: "bath" },
    { header: "Plumbing", key: "plumbing" },
    { header: "Electrical", key: "electrical" },
    { header: "Windows/Doors", key: "windows_doors" },
    { header: "Appliances", key: "appliances" },
    { header: "Leak", key: "leak" },
    { header: "Mold", key: "mold" },
    { header: "Notes", key: "notes" },
    { header: "Photos", key: "photos" },
  ];

  for (const u of data.units) {
    const unitPhotoCount = (data.capturesByUnit[u.id] ?? []).length;
    unitSheet.addRow({
      building: u.building,
      unit_number: u.unit_number,
      occupancy: OCCUPANCY_STATUS_LABELS[u.occupancy_status]?.label ?? u.occupancy_status,
      walk_status: WALK_STATUS_LABELS[u.walk_status]?.label ?? u.walk_status,
      turn_stage: u.turn_stage
        ? (TURN_STAGE_LABELS[u.turn_stage]?.label ?? u.turn_stage)
        : "",
      overall_condition: conditionLabel(u.overall_condition),
      housekeeping: gradeLabel(u.tenant_housekeeping),
      floors: gradeLabel(u.floors),
      cabinets: gradeLabel(u.cabinets),
      countertops: gradeLabel(u.countertops),
      bath: gradeLabel(u.bath_condition),
      plumbing: gradeLabel(u.plumbing_fixtures),
      electrical: gradeLabel(u.electrical_fixtures),
      windows_doors: gradeLabel(u.windows_doors),
      appliances: (u.appliances ?? []).join("; "),
      leak: u.has_leak_evidence ? "Yes" : "No",
      mold: u.has_mold_indicators ? "Yes" : "No",
      notes: u.notes ?? "",
      photos: unitPhotoCount > 0 ? unitPhotoCount : "",
    });
  }

  styleHeaderRow(unitSheet);
  autoFitColumns(unitSheet);
  unitSheet.views = [{ state: "frozen", ySplit: 1, xSplit: 0 }];
  addStripes(unitSheet);

  // ---- Sheet 3: Section Overview ----
  const overviewSheet = wb.addWorksheet("Section Overview");

  overviewSheet.columns = [
    { header: "Group", key: "group" },
    { header: "Section", key: "section" },
    { header: "Condition Rating", key: "condition" },
    { header: "RUL", key: "rul" },
    { header: "Findings", key: "findings" },
    { header: "Photos", key: "photos" },
    { header: "Notes", key: "notes" },
  ];

  for (const ps of data.enabledSections) {
    const findCount = (data.findingsBySection[ps.id] ?? []).length;
    // Count ALL captures for this section (finding + unit + section-level)
    const sectionPhotos = data.captures.filter(
      (c) => c.project_section_id === ps.id
    ).length;

    overviewSheet.addRow({
      group: ps.section.group_name,
      section: ps.section.name,
      condition: sectionConditionLabel(ps.condition_rating),
      rul: ps.rul_bucket ?? "",
      findings: findCount > 0 ? findCount : "",
      photos: sectionPhotos > 0 ? sectionPhotos : "",
      notes: ps.notes ?? "",
    });
  }

  styleHeaderRow(overviewSheet);
  autoFitColumns(overviewSheet);
  overviewSheet.views = [{ state: "frozen", ySplit: 1, xSplit: 0 }];
  addStripes(overviewSheet);

  // ---- Write to buffer ----
  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
