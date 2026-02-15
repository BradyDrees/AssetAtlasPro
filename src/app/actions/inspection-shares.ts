"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProjectOwner } from "@/lib/inspection-auth";
import type { InspectionProjectShareWithProfile } from "@/lib/inspection-types";

/**
 * Share an inspection project with another user by email.
 * Only the project owner can share.
 */
export async function shareInspection(
  projectId: string,
  email: string
): Promise<void> {
  const supabase = await createClient();
  const { user } = await requireProjectOwner(supabase, projectId);

  const trimmed = email.trim().toLowerCase();
  if (!trimmed) throw new Error("Email is required");

  // Look up user by email using secure RPC
  const { data: profiles, error: lookupError } = await supabase.rpc(
    "find_profile_by_email",
    { lookup_email: trimmed }
  );

  if (lookupError) throw new Error(lookupError.message);
  if (!profiles || profiles.length === 0) {
    throw new Error("No account found with that email. They need to sign up first.");
  }

  const row = profiles[0];
  const targetUser = { id: row.out_id, email: row.out_email, full_name: row.out_full_name };

  // Can't share with yourself
  if (targetUser.id === user.id) {
    throw new Error("You can't share with yourself — you already own this inspection.");
  }

  // Check if already shared
  const { data: existing } = await supabase
    .from("inspection_project_shares")
    .select("id")
    .eq("project_id", projectId)
    .eq("shared_with_user_id", targetUser.id)
    .limit(1)
    .single();

  if (existing) {
    throw new Error("This inspection is already shared with that user.");
  }

  // Create the share
  const { error: insertError } = await supabase
    .from("inspection_project_shares")
    .insert({
      project_id: projectId,
      shared_with_user_id: targetUser.id,
      shared_by_user_id: user.id,
      role: "collaborator",
    });

  if (insertError) throw new Error(insertError.message);

  revalidatePath(`/inspections/${projectId}`);
}

/**
 * Remove a share (unshare) from an inspection project.
 * Only the project owner can unshare.
 */
export async function unshareInspection(
  projectId: string,
  shareId: string
): Promise<void> {
  const supabase = await createClient();
  await requireProjectOwner(supabase, projectId);

  const { error } = await supabase
    .from("inspection_project_shares")
    .delete()
    .eq("id", shareId)
    .eq("project_id", projectId);

  if (error) throw new Error(error.message);

  revalidatePath(`/inspections/${projectId}`);
}

/**
 * Get all shares for a project, with profile info for each shared user.
 */
export async function getProjectShares(
  projectId: string
): Promise<InspectionProjectShareWithProfile[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Fetch shares
  const { data: shares, error } = await supabase
    .from("inspection_project_shares")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  if (!shares || shares.length === 0) return [];

  // Look up profiles for each shared user
  const userIds = shares.map((s) => s.shared_with_user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p: { id: string; email: string; full_name: string }) => [p.id, p])
  );

  return shares.map((share) => ({
    ...share,
    profile: profileMap.get(share.shared_with_user_id) ?? {
      id: share.shared_with_user_id,
      email: "unknown",
      full_name: "",
    },
  }));
}
