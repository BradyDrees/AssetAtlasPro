/**
 * Unit Turn Export — Excel Workbook Generator
 * Produces a .xlsx workbook with two sheets:
 *   Sheet 1: "Unit Summary" — one row per unit with progress and status counts
 *   Sheet 2: "Item Details" — one row per assessed item across all units
 */

import ExcelJS from "exceljs";
import {
  ITEM_STATUS_LABELS,
  PAINT_SCOPE_LABELS,
} from "@/lib/unit-turn-constants";
import type { UnitTurnExportData } from "./fetch-unit-turn-data";
import { toTitleCase } from "@/lib/utils";

// ---- Shared styling helpers (matches inspection-excel pattern) ----

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

// ============================================
// Main Excel generator
// ============================================

export async function generateUnitTurnExcel(
  data: UnitTurnExportData
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Asset Atlas Pro";
  wb.created = new Date();

  // ---- Sheet 1: Unit Summary ----
  const summarySheet = wb.addWorksheet("Unit Summary");

  summarySheet.columns = [
    { header: "Property", key: "property" },
    { header: "Unit #", key: "unit_label" },
    { header: "Status", key: "status" },
    { header: "Items Assessed", key: "assessed" },
    { header: "Total Items", key: "total" },
    { header: "% Complete", key: "pct" },
    { header: "Good", key: "good" },
    { header: "Repair", key: "repair" },
    { header: "Replace", key: "replace" },
    { header: "N/A", key: "na" },
    { header: "Touch Up", key: "touch_up" },
    { header: "Full Paint", key: "full_paint" },
    { header: "Notes", key: "notes" },
    { header: "Photos", key: "photos" },
  ];

  for (const unit of data.units) {
    const items = data.itemsByUnit[unit.id] ?? [];
    const notes = data.notesByUnit[unit.id] ?? [];
    const photos = data.photosByUnit[unit.id] ?? [];
    const progress = data.progressByUnit[unit.id] ?? { total: 0, assessed: 0 };
    const pct = progress.total > 0 ? Math.round((progress.assessed / progress.total) * 100) : 0;

    let good = 0, repair = 0, replace = 0, na = 0, touchUp = 0, fullPaint = 0;
    for (const item of items) {
      if (item.is_na) { na++; continue; }
      const cat = data.categoryMap[item.category_id];
      if (cat?.category_type === "paint") {
        if (item.paint_scope === "touch_up") touchUp++;
        else if (item.paint_scope === "full") fullPaint++;
      } else {
        if (item.status === "good") good++;
        else if (item.status === "repair") repair++;
        else if (item.status === "replace") replace++;
      }
    }

    const statusLabel = unit.status.replace(/_/g, " ");
    const noteCount = notes.filter((n) => n.text && n.text.trim()).length;

    summarySheet.addRow({
      property: unit.property,
      unit_label: unit.unit_label,
      status: statusLabel,
      assessed: progress.assessed,
      total: progress.total,
      pct: `${pct}%`,
      good,
      repair,
      replace,
      na,
      touch_up: touchUp,
      full_paint: fullPaint,
      notes: noteCount > 0 ? noteCount : "",
      photos: photos.length > 0 ? photos.length : "",
    });
  }

  styleHeaderRow(summarySheet);
  autoFitColumns(summarySheet);
  summarySheet.views = [{ state: "frozen", ySplit: 1, xSplit: 0 }];
  addStripes(summarySheet);

  // ---- Sheet 2: Item Details ----
  const detailSheet = wb.addWorksheet("Item Details");

  detailSheet.columns = [
    { header: "Property", key: "property" },
    { header: "Unit #", key: "unit_label" },
    { header: "Category", key: "category" },
    { header: "Item Name", key: "item_name" },
    { header: "Status", key: "status" },
    { header: "Paint Scope", key: "paint_scope" },
    { header: "Notes", key: "notes" },
    { header: "Photos", key: "photos" },
  ];

  for (const unit of data.units) {
    const items = data.itemsByUnit[unit.id] ?? [];
    const notes = data.notesByUnit[unit.id] ?? [];

    for (const item of items) {
      // Skip N/A items
      if (item.is_na) continue;

      const cat = data.categoryMap[item.category_id];
      const isPaint = cat?.category_type === "paint";
      const isCleaning = cat?.category_type === "cleaning";

      // Skip unassessed items
      if (isPaint && item.paint_scope == null) continue;
      if (!isPaint && item.status == null) continue;

      let statusText = "";
      if (isPaint) {
        statusText = item.paint_scope
          ? PAINT_SCOPE_LABELS[item.paint_scope]?.label ?? item.paint_scope
          : "";
      } else if (isCleaning && item.status === "good") {
        statusText = "Done";
      } else if (item.status) {
        statusText = ITEM_STATUS_LABELS[item.status]?.label ?? item.status;
      }

      // Find notes for this item
      const itemNotes = notes
        .filter((n) => n.item_id === item.id)
        .map((n) => n.text)
        .filter((t) => t && t.trim())
        .join("; ");

      // Count photos for this item
      const itemPhotos = notes
        .filter((n) => n.item_id === item.id)
        .reduce((sum, n) => sum + (n.photos?.length ?? 0), 0);

      detailSheet.addRow({
        property: unit.property,
        unit_label: unit.unit_label,
        category: toTitleCase(cat?.name ?? ""),
        item_name: toTitleCase(item.template_item?.name ?? "Unknown"),
        status: statusText,
        paint_scope: isPaint && item.paint_scope
          ? PAINT_SCOPE_LABELS[item.paint_scope]?.label ?? ""
          : "",
        notes: itemNotes,
        photos: itemPhotos > 0 ? itemPhotos : "",
      });
    }
  }

  styleHeaderRow(detailSheet);
  autoFitColumns(detailSheet);
  detailSheet.views = [{ state: "frozen", ySplit: 1, xSplit: 0 }];
  addStripes(detailSheet);

  // ---- Write to buffer ----
  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
