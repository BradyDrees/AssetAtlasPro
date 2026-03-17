"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole, logActivity } from "@/lib/vendor/role-helpers";
import {
  validateWoTransition,
  vendorOrgRoleToTransitionRole,
} from "@/lib/vendor/state-machine";
import type { WoStatus, ScheduleJob } from "@/lib/vendor/types";
import { toScheduleJob, SCHEDULABLE_STATUSES } from "@/lib/vendor/types";
import type {
  VendorWorkOrder,
  VendorWoMaterial,
  VendorWoTimeEntry,
  AddMaterialInput,
  ClockInInput,
} from "@/lib/vendor/work-order-types";
import {
  computeSmartSchedule,
  type SmartScheduleResult,
  type ScheduleProposal,
} from "@/lib/vendor/smart-scheduler";

// ============================================
// Work Order Queries
// ============================================

/** Get all work orders for the current vendor org.
 *  Tech role: auto-filters to only assigned_to = self.
 *  Owner/Admin/Office Manager: full org view. */
export async function getVendorWorkOrders(filters?: {
  status?: WoStatus | WoStatus[];
  priority?: string;
  trade?: string;
  archived?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<{ data: VendorWorkOrder[]; total: number; page: number; pageSize: number; error?: string }> {
  const vendorAuth = await requireVendorRole();
  const supabase = await createClient();

  const safePage = Math.max(1, filters?.page ?? 1);
  const safeSize = Math.min(Math.max(1, filters?.pageSize ?? 25), 100);
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;

  let query = supabase
    .from("vendor_work_orders")
    .select("*", { count: "exact" })
    .eq("vendor_org_id", vendorAuth.vendor_org_id)
    .range(from, to)
    .order("created_at", { ascending: false });

  // Archive filter — mutually exclusive
  if (filters?.archived === true) {
    query = query.not("archived_at", "is", null);
  } else {
    query = query.is("archived_at", null);
  }

  // Tech role: only see assigned jobs
  if (vendorAuth.role === "tech") {
    query = query.eq("assigned_to", vendorAuth.id);
  }

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

  const { data, count, error } = await query;

  if (error) {
    console.error("Failed to fetch work orders:", error);
    return { data: [], total: 0, page: safePage, pageSize: safeSize, error: error.message };
  }

  return { data: (data ?? []) as VendorWorkOrder[], total: count ?? 0, page: safePage, pageSize: safeSize };
}

/** Get a single work order by ID.
 *  Tech role: rejects if not assigned to them. */
export async function getWorkOrder(
  woId: string
): Promise<{ data: VendorWorkOrder | null; error?: string }> {
  const vendorAuth = await requireVendorRole();
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

  const wo = data as VendorWorkOrder;

  // Tech role: can only view their assigned jobs
  if (vendorAuth.role === "tech" && wo.assigned_to !== vendorAuth.id) {
    return { data: null, error: "Not authorized for this work order" };
  }

  return { data: wo };
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

  // Fetch current WO (include fields needed for homeowner notifications + cascade)
  const { data: wo, error: fetchError } = await supabase
    .from("vendor_work_orders")
    .select("id, status, vendor_org_id, pm_user_id, homeowner_id, urgency, source_type, trade, description, project_id, sequence_order, platform_fee_pct, homeowner_property_id")
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

  // Create notification for the PM (if PM-routed)
  if (wo.pm_user_id) {
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
  }

  // Auto-SMS to tenant (fire-and-forget, non-blocking)
  import("./vendor-sms-notifications").then(({ sendWoStatusSms }) => {
    void sendWoStatusSms(woId, newStatus);
  }).catch(() => {});

  // Homeowner notifications + decline cascade (only for homeowner-submitted WOs)
  if (wo.homeowner_id) {
    const { notifyHomeownerStatusChange } = await import("./home-wo-notifications");

    // Get vendor org name for notification body
    let vendorOrgName: string | null = null;
    if (wo.vendor_org_id) {
      const { data: org } = await supabase
        .from("vendor_organizations")
        .select("name")
        .eq("id", wo.vendor_org_id)
        .single();
      vendorOrgName = org?.name ?? null;
    }

    await notifyHomeownerStatusChange({
      homeownerId: wo.homeowner_id,
      woId,
      newStatus,
      vendorOrgName,
    });

    // Cascade on decline — only for client_request/project_trade WOs
    if (
      newStatus === "declined" &&
      wo.source_type &&
      ["client_request", "project_trade"].includes(wo.source_type)
    ) {
      const { cascadeNextMatch } = await import("@/lib/vendor/match-vendor");
      const urgency = (wo.urgency ?? "routine") as "emergency" | "urgent" | "routine" | "flexible";

      // Mark current match attempt as declined
      await supabase
        .from("vendor_match_attempts")
        .update({ status: "declined", responded_at: new Date().toISOString() })
        .eq("work_order_id", woId)
        .eq("vendor_org_id", wo.vendor_org_id)
        .eq("status", "notified");

      const { advanced, vendorOrgId } = await cascadeNextMatch(woId, urgency);

      if (advanced && vendorOrgId) {
        // Update the WO with the new vendor
        const { notifyVendorNewWO } = await import("./home-wo-notifications");
        await notifyVendorNewWO({
          woId,
          vendorOrgId,
          trade: wo.trade ?? "",
          description: wo.description ?? "",
          urgency: wo.urgency ?? "routine",
        });
      }
    }

    // WO completion payment — calculate payout and set warranty
    if (newStatus === "completed" && wo.homeowner_id) {
      try {
        // Calculate vendor payout from materials total minus platform fee
        const { data: materials } = await supabase
          .from("vendor_wo_materials")
          .select("total")
          .eq("work_order_id", woId);

        const materialTotal = (materials ?? []).reduce(
          (sum: number, m: { total: number | null }) => sum + (Number(m.total) || 0),
          0
        );

        const platformFeePct = Number(wo.platform_fee_pct ?? 5);
        const platformFee = Math.round(materialTotal * (platformFeePct / 100) * 100) / 100;
        const vendorPayout = Math.round((materialTotal - platformFee) * 100) / 100;

        // Set warranty expiration from subscription plan
        let warrantyExpiresAt: string | null = null;
        if (wo.homeowner_property_id) {
          const { data: sub } = await supabase
            .from("subscriptions")
            .select("plan")
            .eq("user_id", wo.homeowner_id)
            .eq("property_id", wo.homeowner_property_id)
            .eq("status", "active")
            .maybeSingle();

          if (sub?.plan) {
            const { SUBSCRIPTION_PLANS } = await import("@/lib/subscription-plans");
            const planKey = sub.plan as keyof typeof SUBSCRIPTION_PLANS;
            const warrantyDays = SUBSCRIPTION_PLANS[planKey]?.warranty_days ?? 30;
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + warrantyDays);
            warrantyExpiresAt = expiry.toISOString();
          }
        }

        await supabase
          .from("vendor_work_orders")
          .update({
            platform_fee_amount: platformFee,
            vendor_payout_amount: vendorPayout,
            ...(warrantyExpiresAt ? { warranty_expires_at: warrantyExpiresAt } : {}),
          })
          .eq("id", woId);

        // Attempt Stripe transfer to vendor (if connected account exists)
        if (vendorPayout > 0 && wo.vendor_org_id) {
          const { isStripeConfigured } = await import("@/lib/stripe/stripe-client");
          if (isStripeConfigured()) {
            const { data: vendorOrg } = await supabase
              .from("vendor_organizations")
              .select("stripe_account_id")
              .eq("id", wo.vendor_org_id)
              .single();

            if (vendorOrg?.stripe_account_id) {
              const { transferToVendor } = await import("@/lib/stripe/transfer-to-vendor");
              await transferToVendor({
                stripeAccountId: vendorOrg.stripe_account_id,
                amountCents: Math.round(vendorPayout * 100),
                description: `Work order payment - ${wo.trade ?? "service"}`,
                woId,
              });
            }
          }
        }
      } catch (payErr) {
        console.error("WO completion payment error:", payErr);
      }
    }

    // Project trade activation — when a project WO completes, activate dependent trades
    if (newStatus === "completed" && wo.project_id && wo.sequence_order != null) {
      try {
        const { activateNextTrades } = await import("./home-projects");
        await activateNextTrades(wo.project_id, wo.sequence_order);
      } catch (err) {
        console.error("Failed to activate next project trades:", err);
      }
    }
  }

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
// Create Vendor Job (vendor-initiated, no PM)
// ============================================

export interface CreateVendorJobInput {
  property_name?: string;
  property_address?: string;
  unit_number?: string;
  description?: string;
  trade?: string;
  priority?: "normal" | "urgent" | "emergency";
  scheduled_date?: string;
  scheduled_time_start?: string;
  scheduled_time_end?: string;
  assigned_to?: string;
  tenant_name?: string;
  tenant_phone?: string;
  budget_type?: string;
  budget_amount?: number;
}

/** Create a new job directly by the vendor (not from a PM).
 *  Owner/Admin/Office Manager only. Tech cannot create jobs. */
export async function createVendorJob(
  input: CreateVendorJobInput
): Promise<{ data?: { id: string }; error?: string }> {
  const vendorAuth = await requireVendorRole();

  if (vendorAuth.role === "tech") {
    return { error: "Not authorized to create jobs" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Start as accepted (vendor is creating for themselves) or scheduled if date provided
  const initialStatus = input.scheduled_date ? "scheduled" : "accepted";

  const { data, error } = await supabase
    .from("vendor_work_orders")
    .insert({
      vendor_org_id: vendorAuth.vendor_org_id,
      status: initialStatus,
      property_name: input.property_name || null,
      property_address: input.property_address || null,
      unit_number: input.unit_number || null,
      description: input.description || null,
      trade: input.trade || null,
      priority: input.priority || "normal",
      scheduled_date: input.scheduled_date || null,
      scheduled_time_start: input.scheduled_time_start || null,
      scheduled_time_end: input.scheduled_time_end || null,
      assigned_to: input.assigned_to || null,
      tenant_name: input.tenant_name || null,
      tenant_phone: input.tenant_phone || null,
      budget_type: input.budget_type || null,
      budget_amount: input.budget_amount || null,
      source_type: "vendor_direct",
      lead_source: "vendor_self_created",
      origin_module: "vendor",
      updated_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create vendor job:", error);
    return { error: error.message };
  }

  await logActivity({
    entityType: "work_order",
    entityId: data.id,
    action: "created",
    metadata: { source: "vendor_direct", trade: input.trade },
  });

  return { data: { id: data.id } };
}

// ============================================
// Worker Assignment
// ============================================

/** Assign or unassign a worker to a job.
 *  Allowed: owner, admin, office_manager. Tech cannot assign. */
export async function assignWorkerToJob(
  woId: string,
  vendorUserId: string | null
): Promise<{ error?: string }> {
  const vendorAuth = await requireVendorRole();

  // Only owner/admin/office_manager can assign
  if (vendorAuth.role === "tech") {
    return { error: "Not authorized to assign workers" };
  }

  const supabase = await createClient();

  // Verify WO belongs to caller's org
  const { data: wo, error: woErr } = await supabase
    .from("vendor_work_orders")
    .select("id, vendor_org_id, assigned_to")
    .eq("id", woId)
    .single();

  if (woErr || !wo) {
    return { error: "Work order not found" };
  }

  if (wo.vendor_org_id !== vendorAuth.vendor_org_id) {
    return { error: "Not authorized for this work order" };
  }

  // If assigning (not unassigning), verify worker belongs to same org and is active
  if (vendorUserId) {
    const { data: worker, error: workerErr } = await supabase
      .from("vendor_users")
      .select("id, vendor_org_id, is_active")
      .eq("id", vendorUserId)
      .single();

    if (workerErr || !worker) {
      return { error: "Worker not found" };
    }

    if (worker.vendor_org_id !== vendorAuth.vendor_org_id) {
      return { error: "Worker does not belong to this organization" };
    }

    if (!worker.is_active) {
      return { error: "Worker is not active" };
    }
  }

  const { error: updateErr } = await supabase
    .from("vendor_work_orders")
    .update({ assigned_to: vendorUserId })
    .eq("id", woId);

  if (updateErr) {
    return { error: updateErr.message };
  }

  await logActivity({
    entityType: "work_order",
    entityId: woId,
    action: "worker_assigned",
    oldValue: wo.assigned_to ?? "unassigned",
    newValue: vendorUserId ?? "unassigned",
  });

  return {};
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

  // Compute cost variance if linked to catalog item
  let costVariance: number | null = null;
  if (input.catalog_item_id) {
    const { data: catalogItem } = await supabase
      .from("vendor_parts_catalog")
      .select("unit_cost")
      .eq("id", input.catalog_item_id)
      .single();
    if (catalogItem?.unit_cost != null) {
      costVariance = input.unit_cost - Number(catalogItem.unit_cost);
    }
  }

  const { data, error } = await supabase
    .from("vendor_wo_materials")
    .insert({
      work_order_id: input.work_order_id,
      description: input.description,
      quantity: input.quantity,
      unit_cost: input.unit_cost,
      total,
      created_by: user.id,
      catalog_item_id: input.catalog_item_id || null,
      cost_variance: costVariance,
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

  // Compute is_on_site if we have tech coords
  let isOnSite: boolean | null = null;
  if (input.lat != null && input.lng != null) {
    // Fetch property coords from the work order
    const { data: wo } = await supabase
      .from("vendor_work_orders")
      .select("property_lat, property_lng")
      .eq("id", input.work_order_id)
      .single();
    if (wo?.property_lat != null && wo?.property_lng != null) {
      const { computeOnSite } = await import("@/lib/vendor/geo-utils");
      isOnSite = computeOnSite(input.lat, input.lng, wo.property_lat, wo.property_lng);
    }
  }

  const { data, error } = await supabase
    .from("vendor_wo_time_entries")
    .insert({
      work_order_id: input.work_order_id,
      vendor_user_id: vendorAuth.id,
      clock_in: new Date().toISOString(),
      hourly_rate: input.hourly_rate ?? null,
      notes: input.notes ?? null,
      clock_in_lat: input.lat ?? null,
      clock_in_lng: input.lng ?? null,
      is_on_site: isOnSite,
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
  notes?: string,
  lat?: number,
  lng?: number,
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

  // Store clock-out GPS coords
  if (lat != null && lng != null) {
    updateData.clock_out_lat = lat;
    updateData.clock_out_lng = lng;
    // Recompute is_on_site with clock-out location if not already set
    const { data: wo } = await supabase
      .from("vendor_work_orders")
      .select("property_lat, property_lng")
      .eq("id", woId)
      .single();
    if (wo?.property_lat != null && wo?.property_lng != null) {
      const { computeOnSite } = await import("@/lib/vendor/geo-utils");
      const onSite = computeOnSite(lat, lng, wo.property_lat, wo.property_lng);
      // Only update is_on_site if it wasn't set at clock-in, or override with clock-out
      updateData.is_on_site = onSite;
    }
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

/** Edit a time entry — allows manual close or adjustment */
export async function editTimeEntry(
  entryId: string,
  updates: {
    clock_out?: string; // ISO timestamp for manual close
    notes?: string;
  }
): Promise<{ data?: VendorWoTimeEntry; error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  // Fetch the existing entry
  const { data: entry, error: fetchErr } = await supabase
    .from("vendor_wo_time_entries")
    .select("*")
    .eq("id", entryId)
    .single();

  if (fetchErr || !entry) {
    return { error: "Time entry not found" };
  }

  const updateData: Record<string, unknown> = {};

  if (updates.notes !== undefined) {
    updateData.notes = updates.notes;
  }

  if (updates.clock_out) {
    const clockOutTime = new Date(updates.clock_out);
    const clockInTime = new Date(entry.clock_in);

    // Ensure clock_out is after clock_in
    if (clockOutTime <= clockInTime) {
      return { error: "Clock out must be after clock in" };
    }

    updateData.clock_out = clockOutTime.toISOString();
    updateData.duration_minutes = Math.round(
      (clockOutTime.getTime() - clockInTime.getTime()) / 60000
    );
  }

  if (Object.keys(updateData).length === 0) {
    return { data: entry as VendorWoTimeEntry };
  }

  const { data, error } = await supabase
    .from("vendor_wo_time_entries")
    .update(updateData)
    .eq("id", entryId)
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity({
    entityType: "work_order",
    entityId: entry.work_order_id,
    action: "time_entry_edited",
    metadata: { entry_id: entryId },
  });

  return { data: data as VendorWoTimeEntry };
}

/** Delete a time entry */
export async function deleteTimeEntry(
  entryId: string
): Promise<{ error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  // Fetch entry to get WO ID for activity log
  const { data: entry } = await supabase
    .from("vendor_wo_time_entries")
    .select("work_order_id")
    .eq("id", entryId)
    .single();

  const { error } = await supabase
    .from("vendor_wo_time_entries")
    .delete()
    .eq("id", entryId);

  if (error) return { error: error.message };

  if (entry) {
    await logActivity({
      entityType: "work_order",
      entityId: entry.work_order_id,
      action: "time_entry_deleted",
      metadata: { entry_id: entryId },
    });
  }

  return {};
}

// ============================================
// Archive / Unarchive
// ============================================

/** Archive a work order — soft-hide from active surfaces */
export async function archiveWorkOrder(
  woId: string
): Promise<{ error?: string }> {
  const vendorAuth = await requireVendorRole();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Scoped fetch — only allow archiving WOs belonging to this org
  const { data: wo, error: fetchErr } = await supabase
    .from("vendor_work_orders")
    .select("id")
    .eq("id", woId)
    .eq("vendor_org_id", vendorAuth.vendor_org_id)
    .single();

  if (fetchErr || !wo) return { error: "Work order not found" };

  const { error } = await supabase
    .from("vendor_work_orders")
    .update({ archived_at: new Date().toISOString(), updated_by: user.id })
    .eq("id", woId)
    .eq("vendor_org_id", vendorAuth.vendor_org_id);

  if (error) return { error: error.message };

  await logActivity({
    entityType: "work_order",
    entityId: woId,
    action: "work_order_archived",
  });

  // Revalidate all affected surfaces
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/vendor/jobs");
  revalidatePath("/pro/jobs");
  revalidatePath(`/vendor/jobs/${woId}`);
  revalidatePath(`/pro/jobs/${woId}`);
  revalidatePath("/vendor");
  revalidatePath("/pro");

  return {};
}

/** Unarchive a work order — restore to active surfaces */
export async function unarchiveWorkOrder(
  woId: string
): Promise<{ error?: string }> {
  const vendorAuth = await requireVendorRole();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Scoped fetch
  const { data: wo, error: fetchErr } = await supabase
    .from("vendor_work_orders")
    .select("id")
    .eq("id", woId)
    .eq("vendor_org_id", vendorAuth.vendor_org_id)
    .single();

  if (fetchErr || !wo) return { error: "Work order not found" };

  const { error } = await supabase
    .from("vendor_work_orders")
    .update({ archived_at: null, updated_by: user.id })
    .eq("id", woId)
    .eq("vendor_org_id", vendorAuth.vendor_org_id);

  if (error) return { error: error.message };

  await logActivity({
    entityType: "work_order",
    entityId: woId,
    action: "work_order_unarchived",
  });

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/vendor/jobs");
  revalidatePath("/pro/jobs");
  revalidatePath(`/vendor/jobs/${woId}`);
  revalidatePath(`/pro/jobs/${woId}`);
  revalidatePath("/vendor");
  revalidatePath("/pro");

  return {};
}

// ============================================
// Workiz Enhancements — Tags, Job Type, Sub Status, Reschedule
// ============================================

/** Helper: fetch org settings */
async function getOrgSettings(vendorOrgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vendor_organizations")
    .select("settings")
    .eq("id", vendorOrgId)
    .single();
  return (data?.settings ?? {}) as Record<string, unknown>;
}

/** Update job tags — normalized on client + DB trigger */
export async function updateJobTags(
  woId: string,
  tags: string[]
): Promise<{ error?: string }> {
  const vendorAuth = await requireVendorRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Client-side normalization (DB trigger also normalizes)
  const normalized = [...new Set(
    tags
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0 && t.length <= 50)
  )].slice(0, 20);

  const { error } = await supabase
    .from("vendor_work_orders")
    .update({
      tags: normalized,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", woId)
    .eq("vendor_org_id", vendorAuth.vendor_org_id);

  if (error) return { error: error.message };

  await logActivity({
    entityType: "work_order",
    entityId: woId,
    action: "tags_updated",
    metadata: { tags: normalized },
  });

  return {};
}

/** Update job type — validated against org settings */
export async function updateJobType(
  woId: string,
  jobType: string
): Promise<{ error?: string }> {
  const vendorAuth = await requireVendorRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Validate against org settings
  const settings = await getOrgSettings(vendorAuth.vendor_org_id);
  const allowedTypes = (settings.job_types as string[]) ?? [];
  if (!allowedTypes.includes(jobType)) {
    return { error: `Invalid job type: "${jobType}". Allowed: ${allowedTypes.join(", ")}` };
  }

  const { error } = await supabase
    .from("vendor_work_orders")
    .update({
      job_type: jobType,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", woId)
    .eq("vendor_org_id", vendorAuth.vendor_org_id);

  if (error) return { error: error.message };

  await logActivity({
    entityType: "work_order",
    entityId: woId,
    action: "job_type_updated",
    newValue: jobType,
  });

  return {};
}

/** Update sub-status — validated against org settings. null clears it. */
export async function updateSubStatus(
  woId: string,
  subStatus: string | null
): Promise<{ error?: string }> {
  const vendorAuth = await requireVendorRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (subStatus !== null) {
    const settings = await getOrgSettings(vendorAuth.vendor_org_id);
    const allowedStatuses = (settings.sub_statuses as string[]) ?? [];
    if (!allowedStatuses.includes(subStatus)) {
      return { error: `Invalid sub-status: "${subStatus}". Allowed: ${allowedStatuses.join(", ")}` };
    }
  }

  const { error } = await supabase
    .from("vendor_work_orders")
    .update({
      sub_status: subStatus,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", woId)
    .eq("vendor_org_id", vendorAuth.vendor_org_id);

  if (error) return { error: error.message };

  await logActivity({
    entityType: "work_order",
    entityId: woId,
    action: "sub_status_updated",
    newValue: subStatus ?? "cleared",
  });

  return {};
}

// ============================================
// Smart Scheduler
// ============================================

/** Preview smart schedule — groups unscheduled jobs by zip and proposes times.
 *  Owner/Admin/Office Manager only. */
export async function getSmartSchedulePreview(
  targetDate: string,
  options?: { durationMinutes?: number; maxJobsPerDay?: number }
): Promise<{ data: SmartScheduleResult | null; error?: string }> {
  const vendorAuth = await requireVendorRole();

  if (vendorAuth.role === "tech") {
    return { data: null, error: "Not authorized" };
  }

  const supabase = await createClient();

  // Fetch unscheduled jobs (no date or no time) — exclude archived
  const { data: rawUnscheduled, error: unschedErr } = await supabase
    .from("vendor_work_orders")
    .select("*")
    .eq("vendor_org_id", vendorAuth.vendor_org_id)
    .is("archived_at", null)
    .in("status", SCHEDULABLE_STATUSES as string[])
    .or("scheduled_date.is.null,scheduled_time_start.is.null");

  if (unschedErr) {
    return { data: null, error: unschedErr.message };
  }

  // Fetch existing scheduled jobs for the target date — exclude archived
  const { data: rawScheduled, error: schedErr } = await supabase
    .from("vendor_work_orders")
    .select("*")
    .eq("vendor_org_id", vendorAuth.vendor_org_id)
    .is("archived_at", null)
    .eq("scheduled_date", targetDate)
    .not("scheduled_time_start", "is", null);

  if (schedErr) {
    return { data: null, error: schedErr.message };
  }

  // Fetch org working hours
  const orgSettings = await getOrgSettings(vendorAuth.vendor_org_id);
  const wh = orgSettings.working_hours as { start?: string; end?: string } | undefined;
  const workingHours = {
    start: wh?.start ?? "08:00",
    end: wh?.end ?? "17:00",
  };

  // Convert to ScheduleJob
  const unscheduledJobs = (rawUnscheduled ?? []).map((wo: VendorWorkOrder) =>
    toScheduleJob(wo)
  );
  const existingSchedule = (rawScheduled ?? []).map((wo: VendorWorkOrder) =>
    toScheduleJob(wo)
  );

  const result = computeSmartSchedule({
    unscheduledJobs,
    existingSchedule,
    targetDate,
    workingHours,
    defaultDurationMinutes: options?.durationMinutes ?? 60,
    maxJobsPerDay: options?.maxJobsPerDay,
  });

  return { data: result };
}

/** Apply smart schedule proposals — batch-update jobs with proposed times.
 *  Owner/Admin/Office Manager only. */
export async function applySmartSchedule(
  proposals: { jobId: string; scheduledDate: string; scheduledTime: string; endTime: string }[]
): Promise<{ applied: number; errors: string[] }> {
  const vendorAuth = await requireVendorRole();

  if (vendorAuth.role === "tech") {
    return { applied: 0, errors: ["Not authorized"] };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { applied: 0, errors: ["Not authenticated"] };

  const errors: string[] = [];
  let applied = 0;

  // Process each proposal
  for (const p of proposals) {
    const { error } = await supabase
      .from("vendor_work_orders")
      .update({
        scheduled_date: p.scheduledDate,
        scheduled_time_start: p.scheduledTime,
        scheduled_time_end: p.endTime,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", p.jobId)
      .eq("vendor_org_id", vendorAuth.vendor_org_id);

    if (error) {
      errors.push(`${p.jobId}: ${error.message}`);
    } else {
      applied++;
    }
  }

  // Log activity
  if (applied > 0) {
    await logActivity({
      entityType: "vendor_org",
      entityId: vendorAuth.vendor_org_id,
      action: "smart_schedule_applied",
      metadata: {
        jobCount: applied,
        targetDate: proposals[0]?.scheduledDate,
        totalProposed: proposals.length,
      },
    });
  }

  return { applied, errors };
}

/** Reschedule a job — validate end > start, log audit metadata */
export async function rescheduleJob(
  woId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<{ error?: string }> {
  const vendorAuth = await requireVendorRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Validate end > start
  if (endTime && startTime && endTime <= startTime) {
    return { error: "End time must be after start time" };
  }

  // Get previous schedule values for audit
  const { data: wo } = await supabase
    .from("vendor_work_orders")
    .select("scheduled_date, scheduled_time_start, scheduled_time_end, vendor_org_id")
    .eq("id", woId)
    .single();

  if (!wo) return { error: "Work order not found" };
  if (wo.vendor_org_id !== vendorAuth.vendor_org_id) return { error: "Not authorized" };

  const { error } = await supabase
    .from("vendor_work_orders")
    .update({
      scheduled_date: date,
      scheduled_time_start: startTime,
      scheduled_time_end: endTime,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", woId);

  if (error) return { error: error.message };

  await logActivity({
    entityType: "work_order",
    entityId: woId,
    action: "rescheduled",
    metadata: {
      rescheduled_by: user.id,
      rescheduled_at: new Date().toISOString(),
      previous_scheduled_date: wo.scheduled_date,
      previous_time_start: wo.scheduled_time_start,
      previous_time_end: wo.scheduled_time_end,
      new_date: date,
      new_time_start: startTime,
      new_time_end: endTime,
    },
  });

  return {};
}
