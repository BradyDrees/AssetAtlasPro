/**
 * Unit Turn Export — ZIP Photo Archive Generator
 * Downloads all photos and packages them into a ZIP with meaningful filenames.
 * Organized by Property-Unit/Category/ItemName.
 */

import JSZip from "jszip";
import type { UnitTurnExportData } from "./fetch-unit-turn-data";
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

export async function generateUnitTurnPhotoZip(
  data: UnitTurnExportData
): Promise<Uint8Array> {
  const zip = new JSZip();
  const batchName = sanitize(data.batch.name);
  const rootFolder = `${batchName}-UnitTurn-Photos`;

  const entries: ZipEntry[] = [];

  for (const unit of data.units) {
    const unitFolder = `${sanitize(unit.property)}-${sanitize(unit.unit_label)}`;
    const unitNotes = data.notesByUnit[unit.id] ?? [];
    const unitItems = data.itemsByUnit[unit.id] ?? [];

    // Build item lookup for this unit
    const itemMap = new Map<string, string>();
    for (const item of unitItems) {
      itemMap.set(item.id, item.template_item?.name ?? "unknown-item");
    }

    // Process each note's photos
    for (const note of unitNotes) {
      if (!note.photos || note.photos.length === 0) continue;

      const cat = data.categoryMap[note.category_id];
      const categoryName = sanitize(cat?.name ?? "uncategorized");

      // Determine if this is an item-level or category-level note
      const itemName = note.item_id ? sanitize(itemMap.get(note.item_id) ?? "item") : null;

      note.photos.forEach((photo, idx) => {
        const id6 = photo.id.slice(0, 6);
        const nn = String(idx + 1).padStart(2, "0");
        const ext = getExt(photo.image_path);

        const filename = itemName
          ? `${itemName}-photo${nn}-${id6}.${ext}`
          : `${categoryName}-photo${nn}-${id6}.${ext}`;

        entries.push({
          folder: `${rootFolder}/${unitFolder}/${categoryName}`,
          filename,
          imagePath: photo.image_path,
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
    const buf = await downloadImageBuffer(data.supabase, entry.imagePath);
    if (buf) {
      zip.file(`${entry.folder}/${entry.filename}`, buf);
    }
  };

  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(downloadAndAdd));
  }

  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
