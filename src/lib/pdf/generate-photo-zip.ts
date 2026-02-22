/**
 * PDF Export — ZIP Photo Archive Generator
 * Downloads all image captures and packages them into a ZIP with meaningful filenames.
 * Bounded concurrency (pool of 5), filename sanitization, collision prevention via capture ID suffix.
 */

import JSZip from "jszip";
import type { ProjectExportData } from "./fetch-project-data";
import { downloadImageBuffer } from "./pdf-builder";

const CONCURRENCY = 5;
const MAX_PHOTOS = 500;
const MAX_SEGMENT_LENGTH = 60;

/** Sanitize a filename segment: keep alphanumeric + hyphens, truncate. */
function sanitize(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9\-_]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, MAX_SEGMENT_LENGTH);
}

/** Get file extension from path. */
function getExt(imagePath: string): string {
  const ext = imagePath.split(".").pop()?.toLowerCase() ?? "jpg";
  return ext === "jpeg" ? "jpg" : ext;
}

interface ZipEntry {
  folder: string;
  filename: string;
  imagePath: string;
}

export async function generatePhotoZip(
  data: ProjectExportData
): Promise<Uint8Array> {
  const zip = new JSZip();
  const projectCode = sanitize(data.project.name);
  const rootFolder = `${projectCode}-Photos`;

  // Build the list of entries to download
  const entries: ZipEntry[] = [];

  for (const group of data.sectionsByGroup) {
    const groupFolder = sanitize(group.groupName);

    for (const ps of group.sections) {
      const section = ps.section;
      const sectionName = sanitize(section.name);

      if (section.is_unit_mode) {
        // Unit photos → root/GroupName/SectionName-B{bldg}-{unit}-photo{NN}-{id6}.ext
        const units = data.unitsBySection[ps.id] ?? [];
        for (const unit of units) {
          const captures = data.capturesByUnit[unit.id] ?? [];
          captures.forEach((cap, idx) => {
            const id6 = cap.id.slice(0, 6);
            const nn = String(idx + 1).padStart(2, "0");
            const ext = getExt(cap.image_path);
            const bldg = sanitize(unit.building);
            const unitNum = sanitize(unit.unit_number);
            entries.push({
              folder: `${rootFolder}/${groupFolder}`,
              filename: `${sectionName}-B${bldg}-${unitNum}-photo${nn}-${id6}.${ext}`,
              imagePath: cap.image_path,
            });
          });
        }
      } else {
        // Item photos → root/GroupName/SectionName/SectionName-{ItemName}-photo{NN}-{id6}.ext
        const items = data.itemsBySection[ps.id] ?? [];
        for (const item of items) {
          const captures = data.capturesByItem[item.id] ?? [];
          const itemName = sanitize(item.name);
          captures.forEach((cap, idx) => {
            const id6 = cap.id.slice(0, 6);
            const nn = String(idx + 1).padStart(2, "0");
            const ext = getExt(cap.image_path);
            entries.push({
              folder: `${rootFolder}/${groupFolder}/${sectionName}`,
              filename: `${sectionName}-${itemName}-photo${nn}-${id6}.${ext}`,
              imagePath: cap.image_path,
            });
          });
        }
      }

      // Section-level captures
      const sectionCaptures = data.capturesBySection[ps.id] ?? [];
      sectionCaptures.forEach((cap, idx) => {
        const id6 = cap.id.slice(0, 6);
        const nn = String(idx + 1).padStart(2, "0");
        const ext = getExt(cap.image_path);
        entries.push({
          folder: `${rootFolder}/${groupFolder}/${sectionName}`,
          filename: `${sectionName}-photo${nn}-${id6}.${ext}`,
          imagePath: cap.image_path,
        });
      });
    }
  }

  // Enforce max-photo guardrail
  if (entries.length > MAX_PHOTOS) {
    throw new Error(
      `Too many photos (${entries.length}). Maximum is ${MAX_PHOTOS} per ZIP export.`
    );
  }

  // Download with bounded concurrency
  const downloadAndAdd = async (entry: ZipEntry) => {
    const buf = await downloadImageBuffer(entry.imagePath);
    if (buf) {
      zip.file(`${entry.folder}/${entry.filename}`, buf);
    }
  };

  // Process in batches of CONCURRENCY
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(downloadAndAdd));
  }

  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
