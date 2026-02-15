/**
 * Excel Export Generator
 * Produces a .xlsx workbook with two sheets:
 *   Sheet 1: "Unit Grading" — all units sorted by building + unit number
 *   Sheet 2: "Section Items" — all non-unit section items with ratings & notes
 */

import ExcelJS from "exceljs";
import {
  TENANT_GRADES,
  UNIT_GRADES,
  ITEM_GRADES,
  CABINET_OPTIONS,
} from "@/lib/unit-constants";
import { CONDITION_LABELS } from "@/lib/types";
import type { ConditionRating } from "@/lib/types";
import type { ProjectExportData } from "./fetch-project-data";

// ---- Grade label helpers ----

function tenantGradeLabel(grade: string | null): string {
  if (!grade) return "";
  const g = TENANT_GRADES[grade as keyof typeof TENANT_GRADES];
  return g ? `${grade} - ${g.label}` : grade;
}

function unitGradeLabel(grade: string | null): string {
  if (!grade) return "";
  const g = UNIT_GRADES[grade as keyof typeof UNIT_GRADES];
  return g ? `${grade} - ${g.label}` : grade;
}

function itemGradeLabel(grade: string | null): string {
  if (!grade) return "";
  const g = ITEM_GRADES[grade as keyof typeof ITEM_GRADES];
  return g ? `${grade} - ${g.label}` : grade;
}

function cabinetLabel(grade: string | null): string {
  if (!grade) return "";
  const g = CABINET_OPTIONS[grade as keyof typeof CABINET_OPTIONS];
  return g ? `${grade} - ${g.label}` : grade;
}

function conditionLabel(rating: number | null): string {
  if (rating == null) return "";
  const label = CONDITION_LABELS[rating as ConditionRating];
  return label ? `${rating} - ${label}` : String(rating);
}

// ---- Shared styling helpers ----

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF2D5F3F" }, // brand-600 (forest green)
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

function autoFitColumns(sheet: ExcelJS.Worksheet, minWidth = 10, maxWidth = 50) {
  sheet.columns.forEach((col) => {
    let max = minWidth;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? "").length + 2;
      if (len > max) max = len;
    });
    col.width = Math.min(max, maxWidth);
  });
}

// ============================================
// Main Excel generator
// ============================================

export async function generateExcel(data: ProjectExportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Asset Atlas Pro";
  wb.created = new Date();

  // ---- Sheet 1: Unit Grading ----
  const unitSheet = wb.addWorksheet("Unit Grading");

  unitSheet.columns = [
    { header: "Building", key: "building" },
    { header: "Unit #", key: "unit_number" },
    { header: "BD/BA", key: "bd_ba" },
    { header: "Tenant Grade", key: "tenant_grade" },
    { header: "Unit Grade", key: "unit_grade" },
    { header: "Cabinets", key: "cabinets" },
    { header: "Countertop", key: "countertop" },
    { header: "Flooring", key: "flooring" },
    { header: "Mold", key: "mold" },
    { header: "W/D Connection", key: "wd_connect" },
    { header: "Appliances", key: "appliances" },
    { header: "Notes", key: "notes" },
    { header: "Photos", key: "photos" },
  ];

  // Units are already sorted by building ASC + unit_number ASC in fetchProjectData
  for (const u of data.units) {
    const photoCount = data.capturesByUnit[u.id]?.length ?? 0;
    unitSheet.addRow({
      building: u.building,
      unit_number: u.unit_number,
      bd_ba: u.bd_ba ?? "",
      tenant_grade: tenantGradeLabel(u.tenant_grade),
      unit_grade: unitGradeLabel(u.unit_grade),
      cabinets: cabinetLabel(u.cabinets),
      countertop: itemGradeLabel(u.countertop),
      flooring: itemGradeLabel(u.flooring),
      mold: u.has_mold ? "Yes" : "No",
      wd_connect: u.has_wd_connect ? "Yes" : "No",
      appliances: (u.appliances ?? []).join("; "),
      notes: u.notes ?? "",
      photos: photoCount > 0 ? photoCount : "",
    });
  }

  styleHeaderRow(unitSheet);
  autoFitColumns(unitSheet);

  // Freeze the header row
  unitSheet.views = [{ state: "frozen", ySplit: 1, xSplit: 0 }];

  // Add alternating row stripes for readability
  for (let i = 2; i <= unitSheet.rowCount; i++) {
    if (i % 2 === 0) {
      unitSheet.getRow(i).eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF3F4F6" }, // gray-100
        };
      });
    }
  }

  // ---- Sheet 2: Section Items ----
  const itemSheet = wb.addWorksheet("Section Items");

  itemSheet.columns = [
    { header: "Group", key: "group" },
    { header: "Section", key: "section" },
    { header: "Item Name", key: "item_name" },
    { header: "Condition Rating", key: "condition" },
    { header: "Notes", key: "notes" },
    { header: "Photos", key: "photos" },
  ];

  for (const group of data.sectionsByGroup) {
    for (const ps of group.sections) {
      if (ps.section.is_unit_mode) continue;

      const items = data.itemsBySection[ps.id] ?? [];
      if (items.length === 0) {
        itemSheet.addRow({
          group: group.groupName,
          section: ps.section.name,
          item_name: "",
          condition: "",
          notes: "",
          photos: "",
        });
        continue;
      }

      for (const item of items) {
        const photoCount = data.capturesByItem[item.id]?.length ?? 0;
        itemSheet.addRow({
          group: group.groupName,
          section: ps.section.name,
          item_name: item.name,
          condition: conditionLabel(item.condition_rating),
          notes: item.notes ?? "",
          photos: photoCount > 0 ? photoCount : "",
        });
      }
    }
  }

  styleHeaderRow(itemSheet);
  autoFitColumns(itemSheet);
  itemSheet.views = [{ state: "frozen", ySplit: 1, xSplit: 0 }];

  for (let i = 2; i <= itemSheet.rowCount; i++) {
    if (i % 2 === 0) {
      itemSheet.getRow(i).eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF3F4F6" },
        };
      });
    }
  }

  // ---- Write to buffer ----
  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
