"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePmRole, logActivity } from "@/lib/vendor/role-helpers";
import type { CreateWorkOrderInput } from "@/lib/vendor/work-order-types";
import type { VendorWorkOrder } from "@/lib/vendor/work-order-types";
import { createContextualThread, syncContactsFromWorkOrder } from "@/app/actions/messaging";
import { getEntityEvents } from "@/lib/platform/domain-events";
import type { DomainEvent } from "@/lib/platform/domain-events";
import { transitionWorkOrder } from "@/lib/vendor/wo-state-machine";
import type { WoStatus } from "@/lib/vendor/types";
import {
  dispatchFromFinding,
  bulkDispatchFindings,
  type FindingSnapshot,
  type DispatchResult,
} from "@/lib/services/dispatch-service";

// ============================================
// PM creates a work order for a vendor
// ============================================

export async function createWorkOrder(
  input: CreateWorkOrderInput
): Promise<{ data?: VendorWorkOrder; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify the PM has an active relationship with this vendor org
  const { data: relationship } = await supabase
    .from("vendor_pm_relationships")
    .select("id")
    .eq("vendor_org_id", input.vendor_org_id)
    .eq("pm_user_id", user.id)
    .eq("status", "active")
    .single();

  if (!relationship) {
    return { error: "No active relationship with this vendor" };
  }

  const { data, error } = await supabase
    .from("vendor_work_orders")
    .insert({
      vendor_org_id: input.vendor_org_id,
      assigned_to: input.assigned_to || null,
      pm_user_id: user.id,
      property_name: input.property_name || null,
      property_address: input.property_address || null,
      unit_number: input.unit_number || null,
      description: input.description || null,
      pm_notes: input.pm_notes || null,
      access_notes: input.access_notes || null,
      tenant_name: input.tenant_name || null,
      tenant_phone: input.tenant_phone || null,
      tenant_language: input.tenant_language || null,
      trade: input.trade || null,
      priority: input.priority || "normal",
      budget_type: input.budget_type || null,
      budget_amount: input.budget_amount || null,
      scheduled_date: input.scheduled_date || null,
      scheduled_time_start: input.scheduled_time_start || null,
      scheduled_time_end: input.scheduled_time_end || null,
      source_type: "pm_routed",
      lead_source: "pm_assignment",
      origin_module: "operate",
      status: "assigned",
      updated_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create work order:", error);
    return { error: error.message };
  }

  const wo = data as VendorWorkOrder;

  // Create notification for vendor org members
  // Get all active vendor users in the org to notify
  const { data: vendorUsers } = await supabase
    .from("vendor_users")
    .select("user_id")
    .eq("vendor_org_id", input.vendor_org_id)
    .eq("is_active", true);

  if (vendorUsers) {
    const notifications = vendorUsers.map((vu) => ({
      user_id: vu.user_id,
      type: "new_work_order",
      title: "New work order received",
      body: `${input.property_name || "Property"}: ${input.description || "New assignment"}`,
      reference_type: "work_order",
      reference_id: wo.id,
    }));

    await supabase.from("vendor_notifications").insert(notifications);
  }

  // Log activity
  await logActivity({
    entityType: "work_order",
    entityId: wo.id,
    action: "created",
    actorRole: "pm",
    metadata: {
      property: input.property_name,
      trade: input.trade,
      priority: input.priority,
      vendor_org_id: input.vendor_org_id,
    },
  });

  // ── Communications: auto-create contextual thread ──
  // Collect participant auth UUIDs: PM + assigned vendor user (if set)
  const participantIds: string[] = [user.id];

  // input.assigned_to is vendor_users.id (table PK), NOT the auth UUID.
  // Resolve the actual auth user_id from vendor_users before adding as participant.
  if (input.assigned_to) {
    const { data: vendorUser } = await supabase
      .from("vendor_users")
      .select("user_id")
      .eq("id", input.assigned_to)
      .single();

    if (vendorUser?.user_id) {
      participantIds.push(vendorUser.user_id);
    }
  }

  // Also add all active vendor org members as participants
  if (vendorUsers) {
    for (const vu of vendorUsers) {
      if (!participantIds.includes(vu.user_id)) {
        participantIds.push(vu.user_id);
      }
    }
  }

  try {
    await createContextualThread({
      thread_type: "work_order",
      linked_item_id: wo.id,
      participant_ids: participantIds,
      title: `WO: ${input.property_name || "Work Order"}`,
    });
    // Sync contacts so PM ↔ vendor can DM later
    await syncContactsFromWorkOrder(wo.id);
  } catch (err) {
    // Non-fatal — WO was already created successfully
    console.error("Failed to create messaging thread for WO:", err);
  }

  return { data: wo };
}

/** PM gets their work orders */
export async function getPmWorkOrders(
  page = 1,
  pageSize = 25
): Promise<{
  data: VendorWorkOrder[];
  total: number;
  page: number;
  pageSize: number;
  error?: string;
}> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: [], total: 0, page: 1, pageSize: 25, error: "Not authenticated" };

  const safePage = Math.max(1, page);
  const safeSize = Math.min(Math.max(1, pageSize), 100);
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;

  const { data, count, error } = await supabase
    .from("vendor_work_orders")
    .select("*", { count: "exact" })
    .eq("pm_user_id", user.id)
    .range(from, to)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [], total: 0, page: safePage, pageSize: safeSize, error: error.message };
  }

  return { data: (data ?? []) as VendorWorkOrder[], total: count ?? 0, page: safePage, pageSize: safeSize };
}

/** PM updates work order via SECURITY DEFINER RPC (Correction 3) */
export async function pmUpdateWorkOrder(
  woId: string,
  updates: {
    scheduled_date?: string;
    scheduled_time_start?: string;
    scheduled_time_end?: string;
    budget_type?: string;
    budget_amount?: number;
    pm_notes?: string;
    access_notes?: string;
    priority?: string;
  }
): Promise<{ error?: string }> {
  await requirePmRole();
  const supabase = await createClient();

  const { error } = await supabase.rpc("pm_update_work_order", {
    p_wo_id: woId,
    p_scheduled_date: updates.scheduled_date || null,
    p_scheduled_time_start: updates.scheduled_time_start || null,
    p_scheduled_time_end: updates.scheduled_time_end || null,
    p_budget_type: updates.budget_type || null,
    p_budget_amount: updates.budget_amount || null,
    p_pm_notes: updates.pm_notes || null,
    p_access_notes: updates.access_notes || null,
    p_priority: updates.priority || null,
  });

  if (error) {
    console.error("PM update WO failed:", error);
    return { error: error.message };
  }

  return {};
}

/** Get connected vendors for the PM */
export async function getPmVendors(): Promise<{
  data: Array<{
    id: string;
    vendor_org_id: string;
    vendor_name: string;
    trades: string[];
    status: string;
  }>;
  error?: string;
}> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("vendor_pm_relationships")
    .select(`
      id,
      vendor_org_id,
      status,
      vendor_organizations (
        name,
        trades
      )
    `)
    .eq("pm_user_id", user.id)
    .eq("status", "active");

  if (error) {
    return { data: [], error: error.message };
  }

  const mapped = (data ?? []).map((r: Record<string, unknown>) => {
    const org = r.vendor_organizations as Record<string, unknown> | null;
    return {
      id: r.id as string,
      vendor_org_id: r.vendor_org_id as string,
      vendor_name: (org?.name as string) || "Unknown",
      trades: (org?.trades as string[]) || [],
      status: r.status as string,
    };
  });

  return { data: mapped };
}

// ============================================
// PM reschedules a work order
// ============================================

export async function rescheduleJobAsPm(
  woId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<{ ok: boolean; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  // Validate end > start
  if (endTime && startTime && endTime <= startTime) {
    return { ok: false, error: "End time must be after start time" };
  }

  // Verify PM owns/created this work order
  const { data: wo } = await supabase
    .from("vendor_work_orders")
    .select("id, pm_user_id, scheduled_date, scheduled_time_start, scheduled_time_end")
    .eq("id", woId)
    .eq("pm_user_id", user.id)
    .single();

  if (!wo) return { ok: false, error: "Work order not found or not authorized" };

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

  if (error) return { ok: false, error: error.message };

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

  return { ok: true };
}

// ============================================
// Split Fetchers for WO Detail Page
// ============================================

/** WO summary with vendor org name + assigned user */
export async function getPmWorkOrderSummary(woId: string): Promise<{
  data?: VendorWorkOrder & {
    vendor_name: string;
    assigned_user_name: string | null;
  };
  error?: string;
}> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: wo, error } = await supabase
    .from("vendor_work_orders")
    .select("*")
    .eq("id", woId)
    .eq("pm_user_id", user.id)
    .single();

  if (error || !wo) return { error: error?.message ?? "Work order not found" };

  // Fetch vendor org name
  const { data: vendorOrg } = await supabase
    .from("vendor_organizations")
    .select("name")
    .eq("id", wo.vendor_org_id)
    .single();

  // Fetch assigned user name if set
  let assignedUserName: string | null = null;
  if (wo.assigned_to) {
    const { data: vendorUser } = await supabase
      .from("vendor_users")
      .select("user_id")
      .eq("id", wo.assigned_to)
      .single();
    if (vendorUser?.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", vendorUser.user_id)
        .single();
      assignedUserName = profile?.full_name ?? null;
    }
  }

  return {
    data: {
      ...(wo as VendorWorkOrder),
      vendor_name: vendorOrg?.name ?? "Unknown Vendor",
      assigned_user_name: assignedUserName,
    },
  };
}

/** Paginated photos for a WO (PM view, capped at 50) */
export async function getPmWorkOrderPhotos(woId: string): Promise<{
  data: Array<{
    id: string;
    storage_path: string;
    caption: string | null;
    photo_type: string;
    created_at: string;
    url: string;
  }>;
  error?: string;
}> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  // Verify PM owns this WO
  const { data: wo } = await supabase
    .from("vendor_work_orders")
    .select("id")
    .eq("id", woId)
    .eq("pm_user_id", user.id)
    .single();
  if (!wo) return { data: [], error: "Not authorized" };

  const { data: photos, error } = await supabase
    .from("work_order_photos")
    .select("id, storage_path, caption, photo_type, created_at")
    .eq("work_order_id", woId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return { data: [], error: error.message };

  // Generate signed URLs
  const withUrls = await Promise.all(
    (photos ?? []).map(async (p) => {
      const { data: signed } = await supabase.storage
        .from("dd-captures")
        .createSignedUrl(p.storage_path, 3600);
      return { ...p, url: signed?.signedUrl ?? "" };
    })
  );

  return { data: withUrls };
}

/** Time entries for a WO */
export async function getPmWorkOrderTimeLog(woId: string): Promise<{
  data: Array<{
    id: string;
    vendor_user_id: string | null;
    worker_name: string | null;
    clock_in: string;
    clock_out: string | null;
    duration_minutes: number | null;
    hourly_rate: number | null;
    notes: string | null;
    is_on_site: boolean | null;
  }>;
  error?: string;
}> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  // Verify PM owns this WO
  const { data: wo } = await supabase
    .from("vendor_work_orders")
    .select("id")
    .eq("id", woId)
    .eq("pm_user_id", user.id)
    .single();
  if (!wo) return { data: [], error: "Not authorized" };

  const { data: entries, error } = await supabase
    .from("vendor_wo_time_entries")
    .select("id, vendor_user_id, clock_in, clock_out, duration_minutes, hourly_rate, notes, is_on_site")
    .eq("work_order_id", woId)
    .order("clock_in", { ascending: false });

  if (error) return { data: [], error: error.message };

  // Resolve worker names
  const withNames = await Promise.all(
    (entries ?? []).map(async (e) => {
      let workerName: string | null = null;
      if (e.vendor_user_id) {
        const { data: vu } = await supabase
          .from("vendor_users")
          .select("user_id")
          .eq("id", e.vendor_user_id)
          .single();
        if (vu?.user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", vu.user_id)
            .single();
          workerName = profile?.full_name ?? null;
        }
      }
      return { ...e, worker_name: workerName };
    })
  );

  return { data: withNames };
}

/** Linked estimate + invoice for a WO */
export async function getPmWorkOrderFinancials(woId: string): Promise<{
  data: {
    estimate: {
      id: string;
      status: string;
      total: number;
      created_at: string;
    } | null;
    invoice: {
      id: string;
      status: string;
      total: number;
      created_at: string;
    } | null;
    materials_total: number;
    labor_total: number;
  };
  error?: string;
}> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      data: { estimate: null, invoice: null, materials_total: 0, labor_total: 0 },
      error: "Not authenticated",
    };

  // Verify PM owns this WO
  const { data: wo } = await supabase
    .from("vendor_work_orders")
    .select("id")
    .eq("id", woId)
    .eq("pm_user_id", user.id)
    .single();
  if (!wo)
    return {
      data: { estimate: null, invoice: null, materials_total: 0, labor_total: 0 },
      error: "Not authorized",
    };

  // Fetch estimate
  const { data: estimate } = await supabase
    .from("vendor_estimates")
    .select("id, status, total, created_at")
    .eq("work_order_id", woId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Fetch invoice
  const { data: invoice } = await supabase
    .from("vendor_invoices")
    .select("id, status, total, created_at")
    .eq("work_order_id", woId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Materials total
  const { data: materials } = await supabase
    .from("vendor_wo_materials")
    .select("total")
    .eq("work_order_id", woId);
  const materialsTotal = (materials ?? []).reduce(
    (sum, m) => sum + (Number(m.total) || 0),
    0
  );

  // Labor total from time entries
  const { data: timeEntries } = await supabase
    .from("vendor_wo_time_entries")
    .select("duration_minutes, hourly_rate")
    .eq("work_order_id", woId);
  const laborTotal = (timeEntries ?? []).reduce((sum, t) => {
    const hours = (t.duration_minutes ?? 0) / 60;
    return sum + hours * (t.hourly_rate ?? 0);
  }, 0);

  return {
    data: {
      estimate: estimate ?? null,
      invoice: invoice ?? null,
      materials_total: materialsTotal,
      labor_total: laborTotal,
    },
  };
}

/** Activity timeline from domain events */
export async function getPmWorkOrderActivity(woId: string): Promise<{
  data: DomainEvent[];
  error?: string;
}> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  // Verify PM owns this WO
  const { data: wo } = await supabase
    .from("vendor_work_orders")
    .select("id")
    .eq("id", woId)
    .eq("pm_user_id", user.id)
    .single();
  if (!wo) return { data: [], error: "Not authorized" };

  const events = await getEntityEvents("work_order", woId, 20);
  return { data: events };
}

// ============================================
// PM Status Transitions (via canonical state machine)
// ============================================

export async function pmTransitionWorkOrder(
  woId: string,
  newStatus: WoStatus,
  metadata?: {
    scheduledDate?: string;
    scheduledTimeStart?: string;
    scheduledTimeEnd?: string;
    extra?: Record<string, unknown>;
  }
): Promise<{ success: boolean; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Verify PM owns this WO
  const { data: wo } = await supabase
    .from("vendor_work_orders")
    .select("id, pm_user_id")
    .eq("id", woId)
    .eq("pm_user_id", user.id)
    .single();
  if (!wo) return { success: false, error: "Not authorized" };

  const result = await transitionWorkOrder(woId, newStatus, "pm", {
    actorUserId: user.id,
    pmUserId: user.id,
    scheduledDate: metadata?.scheduledDate,
    scheduledTimeStart: metadata?.scheduledTimeStart,
    scheduledTimeEnd: metadata?.scheduledTimeEnd,
    extra: metadata?.extra,
  });

  return { success: result.success, error: result.error };
}

// ============================================
// Dispatch: Finding → WO
// ============================================

/** PM dispatches a single finding as a work order */
export async function dispatchFindingAsWo(params: {
  findingId: string;
  finding: FindingSnapshot;
  vendorOrgId?: string;
  propertyName?: string;
  propertyAddress?: string;
  unitNumber?: string;
  force?: boolean;
}): Promise<DispatchResult> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  return dispatchFromFinding({
    ...params,
    pmUserId: user.id,
    actorUserId: user.id,
  });
}

/** PM bulk-dispatches multiple findings as work orders */
export async function bulkDispatchFindingsAsWo(params: {
  findings: Array<{ id: string; finding: FindingSnapshot }>;
  vendorOrgId?: string;
  propertyName?: string;
  propertyAddress?: string;
}): Promise<DispatchResult[]> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  return bulkDispatchFindings({
    ...params,
    pmUserId: user.id,
    actorUserId: user.id,
  });
}
