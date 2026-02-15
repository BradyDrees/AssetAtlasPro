"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  CreateInspectionProject,
  UpdateInspectionProject,
  ProjectStatus,
} from "@/lib/inspection-types";

// ============================================
// Project CRUD
// ============================================

export async function createInspectionProject(data: CreateInspectionProject): Promise<{ id?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated" };

    // 1. Create the project
    const { data: project, error: projectError } = await supabase
      .from("inspection_projects")
      .insert({
        ...data,
        owner_id: user.id,
      })
      .select("id")
      .single();

    if (projectError) return { error: "Step 1: " + projectError.message };

    // 2. Fetch all master sections
    const { data: sections, error: sectionsError } = await supabase
      .from("inspection_sections")
      .select("id, slug, sort_order, is_default_enabled, is_unit_mode")
      .order("sort_order");

    if (sectionsError) return { error: "Step 2: " + sectionsError.message };

    if (!sections || sections.length === 0) {
      return { error: "Step 2: No master sections found" };
    }

    // 3. Create project_sections for each master section
    //    Auto-rename "Units" → "Homes" for SFR archetype
    const isSfr = data.asset_archetype === "sfr";
    const projectSections = sections.map((section) => ({
      project_id: project.id,
      section_id: section.id,
      enabled: section.is_default_enabled,
      sort_order: section.sort_order,
      display_name_override:
        isSfr && section.is_unit_mode ? "Home Inspections" : null,
    }));

    const { error: insertError } = await supabase
      .from("inspection_project_sections")
      .insert(projectSections);

    if (insertError) return { error: "Step 3: " + insertError.message };

    revalidatePath("/inspections");

    return { id: project.id };
  } catch (err) {
    return { error: "Unexpected: " + (err instanceof Error ? err.message : String(err)) };
  }
}

export async function updateInspectionProject(
  id: string,
  data: UpdateInspectionProject
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Only the project owner can edit project settings
  const { data: project } = await supabase
    .from("inspection_projects")
    .select("owner_id")
    .eq("id", id)
    .single();
  if (project?.owner_id !== user.id) {
    throw new Error("Only the project owner can edit this inspection");
  }

  const { error } = await supabase
    .from("inspection_projects")
    .update(data)
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/inspections");
  revalidatePath(`/inspections/${id}`);
}

export async function updateInspectionProjectStatus(
  id: string,
  status: ProjectStatus
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("inspection_projects")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/inspections");
  revalidatePath(`/inspections/${id}`);
  revalidatePath(`/inspections/${id}/review`);
}

export async function deleteInspectionProject(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Only the project owner can delete
  const { data: project } = await supabase
    .from("inspection_projects")
    .select("owner_id")
    .eq("id", id)
    .single();
  if (project?.owner_id !== user.id) {
    throw new Error("Only the project owner can delete this inspection");
  }

  // First, collect all capture storage paths for this project
  const { data: sectionIds } = await supabase
    .from("inspection_project_sections")
    .select("id")
    .eq("project_id", id);

  if (sectionIds && sectionIds.length > 0) {
    const psIds = sectionIds.map((s) => s.id);
    const { data: captures } = await supabase
      .from("inspection_captures")
      .select("image_path")
      .in("project_section_id", psIds);

    if (captures && captures.length > 0) {
      const paths = captures.map((c) => c.image_path);
      // Delete in batches of 100 (Supabase storage limit)
      for (let i = 0; i < paths.length; i += 100) {
        await supabase.storage
          .from("dd-captures")
          .remove(paths.slice(i, i + 100));
      }
    }
  }

  // Then delete the project (CASCADE handles DB rows)
  const { error } = await supabase
    .from("inspection_projects")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/inspections");
}

// ============================================
// Section Toggle
// ============================================

export async function toggleInspectionSection(
  projectSectionId: string,
  projectId: string,
  enabled: boolean
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("inspection_project_sections")
    .update({ enabled })
    .eq("id", projectSectionId);

  if (error) throw new Error(error.message);

  revalidatePath(`/inspections/${projectId}`);
}

// ============================================
// Section-level Fields (Condition Rating, RUL, Notes)
// ============================================

export async function updateInspectionSectionRating(
  projectSectionId: string,
  projectId: string,
  conditionRating: number | null
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("inspection_project_sections")
    .update({ condition_rating: conditionRating })
    .eq("id", projectSectionId);

  if (error) throw new Error(error.message);

  revalidatePath(
    `/inspections/${projectId}/sections/${projectSectionId}`
  );
  revalidatePath(`/inspections/${projectId}`);
}

export async function updateInspectionSectionRul(
  projectSectionId: string,
  projectId: string,
  rulBucket: string | null
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("inspection_project_sections")
    .update({ rul_bucket: rulBucket })
    .eq("id", projectSectionId);

  if (error) throw new Error(error.message);

  revalidatePath(
    `/inspections/${projectId}/sections/${projectSectionId}`
  );
  revalidatePath(`/inspections/${projectId}`);
}

export async function toggleInspectionSectionNA(
  projectSectionId: string,
  projectId: string,
  isNa: boolean
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("inspection_project_sections")
    .update({ is_na: isNa })
    .eq("id", projectSectionId);

  if (error) throw new Error(error.message);

  revalidatePath(`/inspections/${projectId}`);
  revalidatePath(`/inspections/${projectId}/groups`, "layout");
}

export async function updateInspectionSectionNotes(
  projectSectionId: string,
  projectId: string,
  notes: string
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("inspection_project_sections")
    .update({ notes })
    .eq("id", projectSectionId);

  if (error) throw new Error(error.message);

  revalidatePath(
    `/inspections/${projectId}/sections/${projectSectionId}`
  );
}
