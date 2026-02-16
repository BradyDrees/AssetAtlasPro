"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CaptureFileType } from "@/lib/types";

export async function uploadCapture(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const file = formData.get("file") as File;
  const projectSectionId = formData.get("projectSectionId") as string;
  const projectId = formData.get("projectId") as string;
  const sectionSlug = formData.get("sectionSlug") as string;
  const unitId = (formData.get("unitId") as string) || null;
  const sectionItemId = (formData.get("sectionItemId") as string) || null;

  if (!file || !projectSectionId || !projectId || !sectionSlug) {
    throw new Error("Missing required fields");
  }

  // Detect file type from MIME
  let fileType: CaptureFileType = "image";
  if (file.type.startsWith("video/")) fileType = "video";
  else if (file.type === "application/pdf") fileType = "pdf";

  // Build owner-scoped storage path (risk assessment: owner-prefixed for multi-user safety)
  const ext = file.name.split(".").pop() || "jpg";
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 7);
  const storagePath = `${user.id}/${projectId}/${sectionSlug}/${timestamp}-${random}.${ext}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("dd-captures")
    .upload(storagePath, file);
  if (uploadError) throw new Error(uploadError.message);

  // Get next sort_order — scoped by unit when present
  let sortQuery = supabase
    .from("dd_captures")
    .select("sort_order")
    .eq("project_section_id", projectSectionId);

  if (unitId) {
    sortQuery = sortQuery.eq("unit_id", unitId);
  } else if (sectionItemId) {
    sortQuery = sortQuery.eq("section_item_id", sectionItemId);
  } else {
    sortQuery = sortQuery.is("unit_id", null).is("section_item_id", null);
  }

  const { data: maxSort } = await sortQuery
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();
  const nextSort = (maxSort?.sort_order ?? -1) + 1;

  // Create database record
  const { error: insertError } = await supabase.from("dd_captures").insert({
    project_section_id: projectSectionId,
    unit_id: unitId,
    section_item_id: sectionItemId,
    file_type: fileType,
    image_path: storagePath,
    sort_order: nextSort,
  });
  if (insertError) throw new Error(insertError.message);

  // Update last_used_at
  await supabase
    .from("dd_project_sections")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", projectSectionId);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/sections/${projectSectionId}`);
  if (unitId) {
    revalidatePath(
      `/projects/${projectId}/sections/${projectSectionId}/units/${unitId}`
    );
  }
  if (sectionItemId) {
    revalidatePath(
      `/projects/${projectId}/sections/${projectSectionId}/items/${sectionItemId}`
    );
  }
}

export async function deleteCapture(
  captureId: string,
  imagePath: string,
  projectId: string,
  projectSectionId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Verify ownership
  const { data: project } = await supabase
    .from("dd_projects")
    .select("owner_id")
    .eq("id", projectId)
    .single();
  if (!project || project.owner_id !== user.id) throw new Error("Not authorized");

  const { error: storageError } = await supabase.storage
    .from("dd-captures")
    .remove([imagePath]);
  if (storageError) throw new Error(storageError.message);

  const { error: dbError } = await supabase
    .from("dd_captures")
    .delete()
    .eq("id", captureId);
  if (dbError) throw new Error(dbError.message);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/sections/${projectSectionId}`);
}

export async function updateCaptureCaption(
  captureId: string,
  caption: string,
  projectId: string,
  projectSectionId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("dd_captures")
    .update({ caption })
    .eq("id", captureId);
  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${projectId}/sections/${projectSectionId}`);
}

export async function updateSectionRating(
  projectSectionId: string,
  projectId: string,
  conditionRating: number | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("dd_project_sections")
    .update({ condition_rating: conditionRating })
    .eq("id", projectSectionId);
  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${projectId}/sections/${projectSectionId}`);
  revalidatePath(`/projects/${projectId}`);
}

export async function updateSectionNotes(
  projectSectionId: string,
  projectId: string,
  notes: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("dd_project_sections")
    .update({ notes })
    .eq("id", projectSectionId);
  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${projectId}/sections/${projectSectionId}`);
}
