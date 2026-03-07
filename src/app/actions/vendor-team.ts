"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole, logActivity } from "@/lib/vendor/role-helpers";
import { revalidatePath } from "next/cache";
import type { VendorOrgRole } from "@/lib/vendor/types";

// ============================================
// Team Member Types
// ============================================

export interface TeamMember {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  role: VendorOrgRole;
  trades: string[];
  is_active: boolean;
  created_at: string;
}

export interface TeamDashboardMember extends TeamMember {
  hours_this_week: number;
  is_clocked_in: boolean;
  active_job_title: string | null;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: string;
  invite_expires_at: string;
  created_at: string;
  invited_by_name: string | null;
}

// ============================================
// Team Queries
// ============================================

/** Get all team members for the org. Tech role cannot access. */
export async function getTeamDashboard(): Promise<{
  members: TeamDashboardMember[];
  pendingInvites: PendingInvite[];
  error?: string;
}> {
  const vendorAuth = await requireVendorRole();

  // Tech cannot view team dashboard
  if (vendorAuth.role === "tech") {
    return { members: [], pendingInvites: [], error: "Not authorized" };
  }

  const supabase = await createClient();

  // Fetch all org members
  const { data: rawMembers, error: membersErr } = await supabase
    .from("vendor_users")
    .select("id, user_id, first_name, last_name, email, phone, role, trades, is_active, created_at")
    .eq("vendor_org_id", vendorAuth.vendor_org_id)
    .order("first_name", { ascending: true });

  if (membersErr) {
    return { members: [], pendingInvites: [], error: membersErr.message };
  }

  const members = (rawMembers ?? []) as TeamMember[];

  // Calculate week boundaries (Monday 00:00 to Sunday 23:59 local)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  // Fetch time entries for this week
  const memberIds = members.map((m) => m.id);

  let hoursMap: Record<string, number> = {};
  let clockedInSet = new Set<string>();
  let activeJobMap: Record<string, string | null> = {};

  if (memberIds.length > 0) {
    // Hours this week
    const { data: timeEntries } = await supabase
      .from("vendor_wo_time_entries")
      .select("vendor_user_id, duration_minutes, clock_out")
      .in("vendor_user_id", memberIds)
      .gte("clock_in", weekStart.toISOString())
      .lte("clock_in", weekEnd.toISOString());

    for (const entry of timeEntries ?? []) {
      const uid = entry.vendor_user_id as string;
      const mins = Number(entry.duration_minutes) || 0;
      hoursMap[uid] = (hoursMap[uid] ?? 0) + mins;

      // If clock_out is null, they're currently clocked in
      if (entry.clock_out === null) {
        clockedInSet.add(uid);
      }
    }

    // Also check for any open time entries (not just this week)
    const { data: openEntries } = await supabase
      .from("vendor_wo_time_entries")
      .select("vendor_user_id, work_order_id")
      .in("vendor_user_id", memberIds)
      .is("clock_out", null);

    for (const entry of openEntries ?? []) {
      clockedInSet.add(entry.vendor_user_id as string);
    }

    // Get active job titles for clocked-in members
    if (openEntries && openEntries.length > 0) {
      const woIds = [...new Set(openEntries.map((e) => e.work_order_id as string))];
      const { data: wos } = await supabase
        .from("vendor_work_orders")
        .select("id, property_name, description, trade")
        .in("id", woIds);

      const woMap = new Map((wos ?? []).map((w) => [w.id, w]));
      for (const entry of openEntries) {
        const wo = woMap.get(entry.work_order_id as string);
        if (wo) {
          activeJobMap[entry.vendor_user_id as string] =
            wo.property_name || wo.description || wo.trade || "Work Order";
        }
      }
    }
  }

  const dashboardMembers: TeamDashboardMember[] = members.map((m) => ({
    ...m,
    hours_this_week: Math.round((hoursMap[m.id] ?? 0) / 60 * 10) / 10, // Convert minutes to hours, 1 decimal
    is_clocked_in: clockedInSet.has(m.id),
    active_job_title: activeJobMap[m.id] ?? null,
  }));

  // Fetch pending invites (only for owner/admin)
  let pendingInvites: PendingInvite[] = [];
  if (vendorAuth.role === "owner" || vendorAuth.role === "admin") {
    const { data: invites } = await supabase
      .from("vendor_worker_invites")
      .select("id, email, role, invite_expires_at, created_at, invited_by")
      .eq("vendor_org_id", vendorAuth.vendor_org_id)
      .eq("invite_consumed", false)
      .is("revoked_at", null)
      .gt("invite_expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    // Resolve invited_by names
    if (invites && invites.length > 0) {
      const inviterIds = [...new Set(invites.map((i) => i.invited_by as string))];
      const { data: inviters } = await supabase
        .from("vendor_users")
        .select("user_id, first_name, last_name")
        .in("user_id", inviterIds);

      const inviterMap = new Map(
        (inviters ?? []).map((i) => [
          i.user_id,
          `${i.first_name ?? ""} ${i.last_name ?? ""}`.trim() || "Unknown",
        ])
      );

      pendingInvites = invites.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        invite_expires_at: inv.invite_expires_at,
        created_at: inv.created_at,
        invited_by_name: inviterMap.get(inv.invited_by as string) ?? null,
      }));
    }
  }

  return { members: dashboardMembers, pendingInvites };
}

// ============================================
// Role Management
// ============================================

/** Update a member's role. Owner only. */
export async function updateMemberRole(
  vendorUserId: string,
  newRole: VendorOrgRole
): Promise<{ error?: string }> {
  const vendorAuth = await requireVendorRole();

  // Only owners can change roles
  if (vendorAuth.role !== "owner") {
    return { error: "Only owners can change member roles" };
  }

  // Cannot change own role
  if (vendorAuth.id === vendorUserId) {
    return { error: "Cannot change your own role" };
  }

  const supabase = await createClient();

  // Fetch the target member
  const { data: member, error: fetchErr } = await supabase
    .from("vendor_users")
    .select("id, role, vendor_org_id")
    .eq("id", vendorUserId)
    .single();

  if (fetchErr || !member) {
    return { error: "Member not found" };
  }

  if (member.vendor_org_id !== vendorAuth.vendor_org_id) {
    return { error: "Member does not belong to this organization" };
  }

  // Cannot demote the last owner
  if (member.role === "owner" && newRole !== "owner") {
    const { count } = await supabase
      .from("vendor_users")
      .select("id", { count: "exact", head: true })
      .eq("vendor_org_id", vendorAuth.vendor_org_id)
      .eq("role", "owner")
      .eq("is_active", true);

    if ((count ?? 0) <= 1) {
      return { error: "Cannot demote the last owner" };
    }
  }

  const oldRole = member.role;

  const { error: updateErr } = await supabase
    .from("vendor_users")
    .update({ role: newRole })
    .eq("id", vendorUserId);

  if (updateErr) {
    return { error: updateErr.message };
  }

  await logActivity({
    entityType: "vendor_user",
    entityId: vendorUserId,
    action: "role_changed",
    oldValue: oldRole,
    newValue: newRole,
  });

  revalidatePath("/pro/team");
  revalidatePath("/vendor/profile/team");

  return {};
}

// ============================================
// Deactivate / Reactivate
// ============================================

/** Deactivate a member. Owner/admin only. */
export async function deactivateMember(
  vendorUserId: string
): Promise<{ error?: string }> {
  const vendorAuth = await requireVendorRole();

  if (vendorAuth.role !== "owner" && vendorAuth.role !== "admin") {
    return { error: "Only owners and admins can deactivate members" };
  }

  // Cannot deactivate yourself
  if (vendorAuth.id === vendorUserId) {
    return { error: "Cannot deactivate yourself" };
  }

  const supabase = await createClient();

  const { data: member, error: fetchErr } = await supabase
    .from("vendor_users")
    .select("id, role, vendor_org_id, is_active")
    .eq("id", vendorUserId)
    .single();

  if (fetchErr || !member) {
    return { error: "Member not found" };
  }

  if (member.vendor_org_id !== vendorAuth.vendor_org_id) {
    return { error: "Member does not belong to this organization" };
  }

  // Cannot deactivate the last owner
  if (member.role === "owner") {
    const { count } = await supabase
      .from("vendor_users")
      .select("id", { count: "exact", head: true })
      .eq("vendor_org_id", vendorAuth.vendor_org_id)
      .eq("role", "owner")
      .eq("is_active", true);

    if ((count ?? 0) <= 1) {
      return { error: "Cannot deactivate the last owner" };
    }
  }

  const { error: updateErr } = await supabase
    .from("vendor_users")
    .update({ is_active: false })
    .eq("id", vendorUserId);

  if (updateErr) {
    return { error: updateErr.message };
  }

  await logActivity({
    entityType: "vendor_user",
    entityId: vendorUserId,
    action: "member_deactivated",
  });

  revalidatePath("/pro/team");
  revalidatePath("/vendor/profile/team");

  return {};
}

/** Reactivate a member. Owner/admin only. */
export async function reactivateMember(
  vendorUserId: string
): Promise<{ error?: string }> {
  const vendorAuth = await requireVendorRole();

  if (vendorAuth.role !== "owner" && vendorAuth.role !== "admin") {
    return { error: "Only owners and admins can reactivate members" };
  }

  const supabase = await createClient();

  const { data: member, error: fetchErr } = await supabase
    .from("vendor_users")
    .select("id, vendor_org_id")
    .eq("id", vendorUserId)
    .single();

  if (fetchErr || !member) {
    return { error: "Member not found" };
  }

  if (member.vendor_org_id !== vendorAuth.vendor_org_id) {
    return { error: "Member does not belong to this organization" };
  }

  const { error: updateErr } = await supabase
    .from("vendor_users")
    .update({ is_active: true })
    .eq("id", vendorUserId);

  if (updateErr) {
    return { error: updateErr.message };
  }

  await logActivity({
    entityType: "vendor_user",
    entityId: vendorUserId,
    action: "member_reactivated",
  });

  revalidatePath("/pro/team");
  revalidatePath("/vendor/profile/team");

  return {};
}
