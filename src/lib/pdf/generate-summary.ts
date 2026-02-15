/**
 * PDF Export — Summary Generator
 * Executive summary with metrics, unit matrix, and section overview — no photos.
 */

import type { ProjectExportData } from "./fetch-project-data";
import {
  createPdfDoc,
  createCursor,
  addCoverPage,
  addMetricsSummary,
  addWarningsList,
  addUnitTable,
  addSectionOverviewTable,
  addGroupHeader,
  ensureSpace,
  advanceY,
  MARGIN,
} from "./pdf-builder";

export async function generateSummary(
  data: ProjectExportData
): Promise<Buffer> {
  const doc = createPdfDoc();
  const cursor = createCursor();

  // 1. Cover page
  addCoverPage(doc, cursor, data.project);

  // 2. Summary metrics
  addMetricsSummary(doc, cursor, data.metrics);

  // 3. Warnings
  addWarningsList(doc, cursor, data.warnings);

  // 4. Unit grading matrix — all units across all unit sections
  if (data.units.length > 0) {
    ensureSpace(doc, cursor, 20);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Unit Grading Matrix", MARGIN, cursor.y);
    advanceY(cursor, 7);

    addUnitTable(doc, cursor, data.units);
  }

  // 5. Section overview table — non-unit sections with item counts and avg ratings
  const sectionOverview: { name: string; itemCount: number; avgRating: string }[] = [];

  for (const group of data.sectionsByGroup) {
    for (const ps of group.sections) {
      if (ps.section.is_unit_mode) continue;
      const items = data.itemsBySection[ps.id] ?? [];
      const avg = data.avgRatingBySection[ps.id];
      sectionOverview.push({
        name: ps.section.name,
        itemCount: items.length,
        avgRating: avg?.label ?? "N/A",
      });
    }
  }

  if (sectionOverview.length > 0) {
    addSectionOverviewTable(doc, cursor, sectionOverview);
  }

  return Buffer.from(doc.output("arraybuffer"));
}
