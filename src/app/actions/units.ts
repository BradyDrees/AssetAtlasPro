"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CreateDDUnit } from "@/lib/types";

// Whitelist of fields that can be updated via updateUnitField
const ALLOWED_FIELDS = new Set([
  "bd_ba",
  "appliances",
  "tenant_grade",
  "unit_grade",
  "cabinets",
  "countertop",
  "flooring",
  "has_mold",
  "has_wd_connect",
  "notes",
]);

export async function createUnit(data: CreateDDUnit) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: unit, error } = await supabase
    .from("dd_units")
    .insert({
      project_id: data.project_id,
      project_section_id: data.project_section_id,
      building: data.building.trim(),
      unit_number: data.unit_number.trim(),
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${data.project_id}`);
  revalidatePath(
    `/projects/${data.project_id}/sections/${data.project_section_id}`
  );

  return unit.id;
}

export async function updateUnitField(
  unitId: string,
  projectId: string,
  projectSectionId: string,
  field: string,
  value: string | string[] | boolean | null
) {
  if (!ALLOWED_FIELDS.has(field)) {
    throw new Error(`Field "${field}" is not allowed`);
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("dd_units")
    .update({ [field]: value })
    .eq("id", unitId);

  if (error) throw new Error(error.message);

  revalidatePath(
    `/projects/${projectId}/sections/${projectSectionId}/units/${unitId}`
  );
  revalidatePath(
    `/projects/${projectId}/sections/${projectSectionId}`
  );
}

export async function deleteUnit(
  unitId: string,
  projectId: string,
  projectSectionId: string
) {
  const supabase = await createClient();

  // First, delete storage files for all captures belonging to this unit
  const { data: captures } = await supabase
    .from("dd_captures")
    .select("image_path")
    .eq("unit_id", unitId);

  if (captures && captures.length > 0) {
    const paths = captures.map((c: { image_path: string }) => c.image_path);
    await supabase.storage.from("dd-captures").remove(paths);
  }

  // Delete the unit (CASCADE will remove dd_captures rows)
  const { error } = await supabase
    .from("dd_units")
    .delete()
    .eq("id", unitId);

  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(
    `/projects/${projectId}/sections/${projectSectionId}`
  );
}
