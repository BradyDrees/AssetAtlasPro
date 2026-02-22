/**
 * Unit Turn Export — Single Unit PDF Report
 * Generates a printable per-unit report with category sections, status tables,
 * notes, and embedded photos. Excludes N/A items.
 */

import autoTable from "jspdf-autotable";
import {
  createPdfDoc,
  createCursor,
  ensureSpace,
  advanceY,
  setCursorY,
  addPhotoGrid,
  fetchAndResizeImage,
  formatDate,
  MARGIN,
} from "./pdf-builder";
import type { PhotoForGrid } from "./pdf-builder";
import type { UnitTurnExportData } from "./fetch-unit-turn-data";
import {
  ITEM_STATUS_LABELS,
  PAINT_SCOPE_LABELS,
} from "@/lib/unit-turn-constants";
import { toTitleCase } from "@/lib/utils";

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BRAND_RGB: [number, number, number] = [45, 95, 63]; // forest green

// Status → RGB color for table cells
const STATUS_COLORS: Record<string, [number, number, number]> = {
  good: [220, 252, 231],     // green-100
  repair: [254, 249, 195],   // yellow-100
  replace: [254, 226, 226],  // red-100
  touch_up: [255, 237, 213], // orange-100
  full: [254, 226, 226],     // red-100
};

export async function generateUnitTurnReport(
  data: UnitTurnExportData
): Promise<Buffer> {
  const doc = createPdfDoc();
  const cursor = createCursor();
  const unit = data.units[0]; // single unit
  if (!unit) throw new Error("No unit data");

  const unitItems = data.itemsByUnit[unit.id] ?? [];
  const unitNotes = data.notesByUnit[unit.id] ?? [];
  const progress = data.progressByUnit[unit.id] ?? { total: 0, assessed: 0 };

  // ===== COVER / HEADER =====
  setCursorY(cursor, 50);

  // Batch name
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(data.batch.name, PAGE_WIDTH / 2, cursor.y, { align: "center" });
  advanceY(cursor, 8);

  if (data.batch.month) {
    doc.setFontSize(10);
    const monthLabel = new Date(data.batch.month + "T00:00:00").toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    doc.text(monthLabel, PAGE_WIDTH / 2, cursor.y, { align: "center" });
    advanceY(cursor, 10);
  }

  // Property + Unit
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND_RGB);
  doc.text(`${unit.property} — Unit ${unit.unit_label}`, PAGE_WIDTH / 2, cursor.y, {
    align: "center",
  });
  doc.setTextColor(0);
  advanceY(cursor, 12);

  // Status + Progress
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  const pct = progress.total > 0 ? Math.round((progress.assessed / progress.total) * 100) : 0;
  doc.text(
    `Status: ${unit.status.replace(/_/g, " ")} | ${progress.assessed}/${progress.total} Items Assessed (${pct}%)`,
    PAGE_WIDTH / 2,
    cursor.y,
    { align: "center" }
  );
  advanceY(cursor, 6);

  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated: ${formatDate(new Date().toISOString())}`, PAGE_WIDTH / 2, cursor.y, {
    align: "center",
  });
  doc.setTextColor(0);
  advanceY(cursor, 16);

  // ===== SUMMARY COUNTS =====
  let goodCount = 0;
  let repairCount = 0;
  let replaceCount = 0;
  let touchUpCount = 0;
  let fullPaintCount = 0;
  let naCount = 0;
  let cleaningDone = 0;

  for (const item of unitItems) {
    const cat = data.categoryMap[item.category_id];
    if (item.is_na) { naCount++; continue; }
    if (cat?.category_type === "paint") {
      if (item.paint_scope === "touch_up") touchUpCount++;
      else if (item.paint_scope === "full") fullPaintCount++;
    } else if (cat?.category_type === "cleaning") {
      if (item.status === "good") cleaningDone++;
    } else {
      if (item.status === "good") goodCount++;
      else if (item.status === "repair") repairCount++;
      else if (item.status === "replace") replaceCount++;
    }
  }

  // Summary bar
  ensureSpace(doc, cursor, 20);
  doc.setFillColor(245, 245, 245);
  doc.rect(MARGIN, cursor.y - 4, CONTENT_WIDTH, 14, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40);
  const summaryParts = [
    `Good: ${goodCount}`,
    `Repair: ${repairCount}`,
    `Replace: ${replaceCount}`,
    `Touch Up: ${touchUpCount}`,
    `Full Paint: ${fullPaintCount}`,
    `N/A: ${naCount}`,
    `Cleaning Done: ${cleaningDone}`,
  ];
  doc.text(summaryParts.join("  |  "), PAGE_WIDTH / 2, cursor.y + 3, {
    align: "center",
  });
  doc.setTextColor(0);
  advanceY(cursor, 16);

  // ===== CATEGORY SECTIONS =====
  for (const cat of data.categories) {
    const catItems = unitItems.filter(
      (i) => i.category_id === cat.id && !i.is_na
    );
    const catNotes = unitNotes.filter((n) => n.category_id === cat.id);

    // Skip empty categories (no assessed items and no notes)
    if (catItems.length === 0 && catNotes.length === 0) continue;

    // ---- Category Header ----
    ensureSpace(doc, cursor, 30);
    doc.setFillColor(...BRAND_RGB);
    doc.rect(MARGIN, cursor.y - 4, CONTENT_WIDTH, 10, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255);
    doc.text(toTitleCase(cat.name), MARGIN + 3, cursor.y + 2);
    doc.setTextColor(0);
    advanceY(cursor, 12);

    // ---- Items Table ----
    if (catItems.length > 0) {
      const isPaint = cat.category_type === "paint";
      const isCleaning = cat.category_type === "cleaning";

      const statusLabel = (item: typeof catItems[0]): string => {
        if (isPaint) {
          return item.paint_scope
            ? PAINT_SCOPE_LABELS[item.paint_scope]?.label ?? item.paint_scope
            : "—";
        }
        if (isCleaning && item.status === "good") return "Done";
        return item.status
          ? ITEM_STATUS_LABELS[item.status]?.label ?? item.status
          : "—";
      };

      const statusKey = (item: typeof catItems[0]): string | null => {
        if (isPaint) return item.paint_scope;
        return item.status;
      };

      const head = isPaint
        ? [["Item", "Scope"]]
        : isCleaning
          ? [["Item", "Status"]]
          : [["Item", "Status"]];

      const body = catItems
        .filter((item) => {
          // Only include items that have an actual assessment
          if (isPaint) return item.paint_scope != null;
          return item.status != null;
        })
        .map((item) => [
          toTitleCase(item.template_item?.name ?? "Unknown"),
          statusLabel(item),
        ]);

      if (body.length > 0) {
        autoTable(doc, {
          startY: cursor.y,
          margin: { left: MARGIN, right: MARGIN },
          head,
          body,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: {
            fillColor: BRAND_RGB as any,
            textColor: 255,
            fontSize: 8,
          },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          columnStyles: {
            0: { cellWidth: CONTENT_WIDTH * 0.7 },
            1: { cellWidth: CONTENT_WIDTH * 0.3, halign: "center" },
          },
          didParseCell: (cellData: any) => {
            if (cellData.section === "body" && cellData.column.index === 1) {
              const rowIdx = cellData.row.index;
              const assessedItems = catItems.filter((item) => {
                if (isPaint) return item.paint_scope != null;
                return item.status != null;
              });
              const item = assessedItems[rowIdx];
              if (item) {
                const key = statusKey(item);
                if (key && STATUS_COLORS[key]) {
                  cellData.cell.styles.fillColor = STATUS_COLORS[key];
                }
              }
            }
          },
        });

        const finalY = (doc as any).lastAutoTable?.finalY ?? cursor.y + 20;
        setCursorY(cursor, finalY + 4);
      }
    }

    // ---- Notes ----
    const textNotes = catNotes.filter((n) => n.text && n.text.trim());
    if (textNotes.length > 0) {
      ensureSpace(doc, cursor, 12);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60);
      doc.text("Notes:", MARGIN + 2, cursor.y);
      advanceY(cursor, 5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      for (const note of textNotes) {
        ensureSpace(doc, cursor, 8);
        // Find associated item name if item-level
        let prefix = "";
        if (note.item_id) {
          const matchItem = unitItems.find((i) => i.id === note.item_id);
          if (matchItem) {
            prefix = `[${toTitleCase(matchItem.template_item?.name ?? "Item")}] `;
          }
        }
        const noteLines = doc.splitTextToSize(
          `${prefix}${note.text}`,
          CONTENT_WIDTH - 8
        );
        for (const line of noteLines) {
          ensureSpace(doc, cursor, 5);
          doc.text(line, MARGIN + 4, cursor.y);
          advanceY(cursor, 4);
        }
        advanceY(cursor, 2);
      }
    }

    // ---- Photos (skip videos — can't embed in PDF) ----
    const catPhotos: PhotoForGrid[] = [];
    let videoCount = 0;
    for (const note of catNotes) {
      if (!note.photos || note.photos.length === 0) continue;
      for (const photo of note.photos) {
        if (photo.file_type === "video") { videoCount++; continue; }

        const matchItem = note.item_id
          ? unitItems.find((i) => i.id === note.item_id)
          : null;
        const caption = matchItem
          ? `${toTitleCase(cat.name)} — ${toTitleCase(matchItem.template_item?.name ?? "")}`
          : toTitleCase(cat.name);

        const base64 = await fetchAndResizeImage(photo.image_path);
        if (base64) {
          catPhotos.push({ base64, caption });
        }
      }
    }

    if (catPhotos.length > 0 || videoCount > 0) {
      ensureSpace(doc, cursor, 10);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60);
      const mediaLabel = videoCount > 0
        ? `Photos: (${videoCount} video${videoCount > 1 ? "s" : ""} not shown in PDF)`
        : "Photos:";
      doc.text(mediaLabel, MARGIN + 2, cursor.y);
      doc.setTextColor(0);
      advanceY(cursor, 5);

      if (catPhotos.length > 0) {
        addPhotoGrid(doc, cursor, catPhotos);
      }
    }

    advanceY(cursor, 6);
  }

  // ---- Write to buffer ----
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
