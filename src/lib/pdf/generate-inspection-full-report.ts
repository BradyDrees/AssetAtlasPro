/**
 * Inspection Export — Full Report Generator
 * Complete report with cover, executive summary, findings detail, photos, and unit grading.
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
  addGroupHeader,
  addSectionHeader,
  addFindingDetail,
  addInspectionUnitTable,
  addPhotoGrid,
  addTruncationWarning,
  fetchAndResizeImage,
  ensureSpace,
  advanceY,
  MARGIN,
  type PhotoForGrid,
} from "./pdf-builder";
import {
  INSPECTION_CONDITION_LABELS,
} from "@/lib/inspection-constants";

const MAX_PHOTOS = 800;

export async function generateInspectionFullReport(
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

  // 4. Sections by group
  let totalPhotosEmbedded = 0;
  let truncated = false;

  for (const group of data.sectionsByGroup) {
    addGroupHeader(doc, cursor, group.groupName);

    for (const ps of group.sections) {
      const section = ps.section;
      addSectionHeader(doc, cursor, section.name, group.groupName);

      // Section condition + RUL info
      if (ps.condition_rating != null || ps.rul_bucket) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        const parts: string[] = [];
        if (ps.condition_rating != null) {
          const label = INSPECTION_CONDITION_LABELS[ps.condition_rating] ?? "";
          parts.push(`Condition: ${ps.condition_rating}/5 — ${label}`);
        }
        if (ps.rul_bucket) {
          parts.push(`RUL: ${ps.rul_bucket}`);
        }
        doc.text(parts.join("  |  "), MARGIN + 4, cursor.y);
        advanceY(cursor, 5);
      }

      // Section notes
      if (ps.notes && ps.notes.trim()) {
        ensureSpace(doc, cursor, 10);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        const noteLines = doc.splitTextToSize(
          `Notes: ${ps.notes}`,
          170 - 10
        );
        for (const line of noteLines) {
          ensureSpace(doc, cursor, 5);
          doc.text(line, MARGIN + 4, cursor.y);
          advanceY(cursor, 4);
        }
        advanceY(cursor, 2);
      }

      // Findings for this section
      const sectionFindings = data.findingsBySection[ps.id] ?? [];
      for (const finding of sectionFindings) {
        if (truncated) break;

        addFindingDetail(doc, cursor, finding, data.checklistItemMap);

        // Finding photos
        const findingCaptures = data.capturesByFinding[finding.id] ?? [];
        if (findingCaptures.length > 0) {
          const photos: PhotoForGrid[] = [];
          for (const cap of findingCaptures) {
            if (totalPhotosEmbedded + photos.length >= MAX_PHOTOS) {
              truncated = true;
              break;
            }
            const b64 = await fetchAndResizeImage(
              data.supabase,
              cap.image_path
            );
            const pLabel = finding.priority
              ? `P${finding.priority}`
              : "Good";
            photos.push({
              base64: b64,
              caption: `${finding.title} (${pLabel})${cap.caption ? " — " + cap.caption : ""}`,
            });
          }
          totalPhotosEmbedded += addPhotoGrid(doc, cursor, photos);
        }
      }

      // Unit-mode section: unit table + per-unit photos
      if (section.is_unit_mode) {
        const sectionUnits = data.unitsBySection[ps.id] ?? [];
        if (sectionUnits.length > 0) {
          addInspectionUnitTable(doc, cursor, sectionUnits);

          // Per-unit photos
          for (const unit of sectionUnits) {
            if (truncated) break;

            const unitCaptures = data.capturesByUnit[unit.id] ?? [];
            if (unitCaptures.length === 0) continue;

            ensureSpace(doc, cursor, 14);
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.text(
              `B${unit.building} - Unit ${unit.unit_number}`,
              MARGIN + 4,
              cursor.y
            );
            advanceY(cursor, 5);

            const photos: PhotoForGrid[] = [];
            for (const cap of unitCaptures) {
              if (totalPhotosEmbedded + photos.length >= MAX_PHOTOS) {
                truncated = true;
                break;
              }
              const b64 = await fetchAndResizeImage(
                data.supabase,
                cap.image_path
              );
              photos.push({
                base64: b64,
                caption: `B${unit.building}-${unit.unit_number}${cap.caption ? " — " + cap.caption : ""}`,
              });
            }
            totalPhotosEmbedded += addPhotoGrid(doc, cursor, photos);
          }
        }
      }

      // Section-level captures (not tied to a finding or unit)
      const sectionCaptures = data.capturesBySection[ps.id] ?? [];
      if (sectionCaptures.length > 0 && !truncated) {
        ensureSpace(doc, cursor, 10);
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.text("Section-level captures:", MARGIN + 4, cursor.y);
        advanceY(cursor, 5);

        const photos: PhotoForGrid[] = [];
        for (const cap of sectionCaptures) {
          if (totalPhotosEmbedded + photos.length >= MAX_PHOTOS) {
            truncated = true;
            break;
          }
          const b64 = await fetchAndResizeImage(
            data.supabase,
            cap.image_path
          );
          photos.push({
            base64: b64,
            caption: `${section.name}${cap.caption ? " — " + cap.caption : ""}`,
          });
        }
        totalPhotosEmbedded += addPhotoGrid(doc, cursor, photos);
      }
    }
  }

  // 5. Truncation warning
  if (truncated) {
    addTruncationWarning(doc, cursor, data.captures.length, MAX_PHOTOS);
  }

  return Buffer.from(doc.output("arraybuffer"));
}
