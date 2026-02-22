/**
 * PDF Export — Full Report Generator
 * Complete inspection report with cover, metrics, warnings, tables, and photos.
 */

import type { ProjectExportData } from "./fetch-project-data";
import {
  createPdfDoc,
  createCursor,
  addCoverPage,
  addMetricsSummary,
  addWarningsList,
  addGroupHeader,
  addSectionHeader,
  addUnitTable,
  addItemDetails,
  addPhotoGrid,
  addTruncationWarning,
  fetchAndResizeImage,
  ensureSpace,
  advanceY,
  MARGIN,
  type PhotoForGrid,
} from "./pdf-builder";

const MAX_PHOTOS = 800;

export async function generateFullReport(
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

  // 4. Sections by group
  let totalPhotosEmbedded = 0;
  let truncated = false;

  for (const group of data.sectionsByGroup) {
    addGroupHeader(doc, cursor, group.groupName);

    for (const ps of group.sections) {
      const section = ps.section;
      addSectionHeader(doc, cursor, section.name, group.groupName);

      if (section.is_unit_mode) {
        // Unit-mode section: table + per-unit photos
        const units = data.unitsBySection[ps.id] ?? [];
        if (units.length > 0) {
          addUnitTable(doc, cursor, units);

          // Photos per unit
          for (const unit of units) {
            if (truncated) break;

            const captures = data.capturesByUnit[unit.id] ?? [];
            if (captures.length === 0) continue;

            ensureSpace(doc, cursor, 14);
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.text(
              `B${unit.building} - Unit ${unit.unit_number}`,
              MARGIN + 4,
              cursor.y
            );
            advanceY(cursor, 5);

            // Build photo grid
            const photos: PhotoForGrid[] = [];
            for (const cap of captures) {
              if (totalPhotosEmbedded + photos.length >= MAX_PHOTOS) {
                truncated = true;
                break;
              }
              const b64 = await fetchAndResizeImage(
                cap.image_path
              );
              const gradeStr = unit.unit_grade
                ? ` (Grade: ${unit.unit_grade})`
                : "";
              photos.push({
                base64: b64,
                caption: `B${unit.building}-${unit.unit_number}${gradeStr}${cap.caption ? " — " + cap.caption : ""}`,
              });
            }

            totalPhotosEmbedded += addPhotoGrid(doc, cursor, photos);
          }
        }

        // Section-level captures (not tied to a specific unit)
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
              cap.image_path
            );
            photos.push({
              base64: b64,
              caption: `${section.name}${cap.caption ? " — " + cap.caption : ""}`,
            });
          }
          totalPhotosEmbedded += addPhotoGrid(doc, cursor, photos);
        }
      } else {
        // Non-unit section: items with ratings/notes + photos
        const items = data.itemsBySection[ps.id] ?? [];

        for (const item of items) {
          if (truncated) break;

          addItemDetails(doc, cursor, item);

          const captures = data.capturesByItem[item.id] ?? [];
          if (captures.length > 0) {
            const photos: PhotoForGrid[] = [];
            for (const cap of captures) {
              if (totalPhotosEmbedded + photos.length >= MAX_PHOTOS) {
                truncated = true;
                break;
              }
              const b64 = await fetchAndResizeImage(
                cap.image_path
              );
              const ratingStr = item.condition_rating
                ? ` (${item.condition_rating}/5)`
                : "";
              photos.push({
                base64: b64,
                caption: `${item.name}${ratingStr}${cap.caption ? " — " + cap.caption : ""}`,
              });
            }
            totalPhotosEmbedded += addPhotoGrid(doc, cursor, photos);
          }
        }

        // Section-level captures
        const sectionCaptures = data.capturesBySection[ps.id] ?? [];
        if (sectionCaptures.length > 0 && !truncated) {
          const photos: PhotoForGrid[] = [];
          for (const cap of sectionCaptures) {
            if (totalPhotosEmbedded + photos.length >= MAX_PHOTOS) {
              truncated = true;
              break;
            }
            const b64 = await fetchAndResizeImage(
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
  }

  // 5. Truncation warning if needed
  if (truncated) {
    addTruncationWarning(doc, cursor, data.captures.length, MAX_PHOTOS);
  }

  return Buffer.from(doc.output("arraybuffer"));
}
