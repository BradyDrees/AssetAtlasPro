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
  "notes",
]);

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

export async function deleteInspectionUnit(
  unitId: string,
  projectId: string,
  projectSectionId: string
) {
  const supabase = await createClient();

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
