/**
 * Unit Turn Export — Data Fetcher
 * Server-only utility that fetches everything needed for any unit turn export format.
 * Supports both single-unit (PDF, ZIP) and batch-level (Excel, batch ZIP) exports.
 */

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  UnitTurnBatch,
  UnitTurnBatchUnit,
  UnitTurnCategory,
  UnitTurnUnitItemWithTemplate,
  UnitTurnNoteWithPhotos,
  UnitTurnNotePhoto,
} from "@/lib/unit-turn-types";

// ---- Exported types ----

export interface UnitTurnExportData {
  batch: UnitTurnBatch;
  supabase: SupabaseClient;
  units: UnitTurnBatchUnit[];
  categories: UnitTurnCategory[];
  // Per-unit lookups
  itemsByUnit: Record<string, UnitTurnUnitItemWithTemplate[]>;
  notesByUnit: Record<string, UnitTurnNoteWithPhotos[]>;
  photosByUnit: Record<string, UnitTurnNotePhoto[]>; // flattened from notes
  // Category lookup
  categoryMap: Record<string, UnitTurnCategory>;
  // Progress per unit
  progressByUnit: Record<string, { total: number; assessed: number }>;
}

// ---- Main fetcher ----

export async function fetchUnitTurnData(
  batchId: string,
  unitId?: string
): Promise<UnitTurnExportData | null> {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. Batch
  const { data: batch } = await supabase
    .from("unit_turn_batches")
    .select("*")
    .eq("id", batchId)
    .single();
  if (!batch) return null;

  // 2. Units — single or all
  let unitsQuery = supabase
    .from("unit_turn_batch_units")
    .select("*")
    .eq("batch_id", batchId)
    .order("sort_order")
    .order("property")
    .order("unit_label");

  if (unitId) {
    unitsQuery = unitsQuery.eq("id", unitId);
  }

  const { data: unitsData } = await unitsQuery;
  const units = (unitsData ?? []) as UnitTurnBatchUnit[];
  if (units.length === 0) return null;

  const unitIds = units.map((u) => u.id);

  // 3. Categories
  const { data: categoriesData } = await supabase
    .from("unit_turn_categories")
    .select("*")
    .order("sort_order");

  const categories = (categoriesData ?? []) as UnitTurnCategory[];

  // 4. Items with template join
  const { data: itemsData } = await supabase
    .from("unit_turn_unit_items")
    .select(`
      *,
      template_item:unit_turn_template_items(*)
    `)
    .in("unit_id", unitIds)
    .order("sort_order")
    .order("id");

  const allItems = (itemsData ?? []) as UnitTurnUnitItemWithTemplate[];

  // 5. Notes with photos
  const { data: notesData } = await supabase
    .from("unit_turn_notes")
    .select(`
      *,
      photos:unit_turn_note_photos(*)
    `)
    .in("unit_id", unitIds)
    .order("created_at");

  const allNotes = (notesData ?? []) as UnitTurnNoteWithPhotos[];

  // ---- Build lookup maps ----

  const categoryMap: Record<string, UnitTurnCategory> = {};
  for (const cat of categories) {
    categoryMap[cat.id] = cat;
  }

  const itemsByUnit: Record<string, UnitTurnUnitItemWithTemplate[]> = {};
  const progressByUnit: Record<string, { total: number; assessed: number }> = {};

  for (const item of allItems) {
    if (!itemsByUnit[item.unit_id]) itemsByUnit[item.unit_id] = [];
    itemsByUnit[item.unit_id].push(item);

    if (!progressByUnit[item.unit_id]) {
      progressByUnit[item.unit_id] = { total: 0, assessed: 0 };
    }
    progressByUnit[item.unit_id].total++;

    const cat = categoryMap[item.category_id];
    const isPaint = cat?.category_type === "paint";
    if (item.status != null || item.is_na || (isPaint && item.paint_scope != null)) {
      progressByUnit[item.unit_id].assessed++;
    }
  }

  const notesByUnit: Record<string, UnitTurnNoteWithPhotos[]> = {};
  const photosByUnit: Record<string, UnitTurnNotePhoto[]> = {};

  for (const note of allNotes) {
    if (!notesByUnit[note.unit_id]) notesByUnit[note.unit_id] = [];
    notesByUnit[note.unit_id].push(note);

    if (note.photos && note.photos.length > 0) {
      if (!photosByUnit[note.unit_id]) photosByUnit[note.unit_id] = [];
      photosByUnit[note.unit_id].push(...note.photos);
    }
  }

  return {
    batch: batch as UnitTurnBatch,
    supabase,
    units,
    categories,
    itemsByUnit,
    notesByUnit,
    photosByUnit,
    categoryMap,
    progressByUnit,
  };
}
