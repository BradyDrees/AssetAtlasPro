"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePmRole, logActivity } from "@/lib/vendor/role-helpers";
import type { CreateWorkOrderInput } from "@/lib/vendor/work-order-types";
import type { VendorWorkOrder } from "@/lib/vendor/work-order-types";

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

  return { data: wo };
}

/** PM gets their work orders */
export async function getPmWorkOrders(): Promise<{
  data: VendorWorkOrder[];
  error?: string;
}> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("vendor_work_orders")
    .select("*")
    .eq("pm_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as VendorWorkOrder[] };
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
