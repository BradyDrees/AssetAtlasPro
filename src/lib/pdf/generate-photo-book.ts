/**
 * PDF Export — Photo Book Generator
 * All photos organized by section, 4 per page in 2×2 grid with captions.
 */

import type { ProjectExportData } from "./fetch-project-data";
import {
  createPdfDoc,
  createCursor,
  addCoverPage,
  addGroupHeader,
  addSectionHeader,
  addPhotoGrid,
  fetchAndResizeImage,
  ensureSpace,
  advanceY,
  MARGIN,
  type PhotoForGrid,
} from "./pdf-builder";

export async function generatePhotoBook(
  data: ProjectExportData
): Promise<Buffer> {
  const doc = createPdfDoc();
  const cursor = createCursor();

  // 1. Cover page
  addCoverPage(doc, cursor, data.project);

  // 2. Photos by group/section
  for (const group of data.sectionsByGroup) {
    // Check if this group has any photos
    const groupHasPhotos = group.sections.some((ps) => {
      const sectionCaptures = data.capturesBySection[ps.id] ?? [];
      if (sectionCaptures.length > 0) return true;

      if (ps.section.is_unit_mode) {
        const units = data.unitsBySection[ps.id] ?? [];
        return units.some((u) => (data.capturesByUnit[u.id] ?? []).length > 0);
      } else {
        const items = data.itemsBySection[ps.id] ?? [];
        return items.some(
          (i) => (data.capturesByItem[i.id] ?? []).length > 0
        );
      }
    });

    if (!groupHasPhotos) continue;

    addGroupHeader(doc, cursor, group.groupName);

    for (const ps of group.sections) {
      const section = ps.section;

      // Collect all photos for this section
      const allPhotos: PhotoForGrid[] = [];

      if (section.is_unit_mode) {
        // Unit photos
        const units = data.unitsBySection[ps.id] ?? [];
        for (const unit of units) {
          const captures = data.capturesByUnit[unit.id] ?? [];
          for (const cap of captures) {
            const b64 = await fetchAndResizeImage(
              cap.image_path
            );
            const gradeStr = unit.unit_grade
              ? ` (Grade: ${unit.unit_grade})`
              : "";
            allPhotos.push({
              base64: b64,
              caption: `B${unit.building}-${unit.unit_number}${gradeStr}${cap.caption ? " — " + cap.caption : ""}`,
            });
          }
        }
      } else {
        // Item photos
        const items = data.itemsBySection[ps.id] ?? [];
        for (const item of items) {
          const captures = data.capturesByItem[item.id] ?? [];
          for (const cap of captures) {
            const b64 = await fetchAndResizeImage(
              cap.image_path
            );
            const ratingStr = item.condition_rating
              ? ` (${item.condition_rating}/5)`
              : "";
            allPhotos.push({
              base64: b64,
              caption: `${item.name}${ratingStr}${cap.caption ? " — " + cap.caption : ""}`,
            });
          }
        }
      }

      // Section-level captures
      const sectionCaptures = data.capturesBySection[ps.id] ?? [];
      for (const cap of sectionCaptures) {
        const b64 = await fetchAndResizeImage(cap.image_path);
        allPhotos.push({
          base64: b64,
          caption: `${section.name}${cap.caption ? " — " + cap.caption : ""}`,
        });
      }

      // Only render section header if it has photos
      if (allPhotos.length > 0) {
        addSectionHeader(doc, cursor, section.name, group.groupName);
        addPhotoGrid(doc, cursor, allPhotos);
      }
    }
  }

  return Buffer.from(doc.output("arraybuffer"));
}
