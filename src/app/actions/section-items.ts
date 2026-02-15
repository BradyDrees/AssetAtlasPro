"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CreateDDSectionItem } from "@/lib/types";

// Whitelist of fields that can be updated via updateSectionItemField
const ALLOWED_FIELDS = new Set(["name", "condition_rating", "notes"]);

export async function createSectionItem(
  data: CreateDDSectionItem,
  projectId: string
): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Get next sort_order
  const { data: maxSort } = await supabase
    .from("dd_section_items")
    .select("sort_order")
    .eq("project_section_id", data.project_section_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();
  const nextSort = (maxSort?.sort_order ?? -1) + 1;

  const { data: item, error } = await supabase
    .from("dd_section_items")
    .insert({
      project_section_id: data.project_section_id,
      name: data.name.trim(),
      sort_order: nextSort,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(
    `/projects/${projectId}/sections/${data.project_section_id}`
  );

  return item.id;
}

export async function updateSectionItemField(
  itemId: string,
  projectId: string,
  projectSectionId: string,
  field: string,
  value: string | number | null
) {
  if (!ALLOWED_FIELDS.has(field)) {
    throw new Error(`Field "${field}" is not allowed`);
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("dd_section_items")
    .update({ [field]: value })
    .eq("id", itemId);

  if (error) throw new Error(error.message);

  revalidatePath(
    `/projects/${projectId}/sections/${projectSectionId}/items/${itemId}`
  );
  revalidatePath(
    `/projects/${projectId}/sections/${projectSectionId}`
  );
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteSectionItem(
  itemId: string,
  projectId: string,
  projectSectionId: string
) {
  const supabase = await createClient();

  // First, delete storage files for all captures belonging to this item
  const { data: captures } = await supabase
    .from("dd_captures")
    .select("image_path")
    .eq("section_item_id", itemId);

  if (captures && captures.length > 0) {
    const paths = captures.map((c: { image_path: string }) => c.image_path);
    await supabase.storage.from("dd-captures").remove(paths);
  }

  // Delete the item (CASCADE will remove dd_captures rows)
  const { error } = await supabase
    .from("dd_section_items")
    .delete()
    .eq("id", itemId);

  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(
    `/projects/${projectId}/sections/${projectSectionId}`
  );
}
