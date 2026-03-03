"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePmRole, logActivity } from "@/lib/vendor/role-helpers";
import type { VendorEstimate } from "@/lib/vendor/estimate-types";
import type { VendorEstimateSection, VendorEstimateItem } from "@/lib/vendor/estimate-types";
import { createWorkOrder, pmUpdateWorkOrder } from "@/app/actions/pm-work-orders";
import type { CreateWorkOrderInput } from "@/lib/vendor/work-order-types";
import type { WoBudgetType } from "@/lib/vendor/types";

// ============================================
// PM Estimate Queries
// ============================================

/** Get all estimates sent to this PM */
export async function getPmEstimates(filters?: {
  status?: string | string[];
}): Promise<{ data: VendorEstimate[]; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: [], error: "Not authenticated" };

  let query = supabase
    .from("vendor_estimates")
    .select("*")
    .eq("pm_user_id", user.id)
    .neq("status", "draft") // PM shouldn't see drafts
    .order("created_at", { ascending: false });

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in("status", filters.status);
    } else {
      query = query.eq("status", filters.status);
    }
  }

  const { data, error } = await query;
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as VendorEstimate[] };
}

/** Get estimate detail for PM review */
export async function getPmEstimateDetail(estimateId: string): Promise<{
  estimate: VendorEstimate | null;
  sections: (VendorEstimateSection & { items: VendorEstimateItem[] })[];
  error?: string;
}> {
  await requirePmRole();
  const supabase = await createClient();

  const { data: estimate, error: estError } = await supabase
    .from("vendor_estimates")
    .select("*")
    .eq("id", estimateId)
    .single();

  if (estError || !estimate) {
    return { estimate: null, sections: [], error: estError?.message || "Not found" };
  }

  const { data: sectionsData } = await supabase
    .from("vendor_estimate_sections")
    .select("*")
    .eq("estimate_id", estimateId)
    .order("sort_order", { ascending: true });

  const sections: (VendorEstimateSection & { items: VendorEstimateItem[] })[] = [];

  for (const section of (sectionsData ?? []) as VendorEstimateSection[]) {
    const { data: items } = await supabase
      .from("vendor_estimate_items")
      .select("*")
      .eq("section_id", section.id)
      .order("sort_order", { ascending: true });

    sections.push({
      ...section,
      items: (items ?? []) as VendorEstimateItem[],
    });
  }

  return { estimate: estimate as VendorEstimate, sections };
}

// ============================================
// PM Estimate Actions
// ============================================

/** Approve an estimate */
export async function approveEstimate(
  estimateId: string
): Promise<{ error?: string }> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: est } = await supabase
    .from("vendor_estimates")
    .select("status, vendor_org_id")
    .eq("id", estimateId)
    .single();

  if (!est) return { error: "Estimate not found" };

  const validFrom = ["sent", "pm_reviewing", "with_owner"];
  if (!validFrom.includes(est.status)) {
    return { error: `Cannot approve from status "${est.status}"` };
  }

  await supabase
    .from("vendor_estimates")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", estimateId);

  // Notify vendor org members
  const { data: vendorUsers } = await supabase
    .from("vendor_users")
    .select("user_id")
    .eq("vendor_org_id", est.vendor_org_id)
    .eq("is_active", true);

  if (vendorUsers) {
    const notifications = vendorUsers.map((vu) => ({
      user_id: vu.user_id,
      type: "estimate_approved",
      title: "Estimate approved",
      body: "Your estimate has been approved by the PM",
      reference_type: "estimate",
      reference_id: estimateId,
    }));
    await supabase.from("vendor_notifications").insert(notifications);
  }

  await logActivity({
    entityType: "estimate",
    entityId: estimateId,
    action: "approved",
    actorRole: "pm",
    oldValue: est.status,
    newValue: "approved",
  });

  // --- Auto-conversion: link or create work order ---
  // Best-effort: estimate is already approved at this point.
  // Conversion failures should not block the approval response.
  const { data: fullEst } = await supabase
    .from("vendor_estimates")
    .select(
      "id, status, total, work_order_id, vendor_org_id, pm_user_id, property_name, property_address, unit_info, title, description"
    )
    .eq("id", estimateId)
    .single();

  if (!fullEst) {
    // Estimate is approved already; conversion is best-effort
    return {};
  }

  if (fullEst.work_order_id) {
    // Scenario A: Update existing WO with approved budget (RPC)
    const updateResult = await pmUpdateWorkOrder(fullEst.work_order_id, {
      budget_type: "approved" as WoBudgetType,
      budget_amount: Number(fullEst.total) || 0,
    });

    if (!updateResult?.error) {
      await logActivity({
        entityType: "work_order",
        entityId: fullEst.work_order_id,
        action: "budget_approved_from_estimate",
        actorRole: "pm",
        metadata: { estimate_id: estimateId, approved_amount: fullEst.total },
      });
    }

    return {};
  }

  // Scenario B: Create new WO via createWorkOrder()
  // Inherits PM auth + vendor_pm_relationships gating + notifications + logging
  const woInput: CreateWorkOrderInput = {
    vendor_org_id: fullEst.vendor_org_id,
    property_name: fullEst.property_name || undefined,
    property_address: fullEst.property_address || undefined,
    unit_number: fullEst.unit_info || undefined,
    description:
      [fullEst.title, fullEst.description].filter(Boolean).join(" — ") ||
      undefined,
    budget_type: "approved" as WoBudgetType,
    budget_amount: Number(fullEst.total) || 0,
    priority: "normal",
  };

  const createResult = await createWorkOrder(woInput);
  const newWoId = createResult?.data?.id;

  if (newWoId) {
    // Idempotent link: only set work_order_id if still NULL
    const { data: linked } = await supabase
      .from("vendor_estimates")
      .update({ work_order_id: newWoId })
      .eq("id", estimateId)
      .is("work_order_id", null)
      .select("id");

    if (!linked || linked.length === 0) {
      // Race: someone else linked first. Log and stop.
      await logActivity({
        entityType: "estimate",
        entityId: estimateId,
        action: "conversion_race_condition",
        actorRole: "pm",
        metadata: { attempted_wo_id: newWoId },
      });
      return {};
    }

    // createWorkOrder() already notifies vendor about a new WO.
    // Add a more specific notification referencing the estimate conversion.
    if (vendorUsers && vendorUsers.length > 0) {
      const property = fullEst.property_name || "a property";
      const jobNotifs = vendorUsers.map(
        (vu: { user_id: string }) => ({
          user_id: vu.user_id,
          type: "job_created_from_estimate",
          title: "Job created from estimate",
          body: `Your approved estimate for ${property} is now an active job`,
          reference_type: "work_order" as const,
          reference_id: newWoId,
        })
      );
      await supabase.from("vendor_notifications").insert(jobNotifs);
    }

    await logActivity({
      entityType: "work_order",
      entityId: newWoId,
      action: "created_from_estimate",
      actorRole: "pm",
      metadata: { estimate_id: estimateId, property: fullEst.property_name },
    });

    return {};
  }

  // createWorkOrder failed (likely vendor_pm_relationships gating). Approval stands.
  // Vendor can use manual Convert to Job fallback.
  await logActivity({
    entityType: "estimate",
    entityId: estimateId,
    action: "auto_conversion_failed",
    actorRole: "pm",
    metadata: { error: createResult?.error || "createWorkOrder failed" },
  });

  return {};
}

/** Decline an estimate */
export async function declineEstimate(
  estimateId: string
): Promise<{ error?: string }> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: est } = await supabase
    .from("vendor_estimates")
    .select("status, vendor_org_id")
    .eq("id", estimateId)
    .single();

  if (!est) return { error: "Estimate not found" };

  await supabase
    .from("vendor_estimates")
    .update({
      status: "declined",
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", estimateId);

  // Notify vendor
  const { data: vendorUsers } = await supabase
    .from("vendor_users")
    .select("user_id")
    .eq("vendor_org_id", est.vendor_org_id)
    .eq("is_active", true);

  if (vendorUsers) {
    const notifications = vendorUsers.map((vu) => ({
      user_id: vu.user_id,
      type: "estimate_declined",
      title: "Estimate declined",
      body: "Your estimate has been declined",
      reference_type: "estimate",
      reference_id: estimateId,
    }));
    await supabase.from("vendor_notifications").insert(notifications);
  }

  await logActivity({
    entityType: "estimate",
    entityId: estimateId,
    action: "declined",
    actorRole: "pm",
    oldValue: est.status,
    newValue: "declined",
  });

  return {};
}

/** Request changes on an estimate */
export async function requestEstimateChanges(
  estimateId: string,
  notes: string
): Promise<{ error?: string }> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: est } = await supabase
    .from("vendor_estimates")
    .select("status, vendor_org_id")
    .eq("id", estimateId)
    .single();

  if (!est) return { error: "Estimate not found" };

  await supabase
    .from("vendor_estimates")
    .update({
      status: "changes_requested",
      change_request_notes: notes,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", estimateId);

  // Notify vendor
  const { data: vendorUsers } = await supabase
    .from("vendor_users")
    .select("user_id")
    .eq("vendor_org_id", est.vendor_org_id)
    .eq("is_active", true);

  if (vendorUsers) {
    const notifications = vendorUsers.map((vu) => ({
      user_id: vu.user_id,
      type: "estimate_changes_requested",
      title: "Changes requested on estimate",
      body: notes,
      reference_type: "estimate",
      reference_id: estimateId,
    }));
    await supabase.from("vendor_notifications").insert(notifications);
  }

  await logActivity({
    entityType: "estimate",
    entityId: estimateId,
    action: "changes_requested",
    actorRole: "pm",
    oldValue: est.status,
    newValue: "changes_requested",
    metadata: { notes },
  });

  return {};
}
