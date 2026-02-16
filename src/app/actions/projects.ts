"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CreateDDProject, UpdateDDProject, ProjectStatus } from "@/lib/types";

export async function createDDProject(data: CreateDDProject) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // 1. Create the project
  const { data: project, error: projectError } = await supabase
    .from("dd_projects")
    .insert({
      ...data,
      owner_id: user.id,
    })
    .select("id")
    .single();

  if (projectError) throw new Error(projectError.message);

  // 2. Fetch all master sections
  const { data: sections, error: sectionsError } = await supabase
    .from("dd_sections")
    .select("id, sort_order, is_default_enabled")
    .order("sort_order");

  if (sectionsError) throw new Error(sectionsError.message);

  // 3. Create project_sections for each master section
  const projectSections = sections.map((section) => ({
    project_id: project.id,
    section_id: section.id,
    enabled: section.is_default_enabled,
    sort_order: section.sort_order,
  }));

  const { error: insertError } = await supabase
    .from("dd_project_sections")
    .insert(projectSections);

  if (insertError) throw new Error(insertError.message);

  revalidatePath("/dashboard");

  return project.id;
}

export async function updateDDProject(id: string, data: UpdateDDProject) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Verify ownership
  const { data: project } = await supabase
    .from("dd_projects")
    .select("owner_id")
    .eq("id", id)
    .single();
  if (!project || project.owner_id !== user.id) throw new Error("Not authorized");

  const { error } = await supabase
    .from("dd_projects")
    .update(data)
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath(`/projects/${id}`);
}

export async function updateProjectStatus(id: string, status: ProjectStatus) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Verify ownership
  const { data: project } = await supabase
    .from("dd_projects")
    .select("owner_id")
    .eq("id", id)
    .single();
  if (!project || project.owner_id !== user.id) throw new Error("Not authorized");

  const { error } = await supabase
    .from("dd_projects")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath(`/projects/${id}`);
  revalidatePath(`/projects/${id}/review`);
}

export async function deleteDDProject(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Verify ownership
  const { data: project } = await supabase
    .from("dd_projects")
    .select("owner_id")
    .eq("id", id)
    .single();
  if (!project || project.owner_id !== user.id) throw new Error("Not authorized");

  // First, collect all capture storage paths for this project
  const { data: sectionIds } = await supabase
    .from("dd_project_sections")
    .select("id")
    .eq("project_id", id);

  if (sectionIds && sectionIds.length > 0) {
    const psIds = sectionIds.map((s) => s.id);
    const { data: captures } = await supabase
      .from("dd_captures")
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
    .from("dd_projects")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
}
