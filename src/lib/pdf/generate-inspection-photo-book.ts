/**
 * Inspection Export — Photo Book Generator
 * All photos organized by group → section, 2-column grid with captions.
 */

import type { InspectionExportData } from "./fetch-inspection-data";
import {
  createPdfDoc,
  createCursor,
  addInspectionCoverPage,
  addGroupHeader,
  addSectionHeader,
  addPhotoGrid,
  fetchAndResizeImage,
  ensureSpace,
  advanceY,
  MARGIN,
  type PhotoForGrid,
} from "./pdf-builder";

export async function generateInspectionPhotoBook(
  data: InspectionExportData
): Promise<Buffer> {
  const doc = createPdfDoc();
  const cursor = createCursor();

  // 1. Cover page
  addInspectionCoverPage(doc, cursor, data.project);

  // 2. Photos by group/section
  for (const group of data.sectionsByGroup) {
    // Check if this group has any photos
    const groupHasPhotos = group.sections.some((ps) => {
      // Finding photos
      const sectionFindings = data.findingsBySection[ps.id] ?? [];
      for (const f of sectionFindings) {
        if ((data.capturesByFinding[f.id] ?? []).length > 0) return true;
      }
      // Unit photos
      if (ps.section.is_unit_mode) {
        const units = data.unitsBySection[ps.id] ?? [];
        for (const u of units) {
          if ((data.capturesByUnit[u.id] ?? []).length > 0) return true;
        }
      }
      // Section-level photos
      if ((data.capturesBySection[ps.id] ?? []).length > 0) return true;
      return false;
    });

    if (!groupHasPhotos) continue;

    addGroupHeader(doc, cursor, group.groupName);

    for (const ps of group.sections) {
      const section = ps.section;
      const allPhotos: PhotoForGrid[] = [];

      // Finding photos
      const sectionFindings = data.findingsBySection[ps.id] ?? [];
      for (const f of sectionFindings) {
        const caps = data.capturesByFinding[f.id] ?? [];
        for (const cap of caps) {
          const b64 = await fetchAndResizeImage(
            cap.image_path
          );
          const pLabel = f.priority ? `P${f.priority}` : "Good";
          allPhotos.push({
            base64: b64,
            caption: `${f.title} (${pLabel})${cap.caption ? " — " + cap.caption : ""}`,
          });
        }
      }

      // Unit photos
      if (section.is_unit_mode) {
        const units = data.unitsBySection[ps.id] ?? [];
        for (const unit of units) {
          const caps = data.capturesByUnit[unit.id] ?? [];
          for (const cap of caps) {
            const b64 = await fetchAndResizeImage(
              cap.image_path
            );
            allPhotos.push({
              base64: b64,
              caption: `B${unit.building}-${unit.unit_number}${cap.caption ? " — " + cap.caption : ""}`,
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

      // Render section header + photo grid if any photos
      if (allPhotos.length > 0) {
        addSectionHeader(doc, cursor, section.name, group.groupName);
        addPhotoGrid(doc, cursor, allPhotos);
      }
    }
  }

  return Buffer.from(doc.output("arraybuffer"));
}
