"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole, logActivity } from "@/lib/vendor/role-helpers";
import { emitEvent } from "@/lib/platform/domain-events";

// ============================================
// Types
// ============================================

export interface SubAssignment {
  id: string;
  work_order_id: string;
  sub_vendor_org_id: string | null;
  sub_user_id: string | null;
  hourly_rate: number | null;
  flat_rate: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sub_name?: string;
  sub_email?: string;
}

export interface SubContractor {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string;
  contractor_type: string;
}

// ============================================
// Queries
// ============================================

/**
 * Get all subcontractors in the vendor org.
 */
export async function getSubcontractors(): Promise<{
  data: SubContractor[];
  error?: string;
}> {
  const auth = await requireVendorRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_users")
    .select("id, user_id, first_name, last_name, email, role, contractor_type")
    .eq("vendor_org_id", auth.vendor_org_id)
    .eq("contractor_type", "subcontractor")
    .eq("is_active", true)
    .order("first_name", { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as SubContractor[] };
}

/**
 * Get sub assignments for a specific work order.
 */
export async function getWoSubAssignments(
  woId: string
): Promise<{ data: SubAssignment[]; error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_sub_assignments")
    .select("*")
    .eq("work_order_id", woId)
    .order("created_at", { ascending: true });

  if (error) return { data: [], error: error.message };

  // Enrich with sub names
  const userIds = (data ?? [])
    .map((a) => a.sub_user_id)
    .filter((id): id is string => id !== null);

  let nameMap: Record<string, { name: string; email: string }> = {};
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from("vendor_users")
      .select("user_id, first_name, last_name, email")
      .in("user_id", userIds);

    nameMap = Object.fromEntries(
      (users ?? []).map((u) => [
        u.user_id,
        {
          name: [u.first_name, u.last_name].filter(Boolean).join(" ") || "Unnamed",
          email: u.email ?? "",
        },
      ])
    );
  }

  return {
    data: (data ?? []).map((a) => ({
      ...a,
      sub_name: a.sub_user_id ? nameMap[a.sub_user_id]?.name : undefined,
      sub_email: a.sub_user_id ? nameMap[a.sub_user_id]?.email : undefined,
    })) as SubAssignment[],
  };
}

// ============================================
// Mutations
// ============================================

/**
 * Assign a subcontractor to a work order.
 */
export async function assignSubToWo(input: {
  workOrderId: string;
  subUserId: string;
  hourlyRate?: number;
  flatRate?: number;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  const auth = await requireVendorRole();

  if (!["owner", "admin", "manager"].includes(auth.role)) {
    return { success: false, error: "Only admins can assign subcontractors" };
  }

  const supabase = await createClient();

  // Verify the sub user belongs to the org
  const { data: subUser } = await supabase
    .from("vendor_users")
    .select("id, user_id, vendor_org_id, contractor_type")
    .eq("user_id", input.subUserId)
    .eq("vendor_org_id", auth.vendor_org_id)
    .single();

  if (!subUser) return { success: false, error: "Subcontractor not found" };

  // Check for existing assignment
  const { data: existing } = await supabase
    .from("vendor_sub_assignments")
    .select("id")
    .eq("work_order_id", input.workOrderId)
    .eq("sub_user_id", input.subUserId)
    .not("status", "in", '("declined","completed")')
    .maybeSingle();

  if (existing) {
    return { success: false, error: "Subcontractor already assigned to this job" };
  }

  const { error } = await supabase.from("vendor_sub_assignments").insert({
    work_order_id: input.workOrderId,
    sub_vendor_org_id: auth.vendor_org_id,
    sub_user_id: input.subUserId,
    hourly_rate: input.hourlyRate ?? null,
    flat_rate: input.flatRate ?? null,
    notes: input.notes ?? null,
    status: "assigned",
  });

  if (error) return { success: false, error: error.message };

  await logActivity({
    entityType: "work_order",
    entityId: input.workOrderId,
    action: "sub_assigned",
    metadata: { sub_user_id: input.subUserId },
  });

  emitEvent(
    "work_order.assigned",
    "sub_assignment",
    input.workOrderId,
    {
      origin_module: "vendor",
      vendor_org_id: auth.vendor_org_id,
      work_order_id: input.workOrderId,
      new_status: "assigned",
    },
    { id: auth.id, type: "user" }
  );

  return { success: true };
}

/**
 * Update a sub assignment (status, rate, notes).
 */
export async function updateSubAssignment(
  assignmentId: string,
  updates: {
    status?: string;
    hourlyRate?: number;
    flatRate?: number;
    notes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireVendorRole();
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.hourlyRate !== undefined) updateData.hourly_rate = updates.hourlyRate;
  if (updates.flatRate !== undefined) updateData.flat_rate = updates.flatRate;
  if (updates.notes !== undefined) updateData.notes = updates.notes;

  const { error } = await supabase
    .from("vendor_sub_assignments")
    .update(updateData)
    .eq("id", assignmentId);

  if (error) return { success: false, error: error.message };

  await logActivity({
    entityType: "sub_assignment",
    entityId: assignmentId,
    action: "updated",
    metadata: updates,
  });

  return { success: true };
}

/**
 * Remove a sub assignment.
 */
export async function removeSubAssignment(
  assignmentId: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireVendorRole();

  if (!["owner", "admin", "manager"].includes(auth.role)) {
    return { success: false, error: "Only admins can remove subcontractor assignments" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("vendor_sub_assignments")
    .delete()
    .eq("id", assignmentId);

  if (error) return { success: false, error: error.message };

  return { success: true };
}

/**
 * Toggle a team member's contractor_type between employee and subcontractor.
 */
export async function toggleContractorType(
  vendorUserId: string,
  contractorType: "employee" | "subcontractor"
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireVendorRole();

  if (!["owner", "admin"].includes(auth.role)) {
    return { success: false, error: "Only admins can change contractor type" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("vendor_users")
    .update({ contractor_type: contractorType })
    .eq("id", vendorUserId)
    .eq("vendor_org_id", auth.vendor_org_id);

  if (error) return { success: false, error: error.message };

  return { success: true };
}
