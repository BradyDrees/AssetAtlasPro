// ============================================
// Asset Atlas Pro — Inspection Auth Helpers
// ============================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { InspectionProject, ProjectRole } from "./inspection-types";

interface AccessResult {
  user: { id: string; email?: string };
  project: InspectionProject;
  role: ProjectRole;
}

/**
 * Verify the current user has access to the project (owner or shared).
 * Returns the user, project, and their role.
 * Throws if not authenticated or no access.
 */
export async function requireProjectAccess(
  supabase: SupabaseClient,
  projectId: string
): Promise<AccessResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: project } = await supabase
    .from("inspection_projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (!project) throw new Error("Project not found or no access");

  // Owner check
  if (project.owner_id === user.id) {
    return { user, project, role: "owner" };
  }

  // Shared check
  const { data: share } = await supabase
    .from("inspection_project_shares")
    .select("id")
    .eq("project_id", projectId)
    .eq("shared_with_user_id", user.id)
    .limit(1)
    .single();

  if (share) {
    return { user, project, role: "collaborator" };
  }

  throw new Error("No access to this project");
}

/**
 * Verify the current user is the owner of the project.
 * Throws if not authenticated, not found, or not owner.
 */
export async function requireProjectOwner(
  supabase: SupabaseClient,
  projectId: string
): Promise<AccessResult> {
  const result = await requireProjectAccess(supabase, projectId);
  if (result.role !== "owner") {
    throw new Error("Only the project owner can perform this action");
  }
  return result;
}
