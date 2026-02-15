"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CaptureFileType } from "@/lib/types";

export async function uploadInspectionCapture(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const file = formData.get("file") as File;
  const projectSectionId = formData.get("projectSectionId") as string;
  const projectId = formData.get("projectId") as string;
  const sectionSlug = formData.get("sectionSlug") as string;
  const findingId = (formData.get("findingId") as string) || null;
  const unitId = (formData.get("unitId") as string) || null;

  if (!file || !projectSectionId || !projectId || !sectionSlug) {
    throw new Error("Missing required fields");
  }

  // Detect file type from MIME
  let fileType: CaptureFileType = "image";
  if (file.type.startsWith("video/")) fileType = "video";
  else if (file.type === "application/pdf") fileType = "pdf";

  // Build owner-scoped storage path
  const ext = file.name.split(".").pop() || "jpg";
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 7);
  const storagePath = `${user.id}/inspections/${projectId}/${sectionSlug}/${timestamp}-${random}.${ext}`;

  // Upload to Supabase Storage (reuse dd-captures bucket)
  const { error: uploadError } = await supabase.storage
    .from("dd-captures")
    .upload(storagePath, file);
  if (uploadError) throw new Error(uploadError.message);

  // Get next sort_order — scoped by finding or unit when present
  let sortQuery = supabase
    .from("inspection_captures")
    .select("sort_order")
    .eq("project_section_id", projectSectionId);

  if (findingId) {
    sortQuery = sortQuery.eq("finding_id", findingId);
  } else if (unitId) {
    sortQuery = sortQuery.eq("unit_id", unitId);
  } else {
    sortQuery = sortQuery.is("finding_id", null).is("unit_id", null);
  }

  const { data: maxSort } = await sortQuery
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();
  const nextSort = (maxSort?.sort_order ?? -1) + 1;

  // Create database record
  const { error: insertError } = await supabase
    .from("inspection_captures")
    .insert({
      project_section_id: projectSectionId,
      finding_id: findingId,
      unit_id: unitId,
      file_type: fileType,
      image_path: storagePath,
      sort_order: nextSort,
      created_by: user.id,
    });
  if (insertError) throw new Error(insertError.message);

  // Update last_used_at
  await supabase
    .from("inspection_project_sections")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", projectSectionId);

  revalidatePath(`/inspections/${projectId}`);
  revalidatePath(
    `/inspections/${projectId}/sections/${projectSectionId}`
  );
}

export async function deleteInspectionCapture(
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

  // Check permission: owner can delete any, collaborator can only delete own
  const { data: project } = await supabase
    .from("inspection_projects")
    .select("owner_id")
    .eq("id", projectId)
    .single();

  if (project?.owner_id !== user.id) {
    // Not owner — check if this capture belongs to the current user
    const { data: capture } = await supabase
      .from("inspection_captures")
      .select("created_by")
      .eq("id", captureId)
      .single();

    if (capture?.created_by !== user.id) {
      throw new Error("You can only delete captures you created");
    }
  }

  const { error: storageError } = await supabase.storage
    .from("dd-captures")
    .remove([imagePath]);
  if (storageError) throw new Error(storageError.message);

  const { error: dbError } = await supabase
    .from("inspection_captures")
    .delete()
    .eq("id", captureId);
  if (dbError) throw new Error(dbError.message);

  revalidatePath(`/inspections/${projectId}`);
  revalidatePath(
    `/inspections/${projectId}/sections/${projectSectionId}`
  );
}

export async function updateInspectionCaptureCaption(
  captureId: string,
  caption: string,
  projectId: string,
  projectSectionId: string
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("inspection_captures")
    .update({ caption })
    .eq("id", captureId);
  if (error) throw new Error(error.message);

  revalidatePath(
    `/inspections/${projectId}/sections/${projectSectionId}`
  );
}
