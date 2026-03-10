"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { emitEvent } from "@/lib/platform/domain-events";

// ============================================
// Types
// ============================================

export interface BidInvitation {
  id: string;
  project_id: string;
  work_order_id: string;
  vendor_org_id: string;
  estimate_id: string | null;
  status: string;
  invited_at: string;
  responded_at: string | null;
  vendor_name?: string;
  estimate_total?: number | null;
}

interface VendorOption {
  id: string;
  name: string;
  avg_rating: number | null;
  response_time_hours: number | null;
  trades: string[];
}

// ============================================
// Queries
// ============================================

/**
 * Get available vendors for a specific trade to invite to bid.
 */
export async function getVendorsForBidding(trade: string): Promise<{
  data: VendorOption[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: [], error: "Not authenticated" };

  // Get vendors that serve this trade
  const { data: orgs, error } = await supabase
    .from("vendor_organizations")
    .select("id, name, avg_rating, response_time_hours, trades")
    .contains("trades", [trade])
    .eq("onboarding_complete", true)
    .order("avg_rating", { ascending: false, nullsFirst: false })
    .limit(20);

  if (error) return { data: [], error: error.message };

  return {
    data: (orgs ?? []).map((o) => ({
      id: o.id,
      name: o.name,
      avg_rating: o.avg_rating,
      response_time_hours: o.response_time_hours,
      trades: o.trades ?? [],
    })),
  };
}

/**
 * Get bid invitations for a specific work order.
 */
export async function getWorkOrderBids(workOrderId: string): Promise<{
  data: BidInvitation[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: [], error: "Not authenticated" };

  const { data: bids, error } = await supabase
    .from("project_bid_invitations")
    .select("*")
    .eq("work_order_id", workOrderId)
    .order("invited_at", { ascending: true });

  if (error) return { data: [], error: error.message };
  if (!bids || bids.length === 0) return { data: [] };

  // Fetch vendor org names
  const orgIds = [...new Set(bids.map((b) => b.vendor_org_id))];
  const { data: orgs } = await supabase
    .from("vendor_organizations")
    .select("id, name")
    .in("id", orgIds);

  const orgMap = Object.fromEntries(
    (orgs ?? []).map((o) => [o.id, o.name])
  );

  // Fetch estimate totals for submitted bids
  const estimateIds = bids
    .map((b) => b.estimate_id)
    .filter((id): id is string => id !== null);

  let estMap: Record<string, number> = {};
  if (estimateIds.length > 0) {
    const { data: ests } = await supabase
      .from("vendor_estimates")
      .select("id, total")
      .in("id", estimateIds);

    estMap = Object.fromEntries(
      (ests ?? []).map((e) => [e.id, Number(e.total) || 0])
    );
  }

  return {
    data: bids.map((b) => ({
      ...b,
      vendor_name: orgMap[b.vendor_org_id] ?? "Unknown",
      estimate_total: b.estimate_id ? (estMap[b.estimate_id] ?? null) : null,
    })),
  };
}

/**
 * Get all bids for a project, grouped by work order.
 */
export async function getProjectBids(projectId: string): Promise<{
  data: Record<string, BidInvitation[]>;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: {}, error: "Not authenticated" };

  const { data: bids, error } = await supabase
    .from("project_bid_invitations")
    .select("*")
    .eq("project_id", projectId)
    .order("invited_at", { ascending: true });

  if (error) return { data: {}, error: error.message };
  if (!bids || bids.length === 0) return { data: {} };

  // Fetch vendor org names
  const orgIds = [...new Set(bids.map((b) => b.vendor_org_id))];
  const { data: orgs } = await supabase
    .from("vendor_organizations")
    .select("id, name")
    .in("id", orgIds);

  const orgMap = Object.fromEntries(
    (orgs ?? []).map((o) => [o.id, o.name])
  );

  // Fetch estimate totals
  const estimateIds = bids
    .map((b) => b.estimate_id)
    .filter((id): id is string => id !== null);

  let estMap: Record<string, number> = {};
  if (estimateIds.length > 0) {
    const { data: ests } = await supabase
      .from("vendor_estimates")
      .select("id, total")
      .in("id", estimateIds);

    estMap = Object.fromEntries(
      (ests ?? []).map((e) => [e.id, Number(e.total) || 0])
    );
  }

  // Group by work_order_id
  const grouped: Record<string, BidInvitation[]> = {};
  for (const b of bids) {
    const woId = b.work_order_id;
    if (!grouped[woId]) grouped[woId] = [];
    grouped[woId].push({
      ...b,
      vendor_name: orgMap[b.vendor_org_id] ?? "Unknown",
      estimate_total: b.estimate_id ? (estMap[b.estimate_id] ?? null) : null,
    });
  }

  return { data: grouped };
}

// ============================================
// Mutations
// ============================================

/**
 * Invite vendors to bid on a work order within a project.
 */
export async function inviteVendorsToBid(
  workOrderId: string,
  projectId: string,
  vendorOrgIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };
  if (vendorOrgIds.length === 0)
    return { success: false, error: "Select at least one vendor" };
  if (vendorOrgIds.length > 10)
    return { success: false, error: "Maximum 10 vendors per bid request" };

  // Verify ownership
  const { data: wo } = await supabase
    .from("vendor_work_orders")
    .select("id, homeowner_id, trade")
    .eq("id", workOrderId)
    .eq("homeowner_id", user.id)
    .single();

  if (!wo) return { success: false, error: "Work order not found" };

  // Upsert invitations (skip existing)
  const inserts = vendorOrgIds.map((orgId) => ({
    project_id: projectId,
    work_order_id: workOrderId,
    vendor_org_id: orgId,
    status: "invited" as const,
    invited_at: new Date().toISOString(),
  }));

  const { error: insertErr } = await supabase
    .from("project_bid_invitations")
    .upsert(inserts, { onConflict: "work_order_id,vendor_org_id" });

  if (insertErr) return { success: false, error: insertErr.message };

  // Update WO to indicate bidding mode
  await supabase
    .from("vendor_work_orders")
    .update({
      vendor_selection_mode: "homeowner_choice",
      status: "matching",
    })
    .eq("id", workOrderId);

  // Emit domain events for each invitation
  for (const orgId of vendorOrgIds) {
    emitEvent(
      "bid.invited",
      "bid_invitation",
      workOrderId,
      {
        origin_module: "home",
        work_order_id: workOrderId,
        vendor_org_id: orgId,
        property_id: undefined,
        new_status: "invited",
      },
      { id: user.id, type: "user" }
    );
  }

  // Notify vendors about the bid request
  const notifications = vendorOrgIds.map((orgId) => ({
    vendor_org_id: orgId,
    type: "bid_request",
    title: "New bid request",
    body: `You've been invited to bid on a ${wo.trade ?? "maintenance"} job`,
    reference_type: "work_order",
    reference_id: workOrderId,
  }));

  // Fire-and-forget vendor notifications via service client
  try {
    const serviceClient = createServiceClient();

    // Get vendor user IDs for notifications
    for (const orgId of vendorOrgIds) {
      const { data: vendorUsers } = await serviceClient
        .from("vendor_users")
        .select("user_id")
        .eq("vendor_org_id", orgId)
        .in("role", ["owner", "admin", "manager"]);

      if (vendorUsers && vendorUsers.length > 0) {
        const userNotifications = vendorUsers.map((vu) => ({
          user_id: vu.user_id,
          type: "bid_request" as const,
          title: notifications[0].title,
          body: notifications[0].body,
          reference_type: "work_order" as const,
          reference_id: workOrderId,
        }));

        await serviceClient
          .from("vendor_notifications")
          .insert(userNotifications);
      }
    }
  } catch (err) {
    console.error("Failed to send bid request notifications:", err);
  }

  return { success: true };
}

/**
 * Accept a bid — assigns the WO to the winning vendor,
 * closes competing bids, and emits events.
 */
export async function acceptBid(
  bidId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  // Get the bid and verify ownership
  const { data: bid } = await supabase
    .from("project_bid_invitations")
    .select("*")
    .eq("id", bidId)
    .single();

  if (!bid) return { success: false, error: "Bid not found" };

  // Verify the user owns the WO
  const { data: wo } = await supabase
    .from("vendor_work_orders")
    .select("id, homeowner_id, project_id, trade")
    .eq("id", bid.work_order_id)
    .eq("homeowner_id", user.id)
    .single();

  if (!wo) return { success: false, error: "Not authorized" };

  if (bid.status !== "bid_submitted")
    return { success: false, error: "Can only accept submitted bids" };

  const now = new Date().toISOString();

  // 1. Accept the winning bid
  const { error: acceptErr } = await supabase
    .from("project_bid_invitations")
    .update({ status: "accepted", responded_at: now })
    .eq("id", bidId);

  if (acceptErr) return { success: false, error: acceptErr.message };

  // 2. Decline all other bids for this WO
  await supabase
    .from("project_bid_invitations")
    .update({ status: "declined", responded_at: now })
    .eq("work_order_id", bid.work_order_id)
    .neq("id", bidId)
    .in("status", ["invited", "bid_submitted"]);

  // 3. Assign the WO to the winning vendor
  await supabase
    .from("vendor_work_orders")
    .update({
      vendor_org_id: bid.vendor_org_id,
      status: "assigned",
      vendor_selection_mode: "homeowner_choice",
    })
    .eq("id", bid.work_order_id);

  // 4. If bid has an estimate, approve it
  if (bid.estimate_id) {
    await supabase
      .from("vendor_estimates")
      .update({
        status: "approved",
        approved_at: now,
        updated_at: now,
      })
      .eq("id", bid.estimate_id);
  }

  // 5. Emit domain events
  emitEvent(
    "bid.accepted",
    "bid_invitation",
    bidId,
    {
      origin_module: "home",
      work_order_id: bid.work_order_id,
      vendor_org_id: bid.vendor_org_id,
      new_status: "accepted",
    },
    { id: user.id, type: "user" }
  );

  emitEvent(
    "work_order.assigned",
    "work_order",
    bid.work_order_id,
    {
      origin_module: "home",
      work_order_id: bid.work_order_id,
      vendor_org_id: bid.vendor_org_id,
      previous_status: "matching",
      new_status: "assigned",
    },
    { id: user.id, type: "user" }
  );

  return { success: true };
}

/**
 * Decline a specific bid.
 */
export async function declineBid(
  bidId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const { data: bid } = await supabase
    .from("project_bid_invitations")
    .select("*")
    .eq("id", bidId)
    .single();

  if (!bid) return { success: false, error: "Bid not found" };

  // Verify ownership
  const { data: wo } = await supabase
    .from("vendor_work_orders")
    .select("id, homeowner_id")
    .eq("id", bid.work_order_id)
    .eq("homeowner_id", user.id)
    .single();

  if (!wo) return { success: false, error: "Not authorized" };

  const { error } = await supabase
    .from("project_bid_invitations")
    .update({
      status: "declined",
      responded_at: new Date().toISOString(),
    })
    .eq("id", bidId);

  if (error) return { success: false, error: error.message };

  emitEvent(
    "bid.declined",
    "bid_invitation",
    bidId,
    {
      origin_module: "home",
      work_order_id: bid.work_order_id,
      vendor_org_id: bid.vendor_org_id,
      new_status: "declined",
    },
    { id: user.id, type: "user" }
  );

  return { success: true };
}

/**
 * Get bid comparison data for a specific work order.
 * Includes vendor details + estimate breakdown.
 */
export async function getBidComparison(workOrderId: string): Promise<{
  data: Array<{
    bid_id: string;
    vendor_org_id: string;
    vendor_name: string;
    avg_rating: number | null;
    response_time_hours: number | null;
    status: string;
    estimate_total: number | null;
    estimate_id: string | null;
    invited_at: string;
    responded_at: string | null;
  }>;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: [], error: "Not authenticated" };

  const { data: bids, error } = await supabase
    .from("project_bid_invitations")
    .select("*")
    .eq("work_order_id", workOrderId)
    .order("status", { ascending: true });

  if (error) return { data: [], error: error.message };
  if (!bids || bids.length === 0) return { data: [] };

  // Fetch vendor details
  const orgIds = [...new Set(bids.map((b) => b.vendor_org_id))];
  const { data: orgs } = await supabase
    .from("vendor_organizations")
    .select("id, name, avg_rating, response_time_hours")
    .in("id", orgIds);

  const orgMap = Object.fromEntries(
    (orgs ?? []).map((o) => [o.id, o])
  );

  // Fetch estimate totals
  const estimateIds = bids
    .map((b) => b.estimate_id)
    .filter((id): id is string => id !== null);

  let estMap: Record<string, number> = {};
  if (estimateIds.length > 0) {
    const { data: ests } = await supabase
      .from("vendor_estimates")
      .select("id, total")
      .in("id", estimateIds);

    estMap = Object.fromEntries(
      (ests ?? []).map((e) => [e.id, Number(e.total) || 0])
    );
  }

  return {
    data: bids.map((b) => {
      const org = orgMap[b.vendor_org_id];
      return {
        bid_id: b.id,
        vendor_org_id: b.vendor_org_id,
        vendor_name: org?.name ?? "Unknown",
        avg_rating: org?.avg_rating ?? null,
        response_time_hours: org?.response_time_hours ?? null,
        status: b.status,
        estimate_total: b.estimate_id ? (estMap[b.estimate_id] ?? null) : null,
        estimate_id: b.estimate_id,
        invited_at: b.invited_at,
        responded_at: b.responded_at,
      };
    }),
  };
}
