/**
 * PDF Export — Builder Utilities
 * Cursor abstraction, image helpers, and shared rendering functions.
 * Every rendering function takes (doc, cursor, ...) — cursor is the single source of truth.
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import sharp from "sharp";
// Storage base URL for direct public access (no Supabase client needed)
const STORAGE_BASE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/dd-captures`;
import type { DDProject, DDUnit, DDSectionItem, DDCapture } from "@/lib/types";
import { CONDITION_LABELS } from "@/lib/types";
import {
  TENANT_GRADES,
  UNIT_GRADES,
  ITEM_GRADES,
  CABINET_OPTIONS,
} from "@/lib/unit-constants";
import type { ExportMetrics } from "./fetch-project-data";
import {
  PRIORITY_LABELS,
  GOOD_LABEL,
  RISK_FLAG_LABELS,
  INSPECTION_CONDITION_LABELS,
  RUL_COLORS,
  INSPECTION_TYPE_LABELS,
  ASSET_ARCHETYPE_LABELS,
  INSPECTION_UNIT_GRADES,
  OVERALL_CONDITION_LABELS,
  OCCUPANCY_STATUS_LABELS,
  WALK_STATUS_LABELS,
} from "@/lib/inspection-constants";
import type {
  InspectionProject,
  InspectionFinding,
  InspectionUnit,
  InspectionCapture,
  InspectionProjectSectionWithDetails,
  InspectionChecklistItem,
  PriorityLevel,
  RiskFlag,
  RulBucket,
  InspectionUnitGrade,
} from "@/lib/inspection-types";
import type { InspectionExportMetrics } from "./fetch-inspection-data";

// ===== CONSTANTS =====
export const MARGIN = 20;
const SPACING = 8;
const PAGE_WIDTH = 210; // A4 mm
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const TOP_MARGIN = MARGIN;

// Photo grid constants
const GRID_COLS = 2;
const GRID_GAP = 6;
const PHOTO_WIDTH = (CONTENT_WIDTH - GRID_GAP) / GRID_COLS;
const PHOTO_HEIGHT = 60; // mm per image
const CAPTION_HEIGHT = 6;
const ROW_HEIGHT = PHOTO_HEIGHT + CAPTION_HEIGHT + 4; // image + caption + padding

// ===== CURSOR ABSTRACTION =====
export interface PdfCursor {
  y: number;
}

export function createCursor(): PdfCursor {
  return { y: TOP_MARGIN };
}

export function setCursorY(c: PdfCursor, y: number): void {
  c.y = y;
}

export function advanceY(c: PdfCursor, amount: number): void {
  c.y += amount;
}

/**
 * Ensures enough vertical space remains on the current page.
 * If not, adds a new page and resets cursor to top margin.
 * Returns true if a new page was added.
 */
export function ensureSpace(
  doc: jsPDF,
  cursor: PdfCursor,
  needed: number
): boolean {
  if (cursor.y + needed > PAGE_HEIGHT - MARGIN) {
    doc.addPage();
    setCursorY(cursor, TOP_MARGIN);
    return true;
  }
  return false;
}

// ===== IMAGE UTILITIES =====

const UNSUPPORTED_EXTS = new Set(["heic", "heif"]);

/**
 * Downloads an image from Supabase Storage via direct public URL.
 * No Supabase client needed — uses the public storage endpoint.
 * Returns the raw buffer or null on failure.
 */
export async function downloadImageBuffer(
  imagePath: string
): Promise<Buffer | null> {
  try {
    const ext = imagePath.split(".").pop()?.toLowerCase() ?? "";
    if (UNSUPPORTED_EXTS.has(ext)) {
      console.warn(`Skipping unsupported image format: ${imagePath}`);
      return null;
    }

    const url = `${STORAGE_BASE_URL}/${imagePath}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.warn("Image download failed:", imagePath, res.status);
      return null;
    }

    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch (err) {
    console.warn("Image download error:", imagePath, err);
    return null;
  }
}

/**
 * Resizes an image buffer for PDF embedding.
 * Returns base64 data URL or empty string on failure.
 */
export async function resizeImageForPdf(buf: Buffer): Promise<string> {
  let resized: Buffer;
  try {
    resized = await sharp(buf)
      .resize(1200, undefined, { withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch {
    console.warn("sharp resize failed, using original buffer");
    resized = buf;
  }
  return `data:image/jpeg;base64,${resized.toString("base64")}`;
}

/**
 * Downloads and resizes an image for PDF embedding.
 * Returns base64 data URL or empty string.
 */
export async function fetchAndResizeImage(
  imagePath: string
): Promise<string> {
  const buf = await downloadImageBuffer(imagePath);
  if (!buf) return "";
  return resizeImageForPdf(buf);
}

// ===== DATE FORMATTING =====

/** Deterministic YYYY-MM-DD format — no locale dependency. */
export function formatDate(isoString: string): string {
  const d = new Date(isoString);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ===== RENDERING FUNCTIONS =====

/** Adds the cover page with project info. */
export function addCoverPage(
  doc: jsPDF,
  cursor: PdfCursor,
  project: DDProject
): void {
  setCursorY(cursor, 80);

  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text(project.name, PAGE_WIDTH / 2, cursor.y, { align: "center" });
  advanceY(cursor, 14);

  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.text(project.property_name, PAGE_WIDTH / 2, cursor.y, {
    align: "center",
  });
  advanceY(cursor, 8);

  if (project.address) {
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(project.address, PAGE_WIDTH / 2, cursor.y, { align: "center" });
    advanceY(cursor, 8);
  }

  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Generated: ${formatDate(new Date().toISOString())}`, PAGE_WIDTH / 2, cursor.y, {
    align: "center",
  });
  advanceY(cursor, 6);

  const statusLabel =
    project.status === "COMPLETE"
      ? "Complete"
      : project.status === "IN_PROGRESS"
        ? "In Progress"
        : "Draft";
  doc.text(`Status: ${statusLabel}`, PAGE_WIDTH / 2, cursor.y, {
    align: "center",
  });

  doc.setTextColor(0);

  // Start next content on page 2
  doc.addPage();
  setCursorY(cursor, TOP_MARGIN);
}

/** Adds summary metrics block. */
export function addMetricsSummary(
  doc: jsPDF,
  cursor: PdfCursor,
  metrics: ExportMetrics
): void {
  ensureSpace(doc, cursor, 50);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Summary", MARGIN, cursor.y);
  advanceY(cursor, 8);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const lines = [
    `Sections: ${metrics.enabledSections} enabled, ${metrics.sectionsWithActivity} with activity, ${metrics.sectionsUntouched} untouched`,
    `Units: ${metrics.totalUnits} total, ${metrics.unitsWithPhotos} with photos, ${metrics.unitsMissingGrades} missing grades`,
    `Captures: ${metrics.totalCaptures} total (${metrics.unitLevelCaptures} unit, ${metrics.itemLevelCaptures} item, ${metrics.sectionLevelCaptures} section-level)`,
  ];

  for (const line of lines) {
    doc.text(line, MARGIN, cursor.y);
    advanceY(cursor, 5);
  }

  advanceY(cursor, SPACING);
}

/** Adds warnings / needs attention list. */
export function addWarningsList(
  doc: jsPDF,
  cursor: PdfCursor,
  warnings: { label: string }[]
): void {
  if (warnings.length === 0) return;

  ensureSpace(doc, cursor, 20);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Needs Attention (${warnings.length})`, MARGIN, cursor.y);
  advanceY(cursor, 7);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");

  for (const w of warnings) {
    ensureSpace(doc, cursor, 6);
    doc.text(`• ${w.label}`, MARGIN + 2, cursor.y);
    advanceY(cursor, 4.5);
  }

  advanceY(cursor, SPACING);
}

/** Adds a section header with group context. */
export function addSectionHeader(
  doc: jsPDF,
  cursor: PdfCursor,
  sectionName: string,
  groupName: string
): void {
  ensureSpace(doc, cursor, 18);

  // Gray background bar
  doc.setFillColor(240, 240, 240);
  doc.rect(MARGIN, cursor.y - 4, CONTENT_WIDTH, 10, "F");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40);
  doc.text(`${groupName} › ${sectionName}`, MARGIN + 3, cursor.y + 2);
  doc.setTextColor(0);
  advanceY(cursor, 12);
}

/** Adds a group header. */
export function addGroupHeader(
  doc: jsPDF,
  cursor: PdfCursor,
  groupName: string
): void {
  ensureSpace(doc, cursor, 16);

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(45, 95, 63); // forest green
  doc.text(groupName, MARGIN, cursor.y);
  doc.setTextColor(0);
  advanceY(cursor, 4);

  // Underline
  doc.setDrawColor(45, 95, 63);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, cursor.y, MARGIN + CONTENT_WIDTH, cursor.y);
  doc.setDrawColor(0);
  advanceY(cursor, 6);
}

/** Renders a unit grading table using autoTable. */
export function addUnitTable(
  doc: jsPDF,
  cursor: PdfCursor,
  units: DDUnit[]
): void {
  if (units.length === 0) return;

  ensureSpace(doc, cursor, 30);

  const getGradeLabel = (
    grade: string | null,
    map: Record<string, { label: string }>
  ) => {
    if (!grade) return "—";
    return `${grade} (${map[grade]?.label ?? grade})`;
  };

  const body = units.map((u) => [
    u.building,
    u.unit_number,
    u.bd_ba ?? "—",
    u.tenant_grade
      ? `${u.tenant_grade}`
      : "—",
    u.unit_grade
      ? `${u.unit_grade}`
      : "—",
    u.cabinets ?? "—",
    u.countertop
      ? `${u.countertop}`
      : "—",
    u.flooring
      ? `${u.flooring}`
      : "—",
    u.has_mold ? "Yes" : "No",
    u.has_wd_connect ? "Yes" : "No",
  ]);

  autoTable(doc, {
    startY: cursor.y,
    margin: { left: MARGIN, right: MARGIN },
    head: [
      [
        "Bldg",
        "Unit",
        "BD/BA",
        "Tenant",
        "Unit Gr.",
        "Cabinets",
        "Counter",
        "Floor",
        "Mold",
        "W/D",
      ],
    ],
    body,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [45, 95, 63], textColor: 255, fontSize: 7 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  // Reset cursor after autoTable
  const finalY = (doc as any).lastAutoTable?.finalY ?? cursor.y + 20;
  setCursorY(cursor, finalY + SPACING);
}

/** Renders an item details block (name, rating, notes). */
export function addItemDetails(
  doc: jsPDF,
  cursor: PdfCursor,
  item: DDSectionItem
): void {
  ensureSpace(doc, cursor, 14);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(item.name, MARGIN + 4, cursor.y);
  advanceY(cursor, 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  if (item.condition_rating) {
    const label =
      CONDITION_LABELS[item.condition_rating as 1 | 2 | 3 | 4 | 5] ?? "";
    doc.text(
      `Condition: ${item.condition_rating}/5 — ${label}`,
      MARGIN + 6,
      cursor.y
    );
    advanceY(cursor, 4);
  }

  if (item.notes && item.notes.trim()) {
    const noteLines = doc.splitTextToSize(
      `Notes: ${item.notes}`,
      CONTENT_WIDTH - 10
    );
    for (const line of noteLines) {
      ensureSpace(doc, cursor, 5);
      doc.text(line, MARGIN + 6, cursor.y);
      advanceY(cursor, 4);
    }
  }

  advanceY(cursor, 3);
}

// ===== PHOTO GRID =====

export interface PhotoForGrid {
  base64: string; // data URL
  caption: string;
}

/**
 * Renders photos in a 2×2 grid (4 per page).
 * Slot-based pagination — no unconditional addPage().
 * Returns the number of photos rendered.
 */
export function addPhotoGrid(
  doc: jsPDF,
  cursor: PdfCursor,
  photos: PhotoForGrid[]
): number {
  if (photos.length === 0) return 0;

  let rendered = 0;

  for (let i = 0; i < photos.length; i += GRID_COLS) {
    // Check if we need a new page for this row
    ensureSpace(doc, cursor, ROW_HEIGHT);

    const rowPhotos = photos.slice(i, i + GRID_COLS);

    for (let col = 0; col < rowPhotos.length; col++) {
      const photo = rowPhotos[col];
      if (!photo.base64) continue; // Skip failed images

      const x = MARGIN + col * (PHOTO_WIDTH + GRID_GAP);

      try {
        doc.addImage(
          photo.base64,
          "JPEG",
          x,
          cursor.y,
          PHOTO_WIDTH,
          PHOTO_HEIGHT
        );
      } catch (err) {
        console.warn("Failed to add image to PDF:", err);
        // Draw placeholder rectangle
        doc.setDrawColor(200);
        doc.rect(x, cursor.y, PHOTO_WIDTH, PHOTO_HEIGHT);
        doc.setFontSize(7);
        doc.text("Image unavailable", x + 2, cursor.y + PHOTO_HEIGHT / 2);
      }

      // Caption
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80);
      const captionText = doc.splitTextToSize(photo.caption, PHOTO_WIDTH - 2);
      doc.text(captionText[0] ?? "", x + 1, cursor.y + PHOTO_HEIGHT + 3);
      doc.setTextColor(0);

      rendered++;
    }

    advanceY(cursor, ROW_HEIGHT);
  }

  return rendered;
}

// ===== SECTION OVERVIEW TABLE (for summary) =====

export function addSectionOverviewTable(
  doc: jsPDF,
  cursor: PdfCursor,
  sections: {
    name: string;
    itemCount: number;
    avgRating: string;
  }[]
): void {
  if (sections.length === 0) return;

  ensureSpace(doc, cursor, 20);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Section Overview", MARGIN, cursor.y);
  advanceY(cursor, 7);

  autoTable(doc, {
    startY: cursor.y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Section", "Items", "Avg. Condition"]],
    body: sections.map((s) => [s.name, String(s.itemCount), s.avgRating]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [45, 95, 63], textColor: 255, fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  const finalY = (doc as any).lastAutoTable?.finalY ?? cursor.y + 20;
  setCursorY(cursor, finalY + SPACING);
}

/** Adds a truncation warning page. */
export function addTruncationWarning(
  doc: jsPDF,
  cursor: PdfCursor,
  totalPhotos: number,
  maxPhotos: number
): void {
  doc.addPage();
  setCursorY(cursor, 80);

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(200, 0, 0);
  doc.text("Report Truncated", PAGE_WIDTH / 2, cursor.y, { align: "center" });
  advanceY(cursor, 12);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60);
  doc.text(
    `This report contains ${totalPhotos} photos but only ${maxPhotos} were embedded.`,
    PAGE_WIDTH / 2,
    cursor.y,
    { align: "center" }
  );
  advanceY(cursor, 8);
  doc.text(
    "Use Photo Book or ZIP export for the full photo set.",
    PAGE_WIDTH / 2,
    cursor.y,
    { align: "center" }
  );
  doc.setTextColor(0);
}

/** Creates a new jsPDF document with standard settings. */
export function createPdfDoc(): jsPDF {
  return new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
}

// =========================================================================
// INSPECTION-MODE HELPERS
// =========================================================================

// ---- Brand colors for PDF (RGB) ----
const BRAND_RGB: [number, number, number] = [45, 95, 63]; // forest green
const GOLD_RGB: [number, number, number] = [163, 130, 58]; // muted gold

/** Adds the inspection cover page. */
export function addInspectionCoverPage(
  doc: jsPDF,
  cursor: PdfCursor,
  project: InspectionProject
): void {
  setCursorY(cursor, 70);

  // Title
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND_RGB);
  doc.text(project.name, PAGE_WIDTH / 2, cursor.y, { align: "center" });
  doc.setTextColor(0);
  advanceY(cursor, 14);

  // Property name
  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.text(project.property_name, PAGE_WIDTH / 2, cursor.y, {
    align: "center",
  });
  advanceY(cursor, 8);

  // Address
  if (project.address) {
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(project.address, PAGE_WIDTH / 2, cursor.y, { align: "center" });
    advanceY(cursor, 8);
  }

  // Inspection type + archetype
  doc.setFontSize(10);
  doc.setTextColor(80);
  const typeLabel =
    INSPECTION_TYPE_LABELS[project.inspection_type] ?? project.inspection_type;
  const archLabel =
    ASSET_ARCHETYPE_LABELS[project.asset_archetype]?.label ??
    project.asset_archetype;
  doc.text(`${typeLabel} — ${archLabel}`, PAGE_WIDTH / 2, cursor.y, {
    align: "center",
  });
  advanceY(cursor, 8);

  // Date
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(
    `Generated: ${formatDate(new Date().toISOString())}`,
    PAGE_WIDTH / 2,
    cursor.y,
    { align: "center" }
  );
  advanceY(cursor, 6);

  // Status
  const statusLabel =
    project.status === "COMPLETE"
      ? "Complete"
      : project.status === "IN_PROGRESS"
        ? "In Progress"
        : "Draft";
  doc.text(`Status: ${statusLabel}`, PAGE_WIDTH / 2, cursor.y, {
    align: "center",
  });

  doc.setTextColor(0);

  // Start next content on page 2
  doc.addPage();
  setCursorY(cursor, TOP_MARGIN);
}

/** Adds the priority distribution + exposure summary table. */
export function addFindingPrioritySummary(
  doc: jsPDF,
  cursor: PdfCursor,
  metrics: InspectionExportMetrics
): void {
  ensureSpace(doc, cursor, 50);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Finding Priority Summary", MARGIN, cursor.y);
  advanceY(cursor, 8);

  const fmtCur = (v: number) => "$" + v.toLocaleString("en-US");

  const body: string[][] = [];
  for (let p = 1; p <= 5; p++) {
    const info = PRIORITY_LABELS[p as PriorityLevel];
    body.push([
      `P${p} — ${info.label}`,
      info.timeline,
      String(metrics.priorityCounts[p] ?? 0),
      fmtCur(metrics.priorityExposure[p] ?? 0),
    ]);
  }
  body.push([
    "Good / No Issue",
    GOOD_LABEL.timeline,
    String(metrics.goodFindings),
    "—",
  ]);
  body.push([
    "TOTAL",
    "",
    String(metrics.totalFindings),
    fmtCur(metrics.totalExposure),
  ]);

  autoTable(doc, {
    startY: cursor.y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Priority", "Timeline", "Count", "Exposure"]],
    body,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: BRAND_RGB as any, textColor: 255, fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    didParseCell: (data: any) => {
      // Bold the TOTAL row
      if (data.row.index === body.length - 1 && data.section === "body") {
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY ?? cursor.y + 30;
  setCursorY(cursor, finalY + SPACING);
}

/** Adds exposure summary block (Immediate / Short-Term / Total). */
export function addExposureSummary(
  doc: jsPDF,
  cursor: PdfCursor,
  metrics: InspectionExportMetrics
): void {
  ensureSpace(doc, cursor, 30);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Repair Exposure Summary", MARGIN, cursor.y);
  advanceY(cursor, 7);

  const fmtCur = (v: number) => "$" + v.toLocaleString("en-US");

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const lines = [
    `Immediate Repairs (P1): ${fmtCur(metrics.immediateExposure)}`,
    `Short-Term 0–6 months (P1–P3): ${fmtCur(metrics.shortTermExposure)}`,
    `Total Identified: ${fmtCur(metrics.totalExposure)}`,
  ];
  for (const line of lines) {
    doc.text(line, MARGIN + 2, cursor.y);
    advanceY(cursor, 5);
  }
  advanceY(cursor, SPACING);
}

/** Adds risk flags summary. */
export function addRiskFlagsSummary(
  doc: jsPDF,
  cursor: PdfCursor,
  riskFlagCounts: Record<string, number>
): void {
  const flags = Object.entries(riskFlagCounts);
  if (flags.length === 0) return;

  ensureSpace(doc, cursor, 20);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Risk Flags", MARGIN, cursor.y);
  advanceY(cursor, 7);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  for (const [flag, count] of flags) {
    ensureSpace(doc, cursor, 6);
    const info = RISK_FLAG_LABELS[flag as RiskFlag];
    const label = info?.label ?? flag;
    doc.text(`• ${label}: ${count}`, MARGIN + 2, cursor.y);
    advanceY(cursor, 5);
  }
  advanceY(cursor, SPACING);
}

/** Adds a compact findings matrix table (all findings). */
export function addFindingsTable(
  doc: jsPDF,
  cursor: PdfCursor,
  findings: InspectionFinding[],
  sectionMap: Record<string, string>, // project_section_id → section name
  checklistItemMap: Record<string, InspectionChecklistItem>
): void {
  if (findings.length === 0) return;

  ensureSpace(doc, cursor, 20);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`All Findings (${findings.length})`, MARGIN, cursor.y);
  advanceY(cursor, 7);

  const fmtCur = (v: number) => (v > 0 ? "$" + v.toLocaleString("en-US") : "—");

  const body = findings.map((f) => {
    const sectionName = sectionMap[f.project_section_id] ?? "";
    const ciName = f.checklist_item_id
      ? checklistItemMap[f.checklist_item_id]?.name ?? ""
      : "";
    const pLabel = f.priority
      ? `P${f.priority} - ${PRIORITY_LABELS[f.priority].label}`
      : "Good";
    const expMap: Record<string, number> = { "500": 500, "1000": 1000, "2000": 2000, "3000": 3000 };
    const amount =
      f.exposure_bucket === "custom" && f.exposure_custom
        ? f.exposure_custom
        : f.exposure_bucket
          ? (expMap[f.exposure_bucket] ?? 0)
          : 0;
    const flags = (f.risk_flags ?? [])
      .map((flag) => RISK_FLAG_LABELS[flag]?.label ?? flag)
      .join(", ");
    return [sectionName, ciName, f.title, pLabel, fmtCur(amount), flags];
  });

  autoTable(doc, {
    startY: cursor.y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Section", "Checklist Item", "Finding", "Priority", "Exposure", "Risk Flags"]],
    body,
    styles: { fontSize: 6.5, cellPadding: 1.5 },
    headStyles: { fillColor: BRAND_RGB as any, textColor: 255, fontSize: 7 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 25 },
      2: { cellWidth: 35 },
      3: { cellWidth: 22 },
      4: { cellWidth: 18 },
      5: { cellWidth: 30 },
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY ?? cursor.y + 20;
  setCursorY(cursor, finalY + SPACING);
}

/** Adds a single finding detail block with title, priority, exposure, flags, notes. */
export function addFindingDetail(
  doc: jsPDF,
  cursor: PdfCursor,
  finding: InspectionFinding,
  checklistItemMap: Record<string, InspectionChecklistItem>
): void {
  ensureSpace(doc, cursor, 18);

  // Finding title
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(finding.title, MARGIN + 4, cursor.y);
  advanceY(cursor, 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  // Checklist item
  if (finding.checklist_item_id) {
    const ci = checklistItemMap[finding.checklist_item_id];
    if (ci) {
      doc.text(`Checklist: ${ci.name}`, MARGIN + 6, cursor.y);
      advanceY(cursor, 4);
    }
  }

  // Priority
  if (finding.priority) {
    const p = PRIORITY_LABELS[finding.priority];
    doc.text(
      `Priority: P${finding.priority} — ${p.label} (${p.timeline})`,
      MARGIN + 6,
      cursor.y
    );
    advanceY(cursor, 4);
  } else {
    doc.text("Priority: Good / No Issue", MARGIN + 6, cursor.y);
    advanceY(cursor, 4);
  }

  // Exposure
  if (finding.exposure_bucket) {
    const expDisplay: Record<string, string> = { "500": "500", "1000": "1,000", "2000": "2,000", "3000": "3,000" };
    const amount =
      finding.exposure_bucket === "custom" && finding.exposure_custom
        ? `$${finding.exposure_custom.toLocaleString("en-US")} (custom)`
        : `$${expDisplay[finding.exposure_bucket] ?? finding.exposure_bucket}`;
    doc.text(`Exposure: ${amount}`, MARGIN + 6, cursor.y);
    advanceY(cursor, 4);
  }

  // Risk flags
  if (finding.risk_flags && finding.risk_flags.length > 0) {
    const labels = finding.risk_flags
      .map((flag) => RISK_FLAG_LABELS[flag]?.label ?? flag)
      .join(", ");
    doc.text(`Risk Flags: ${labels}`, MARGIN + 6, cursor.y);
    advanceY(cursor, 4);
  }

  // Notes
  if (finding.notes && finding.notes.trim()) {
    const noteLines = doc.splitTextToSize(
      `Notes: ${finding.notes}`,
      CONTENT_WIDTH - 10
    );
    for (const line of noteLines) {
      ensureSpace(doc, cursor, 5);
      doc.text(line, MARGIN + 6, cursor.y);
      advanceY(cursor, 4);
    }
  }

  advanceY(cursor, 3);
}

/** Renders an inspection unit grading table. */
export function addInspectionUnitTable(
  doc: jsPDF,
  cursor: PdfCursor,
  units: InspectionUnit[]
): void {
  if (units.length === 0) return;

  ensureSpace(doc, cursor, 30);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Unit Grading (${units.length} units)`, MARGIN, cursor.y);
  advanceY(cursor, 7);

  const gradeLabel = (g: string | null) => {
    if (!g) return "—";
    const info = INSPECTION_UNIT_GRADES[g as InspectionUnitGrade];
    return info ? `${g} (${info.label})` : g;
  };

  const condLabel = (c: number | null) => {
    if (c == null) return "—";
    const info = OVERALL_CONDITION_LABELS[c];
    return info ? `${c} - ${info.label}` : String(c);
  };

  const body = units.map((u) => [
    u.building,
    u.unit_number,
    OCCUPANCY_STATUS_LABELS[u.occupancy_status]?.label ?? u.occupancy_status,
    condLabel(u.overall_condition),
    gradeLabel(u.tenant_housekeeping),
    gradeLabel(u.floors),
    gradeLabel(u.cabinets),
    gradeLabel(u.countertops),
    gradeLabel(u.bath_condition),
    u.has_leak_evidence ? "Yes" : "No",
    u.has_mold_indicators ? "Yes" : "No",
  ]);

  autoTable(doc, {
    startY: cursor.y,
    margin: { left: MARGIN, right: MARGIN },
    head: [
      [
        "Bldg",
        "Unit",
        "Occupancy",
        "Condition",
        "Housekeep",
        "Floors",
        "Cabinets",
        "Counters",
        "Bath",
        "Leak",
        "Mold",
      ],
    ],
    body,
    styles: { fontSize: 6, cellPadding: 1.2 },
    headStyles: { fillColor: BRAND_RGB as any, textColor: 255, fontSize: 6.5 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  const finalY = (doc as any).lastAutoTable?.finalY ?? cursor.y + 20;
  setCursorY(cursor, finalY + SPACING);
}

/** Adds a section condition/RUL overview table. */
export function addSectionConditionTable(
  doc: jsPDF,
  cursor: PdfCursor,
  sections: InspectionProjectSectionWithDetails[],
  findingsBySection: Record<string, InspectionFinding[]>,
  capturesBySection: Record<string, InspectionCapture[]>
): void {
  const nonUnit = sections.filter((s) => !s.section.is_unit_mode);
  if (nonUnit.length === 0) return;

  ensureSpace(doc, cursor, 20);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Section Overview", MARGIN, cursor.y);
  advanceY(cursor, 7);

  const condLabel = (c: number | null) => {
    if (c == null) return "—";
    return `${c}/5 - ${INSPECTION_CONDITION_LABELS[c] ?? ""}`;
  };

  const body = nonUnit.map((ps) => {
    const findCount = (findingsBySection[ps.id] ?? []).length;
    // Count all captures for this section (including finding captures)
    const allSectionCaptures = capturesBySection[ps.id] ?? [];
    return [
      ps.section.group_name,
      ps.section.name,
      condLabel(ps.condition_rating),
      ps.rul_bucket ?? "—",
      String(findCount),
      String(allSectionCaptures.length),
      ps.notes ?? "",
    ];
  });

  autoTable(doc, {
    startY: cursor.y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Group", "Section", "Condition", "RUL", "Findings", "Photos", "Notes"]],
    body,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: BRAND_RGB as any, textColor: 255, fontSize: 7 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { cellWidth: 25 },
      6: { cellWidth: 35 },
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY ?? cursor.y + 20;
  setCursorY(cursor, finalY + SPACING);
}
