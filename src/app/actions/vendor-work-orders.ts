"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole, logActivity } from "@/lib/vendor/role-helpers";
import {
  validateWoTransition,
  vendorOrgRoleToTransitionRole,
} from "@/lib/vendor/state-machine";
import type { WoStatus } from "@/lib/vendor/types";
import type {
  VendorWorkOrder,
  VendorWoMaterial,
  VendorWoTimeEntry,
  AddMaterialInput,
  ClockInInput,
} from "@/lib/vendor/work-order-types";

// ============================================
// Work Order Queries
// ============================================

/** Get all work orders for the current vendor org */
export async function getVendorWorkOrders(filters?: {
  status?: WoStatus | WoStatus[];
  priority?: string;
  trade?: string;
}): Promise<{ data: VendorWorkOrder[]; error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  let query = supabase
    .from("vendor_work_orders")
    .select("*")
    .eq("vendor_org_id", vendor_org_id)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in("status", filters.status);
    } else {
      query = query.eq("status", filters.status);
    }
  }

  if (filters?.priority) {
    query = query.eq("priority", filters.priority);
  }

  if (filters?.trade) {
    query = query.eq("trade", filters.trade);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch work orders:", error);
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as VendorWorkOrder[] };
}

/** Get a single work order by ID */
export async function getWorkOrder(
  woId: string
): Promise<{ data: VendorWorkOrder | null; error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_work_orders")
    .select("*")
    .eq("id", woId)
    .single();

  if (error) {
    console.error("Failed to fetch work order:", error);
    return { data: null, error: error.message };
  }

  return { data: data as VendorWorkOrder };
}

// ============================================
// Status Transitions (State Machine Enforced)
// ============================================

/** Update work order status with state machine validation */
export async function updateWorkOrderStatus(
  woId: string,
  newStatus: WoStatus,
  extra?: {
    decline_reason?: string;
    completion_notes?: string;
    scheduled_date?: string;
    scheduled_time_start?: string;
    scheduled_time_end?: string;
  }
): Promise<{ error?: string }> {
  const vendorAuth = await requireVendorRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Fetch current WO
  const { data: wo, error: fetchError } = await supabase
    .from("vendor_work_orders")
    .select("id, status, vendor_org_id, pm_user_id")
    .eq("id", woId)
    .single();

  if (fetchError || !wo) {
    return { error: "Work order not found" };
  }

  // Validate org membership
  if (wo.vendor_org_id !== vendorAuth.vendor_org_id) {
    return { error: "Not authorized for this work order" };
  }

  // Validate transition via state machine
  const callerRole = vendorOrgRoleToTransitionRole(vendorAuth.role);
  const validation = validateWoTransition(
    wo.status as WoStatus,
    newStatus,
    callerRole
  );

  if (!validation.valid) {
    return { error: validation.reason };
  }

  // Build update payload
  const updateData: Record<string, unknown> = {
    status: newStatus,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  if (newStatus === "declined" && extra?.decline_reason) {
    updateData.decline_reason = extra.decline_reason;
  }

  if (newStatus === "completed") {
    updateData.completed_at = new Date().toISOString();
    if (extra?.completion_notes) {
      updateData.completion_notes = extra.completion_notes;
    }
  }

  if (newStatus === "in_progress" || newStatus === "en_route") {
    if (!wo.status || wo.status === "accepted" || wo.status === "scheduled") {
      updateData.started_at = new Date().toISOString();
    }
  }

  if (newStatus === "scheduled") {
    if (extra?.scheduled_date) updateData.scheduled_date = extra.scheduled_date;
    if (extra?.scheduled_time_start) updateData.scheduled_time_start = extra.scheduled_time_start;
    if (extra?.scheduled_time_end) updateData.scheduled_time_end = extra.scheduled_time_end;
  }

  const { error: updateError } = await supabase
    .from("vendor_work_orders")
    .update(updateData)
    .eq("id", woId);

  if (updateError) {
    console.error("Failed to update WO status:", updateError);
    return { error: updateError.message };
  }

  // Log activity
  await logActivity({
    entityType: "work_order",
    entityId: woId,
    action: "status_changed",
    oldValue: wo.status,
    newValue: newStatus,
    metadata: { extra },
  });

  // Create notification for the PM
  await supabase.from("vendor_notifications").insert({
    user_id: wo.pm_user_id,
    type: "wo_status_changed",
    title: `Work order status: ${newStatus.replace(/_/g, " ")}`,
    body: newStatus === "declined"
      ? `Vendor declined: ${extra?.decline_reason || "No reason given"}`
      : `Work order has been updated to ${newStatus.replace(/_/g, " ")}`,
    reference_type: "work_order",
    reference_id: woId,
  });

  return {};
}

/** Accept a work order */
export async function acceptWorkOrder(
  woId: string
): Promise<{ error?: string }> {
  return updateWorkOrderStatus(woId, "accepted");
}

/** Decline a work order */
export async function declineWorkOrder(
  woId: string,
  reason: string
): Promise<{ error?: string }> {
  return updateWorkOrderStatus(woId, "declined", {
    decline_reason: reason,
  });
}

// ============================================
// Materials CRUD
// ============================================

/** Get materials for a work order */
export async function getWorkOrderMaterials(
  woId: string
): Promise<{ data: VendorWoMaterial[]; error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_wo_materials")
    .select("*")
    .eq("work_order_id", woId)
    .order("created_at", { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as VendorWoMaterial[] };
}

/** Add a material to a work order */
export async function addMaterial(
  input: AddMaterialInput
): Promise<{ data?: VendorWoMaterial; error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const total = input.quantity * input.unit_cost;

  const { data, error } = await supabase
    .from("vendor_wo_materials")
    .insert({
      work_order_id: input.work_order_id,
      description: input.description,
      quantity: input.quantity,
      unit_cost: input.unit_cost,
      total,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  await logActivity({
    entityType: "work_order",
    entityId: input.work_order_id,
    action: "material_added",
    metadata: { description: input.description, total },
  });

  return { data: data as VendorWoMaterial };
}

/** Delete a material */
export async function deleteMaterial(
  materialId: string,
  workOrderId: string
): Promise<{ error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  const { error } = await supabase
    .from("vendor_wo_materials")
    .delete()
    .eq("id", materialId);

  if (error) {
    return { error: error.message };
  }

  await logActivity({
    entityType: "work_order",
    entityId: workOrderId,
    action: "material_removed",
    metadata: { material_id: materialId },
  });

  return {};
}

// ============================================
// Time Tracking
// ============================================

/** Get time entries for a work order */
export async function getTimeEntries(
  woId: string
): Promise<{ data: VendorWoTimeEntry[]; error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_wo_time_entries")
    .select("*")
    .eq("work_order_id", woId)
    .order("clock_in", { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as VendorWoTimeEntry[] };
}

/** Clock in — creates a new time entry */
export async function clockIn(
  input: ClockInInput
): Promise<{ data?: VendorWoTimeEntry; error?: string }> {
  const vendorAuth = await requireVendorRole();
  const supabase = await createClient();

  // Check for open time entry
  const { data: openEntry } = await supabase
    .from("vendor_wo_time_entries")
    .select("id")
    .eq("work_order_id", input.work_order_id)
    .eq("vendor_user_id", vendorAuth.id)
    .is("clock_out", null)
    .single();

  if (openEntry) {
    return { error: "Already clocked in to this work order" };
  }

  const { data, error } = await supabase
    .from("vendor_wo_time_entries")
    .insert({
      work_order_id: input.work_order_id,
      vendor_user_id: vendorAuth.id,
      clock_in: new Date().toISOString(),
      hourly_rate: input.hourly_rate ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  await logActivity({
    entityType: "work_order",
    entityId: input.work_order_id,
    action: "clocked_in",
  });

  return { data: data as VendorWoTimeEntry };
}

/** Clock out — closes the open time entry */
export async function clockOut(
  woId: string,
  notes?: string
): Promise<{ data?: VendorWoTimeEntry; error?: string }> {
  const vendorAuth = await requireVendorRole();
  const supabase = await createClient();

  // Find open time entry
  const { data: openEntry, error: findError } = await supabase
    .from("vendor_wo_time_entries")
    .select("*")
    .eq("work_order_id", woId)
    .eq("vendor_user_id", vendorAuth.id)
    .is("clock_out", null)
    .single();

  if (findError || !openEntry) {
    return { error: "No open time entry found" };
  }

  const clockOutTime = new Date();
  const clockInTime = new Date(openEntry.clock_in);
  const durationMinutes = Math.round(
    (clockOutTime.getTime() - clockInTime.getTime()) / 60000
  );

  const updateData: Record<string, unknown> = {
    clock_out: clockOutTime.toISOString(),
    duration_minutes: durationMinutes,
  };

  if (notes) {
    updateData.notes = notes;
  }

  const { data, error } = await supabase
    .from("vendor_wo_time_entries")
    .update(updateData)
    .eq("id", openEntry.id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  await logActivity({
    entityType: "work_order",
    entityId: woId,
    action: "clocked_out",
    metadata: { duration_minutes: durationMinutes },
  });

  return { data: data as VendorWoTimeEntry };
}
