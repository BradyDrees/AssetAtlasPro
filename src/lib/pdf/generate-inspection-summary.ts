/**
 * Inspection Export — Summary Generator
 * Executive summary with metrics, findings matrix, unit table, section overview — no photos.
 */

import type { InspectionExportData } from "./fetch-inspection-data";
import {
  createPdfDoc,
  createCursor,
  addInspectionCoverPage,
  addFindingPrioritySummary,
  addExposureSummary,
  addRiskFlagsSummary,
  addWarningsList,
  addFindingsTable,
  addInspectionUnitTable,
  addSectionConditionTable,
} from "./pdf-builder";

export async function generateInspectionSummary(
  data: InspectionExportData
): Promise<Buffer> {
  const doc = createPdfDoc();
  const cursor = createCursor();

  // 1. Cover page
  addInspectionCoverPage(doc, cursor, data.project);

  // 2. Executive summary
  addFindingPrioritySummary(doc, cursor, data.metrics);
  addExposureSummary(doc, cursor, data.metrics);
  addRiskFlagsSummary(doc, cursor, data.metrics.riskFlagCounts);

  // 3. Warnings
  addWarningsList(doc, cursor, data.warnings);

  // 4. Findings matrix table (all findings, no photos)
  const sectionMap: Record<string, string> = {};
  for (const ps of data.enabledSections) {
    sectionMap[ps.id] = ps.section.name;
  }
  addFindingsTable(doc, cursor, data.findings, sectionMap, data.checklistItemMap);

  // 5. Unit grading table
  if (data.units.length > 0) {
    addInspectionUnitTable(doc, cursor, data.units);
  }

  // 6. Section condition/RUL overview
  // Build a capture count map that includes ALL captures per section (finding + unit + section-level)
  const captureCountBySection: Record<string, import("@/lib/inspection-types").InspectionCapture[]> = {};
  for (const c of data.captures) {
    if (!captureCountBySection[c.project_section_id])
      captureCountBySection[c.project_section_id] = [];
    captureCountBySection[c.project_section_id].push(c);
  }
  addSectionConditionTable(
    doc,
    cursor,
    data.enabledSections,
    data.findingsBySection,
    captureCountBySection
  );

  return Buffer.from(doc.output("arraybuffer"));
}
