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
