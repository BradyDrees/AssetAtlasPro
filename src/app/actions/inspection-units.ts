"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CreateInspectionUnit } from "@/lib/inspection-types";

// Whitelist of fields that can be updated via updateInspectionUnitField
const ALLOWED_FIELDS = new Set([
  "occupancy_status",
  "walk_status",
  "walk_required",
  "turn_stage",
  "overall_condition",
  "tenant_housekeeping",
  "floors",
  "cabinets",
  "countertops",
  "appliances",
  "plumbing_fixtures",
  "electrical_fixtures",
  "windows_doors",
  "bath_condition",
  "has_leak_evidence",
  "has_mold_indicators",
  "blinds_down",
  "toilet_seat_down",
  "rent_ready",
  "days_vacant",
  "description",
  "notes",
]);

/**
 * Provision a unit turn checklist for an inspection unit.
 * Creates a hidden batch + unit + all template items via Postgres function.
 * Returns the turn_unit_id (unit_turn_batch_units.id).
 */
export async function provisionTurnChecklist(
  inspectionUnitId: string,
  projectId: string,
  building: string,
  unitNumber: string
): Promise<{ turnUnitId?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { data, error } = await supabase.rpc("provision_inspection_turn_checklist", {
      p_inspection_unit_id: inspectionUnitId,
      p_project_id: projectId,
      p_owner_id: user.id,
      p_building: building,
      p_unit_number: unitNumber,
    });

    if (error) return { error: error.message };
    return { turnUnitId: data };
  } catch (err) {
    return { error: "Unexpected: " + (err instanceof Error ? err.message : String(err)) };
  }
}

export async function createInspectionUnit(data: CreateInspectionUnit) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: unit, error } = await supabase
    .from("inspection_units")
    .insert({
      project_id: data.project_id,
      project_section_id: data.project_section_id,
      building: data.building.trim(),
      unit_number: data.unit_number.trim(),
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/inspections/${data.project_id}`);
  revalidatePath(
    `/inspections/${data.project_id}/sections/${data.project_section_id}`
  );

  return unit.id;
}

export async function updateInspectionUnitField(
  unitId: string,
  projectId: string,
  projectSectionId: string,
  field: string,
  value: string | string[] | number | boolean | null
) {
  if (!ALLOWED_FIELDS.has(field)) {
    throw new Error(`Field "${field}" is not allowed`);
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("inspection_units")
    .update({ [field]: value })
    .eq("id", unitId);

  if (error) throw new Error(error.message);

  revalidatePath(
    `/inspections/${projectId}/sections/${projectSectionId}/units/${unitId}`
  );
  revalidatePath(
    `/inspections/${projectId}/sections/${projectSectionId}`
  );
}

export interface BulkUnitRow {
  building: string;
  unit_number: string;
  days_vacant?: number | null;
  rent_ready?: boolean | null;
  description?: string;
}

export async function bulkCreateInspectionUnits(
  projectId: string,
  projectSectionId: string,
  rows: BulkUnitRow[]
): Promise<{ created: number; skipped: number; errors: string[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Fetch existing units for dedup
  const { data: existing } = await supabase
    .from("inspection_units")
    .select("building, unit_number")
    .eq("project_section_id", projectSectionId);

  const existingSet = new Set(
    (existing ?? []).map(
      (u: { building: string; unit_number: string }) =>
        `${u.building.trim().toLowerCase()}|${u.unit_number.trim().toLowerCase()}`
    )
  );

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];
  const validRows: Record<string, any>[] = [];

  for (const row of rows) {
    const bldg = (row.building ?? "").toString().trim();
    const unit = (row.unit_number ?? "").toString().trim();

    if (!bldg || !unit) {
      errors.push(`Skipped row: missing building or unit number`);
      skipped++;
      continue;
    }

    const key = `${bldg.toLowerCase()}|${unit.toLowerCase()}`;
    if (existingSet.has(key)) {
      skipped++;
      continue;
    }

    const insertData: Record<string, any> = {
      project_id: projectId,
      project_section_id: projectSectionId,
      building: bldg,
      unit_number: unit,
    };

    if (row.days_vacant != null) {
      insertData.days_vacant = row.days_vacant;
      insertData.occupancy_status = "VACANT";
    }
    if (row.rent_ready != null) {
      insertData.rent_ready = row.rent_ready;
    }
    if (row.description) {
      insertData.description = row.description.trim();
    }

    validRows.push(insertData);
    existingSet.add(key);
  }

  // Batch insert all valid rows at once (instead of N sequential queries)
  if (validRows.length > 0) {
    const { error } = await supabase
      .from("inspection_units")
      .insert(validRows);

    if (error) {
      errors.push(`Batch insert failed: ${error.message}`);
    } else {
      created = validRows.length;
    }
  }

  revalidatePath(`/inspections/${projectId}`);
  revalidatePath(
    `/inspections/${projectId}/sections/${projectSectionId}`
  );

  return { created, skipped, errors };
}

export async function deleteInspectionUnit(
  unitId: string,
  projectId: string,
  projectSectionId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // First, delete storage files for all captures belonging to this unit
  const { data: captures } = await supabase
    .from("inspection_captures")
    .select("image_path")
    .eq("unit_id", unitId);

  if (captures && captures.length > 0) {
    const paths = captures.map((c: { image_path: string }) => c.image_path);
    await supabase.storage.from("dd-captures").remove(paths);
  }

  // Delete the unit (CASCADE will remove captures rows)
  const { error } = await supabase
    .from("inspection_units")
    .delete()
    .eq("id", unitId);

  if (error) throw new Error(error.message);

  revalidatePath(`/inspections/${projectId}`);
  revalidatePath(
    `/inspections/${projectId}/sections/${projectSectionId}`
  );
}
