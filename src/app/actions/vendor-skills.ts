"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole, logActivity } from "@/lib/vendor/role-helpers";
import type { VendorSkill, VendorUserSkill } from "@/lib/vendor/expense-types";
import type { SkillProficiency } from "@/lib/vendor/types";

/** Get all skills for the org */
export async function getOrgSkills(): Promise<{ data: VendorSkill[]; error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_skills")
    .select("*")
    .eq("vendor_org_id", vendor_org_id)
    .order("name", { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as VendorSkill[] };
}

/** Create a new skill */
export async function createSkill(
  name: string,
  category?: string
): Promise<{ data?: VendorSkill; error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_skills")
    .insert({
      vendor_org_id,
      name: name.trim(),
      category: category?.trim() || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity({
    entityType: "skill",
    entityId: data.id,
    action: "created",
    metadata: { name, category },
  });

  return { data: data as VendorSkill };
}

/** Update a skill */
export async function updateSkill(
  skillId: string,
  updates: { name?: string; category?: string }
): Promise<{ error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (updates.name !== undefined) updateData.name = updates.name.trim();
  if (updates.category !== undefined) updateData.category = updates.category?.trim() || null;

  const { error } = await supabase
    .from("vendor_skills")
    .update(updateData)
    .eq("id", skillId);

  if (error) return { error: error.message };
  return {};
}

/** Deactivate a skill (soft delete) */
export async function deactivateSkill(skillId: string): Promise<{ error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  const { error } = await supabase
    .from("vendor_skills")
    .update({ is_active: false })
    .eq("id", skillId);

  if (error) return { error: error.message };
  return {};
}

/** Assign a skill to a user */
export async function assignSkillToUser(
  vendorUserId: string,
  skillId: string,
  proficiency?: SkillProficiency,
  certifiedAt?: string
): Promise<{ data?: VendorUserSkill; error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_user_skills")
    .insert({
      vendor_user_id: vendorUserId,
      skill_id: skillId,
      proficiency: proficiency || "competent",
      certified_at: certifiedAt || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity({
    entityType: "skill",
    entityId: skillId,
    action: "assigned_to_user",
    metadata: { vendor_user_id: vendorUserId, proficiency },
  });

  return { data: data as VendorUserSkill };
}

/** Remove a skill from a user */
export async function removeSkillFromUser(
  vendorUserId: string,
  skillId: string
): Promise<{ error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  const { error } = await supabase
    .from("vendor_user_skills")
    .delete()
    .eq("vendor_user_id", vendorUserId)
    .eq("skill_id", skillId);

  if (error) return { error: error.message };
  return {};
}

/** Get team members for the org */
export async function getTeamMembers(): Promise<{ id: string; user_id: string; first_name: string | null; last_name: string | null; role: string; trades: string[] }[]> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_users")
    .select("id, user_id, first_name, last_name, role, trades")
    .eq("vendor_org_id", vendor_org_id)
    .eq("is_active", true)
    .order("first_name", { ascending: true });

  if (error) return [];
  return (data ?? []) as { id: string; user_id: string; first_name: string | null; last_name: string | null; role: string; trades: string[] }[];
}

/** Get skills for a specific user */
export async function getUserSkills(
  vendorUserId: string
): Promise<{ data: (VendorUserSkill & { skill_name: string; skill_category: string | null })[]; error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  const { data: userSkills, error } = await supabase
    .from("vendor_user_skills")
    .select("*, vendor_skills(name, category)")
    .eq("vendor_user_id", vendorUserId);

  if (error) return { data: [], error: error.message };

  const result = (userSkills ?? []).map((us: Record<string, unknown>) => {
    const skill = us.vendor_skills as { name: string; category: string | null } | null;
    return {
      ...(us as unknown as VendorUserSkill),
      skill_name: skill?.name ?? "",
      skill_category: skill?.category ?? null,
    };
  });

  return { data: result };
}
