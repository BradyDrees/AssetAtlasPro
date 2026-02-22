"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePmRole, logActivity } from "@/lib/vendor/role-helpers";
import type { VendorEstimate } from "@/lib/vendor/estimate-types";
import type { VendorEstimateSection, VendorEstimateItem } from "@/lib/vendor/estimate-types";

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
