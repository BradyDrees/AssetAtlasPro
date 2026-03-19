"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole, logActivity } from "@/lib/vendor/role-helpers";
import { revalidatePath } from "next/cache";

// ============================================
// Types
// ============================================

export interface PendingConnectionRequest {
  id: string;
  pm_user_id: string;
  pm_org_id: string | null;
  pm_name: string;
  pm_email: string | null;
  request_message: string | null;
  requested_at: string;
  request_origin: string | null;
}

// ============================================
// Get Pending Connection Requests (vendor side)
// ============================================

export async function getPendingConnectionRequests(): Promise<{
  data: PendingConnectionRequest[];
  error?: string;
}> {
  const vendorAuth = await requireVendorRole();

  // Only owner/admin can view requests
  if (!["owner", "admin"].includes(vendorAuth.role)) {
    return { data: [] };
  }

  const supabase = await createClient();

  const { data: pending, error } = await supabase
    .from("vendor_pm_relationships")
    .select(
      "id, pm_user_id, pm_org_id, request_message, requested_at, request_origin"
    )
    .eq("vendor_org_id", vendorAuth.vendor_org_id)
    .eq("status", "pending")
    .order("requested_at", { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  if (!pending || pending.length === 0) {
    return { data: [] };
  }

  // Batch fetch PM profiles
  const pmUserIds = pending.map((p) => p.pm_user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .in("id", pmUserIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      {
        name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email || "Unknown",
        email: p.email,
      },
    ])
  );

  const results: PendingConnectionRequest[] = pending.map((p) => {
    const profile = profileMap.get(p.pm_user_id);
    return {
      id: p.id,
      pm_user_id: p.pm_user_id,
      pm_org_id: p.pm_org_id,
      pm_name: profile?.name ?? "Unknown",
      pm_email: profile?.email ?? null,
      request_message: p.request_message,
      requested_at: p.requested_at,
      request_origin: p.request_origin,
    };
  });

  return { data: results };
}

// ============================================
// Respond to Connection Request (accept/decline)
// ============================================

export async function respondToConnectionRequest(
  relationshipId: string,
  accept: boolean,
  declineReason?: string
): Promise<{ success: boolean; error?: string }> {
  const vendorAuth = await requireVendorRole();

  // Only owner/admin can respond
  if (!["owner", "admin"].includes(vendorAuth.role)) {
    return { success: false, error: "Only owners and admins can respond to requests" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  // Verify this relationship belongs to this vendor org and is pending
  const { data: rel, error: fetchError } = await supabase
    .from("vendor_pm_relationships")
    .select("id, pm_user_id, pm_org_id, vendor_org_id, status")
    .eq("id", relationshipId)
    .eq("vendor_org_id", vendorAuth.vendor_org_id)
    .eq("status", "pending")
    .single();

  if (fetchError || !rel) {
    return { success: false, error: "Request not found or already responded to" };
  }

  const now = new Date().toISOString();

  if (accept) {
    // Accept — set status to active
    const { error: updateError } = await supabase
      .from("vendor_pm_relationships")
      .update({
        status: "active",
        responded_at: now,
        responded_by: user.id,
      })
      .eq("id", relationshipId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    await logActivity({
      entityType: "relationship",
      entityId: relationshipId,
      action: "connection_accepted",
      metadata: {
        pm_user_id: rel.pm_user_id,
        pm_org_id: rel.pm_org_id,
        vendor_org_id: rel.vendor_org_id,
      },
    });

    // Notify PM that request was accepted
    await supabase.from("vendor_notifications").insert({
      user_id: rel.pm_user_id,
      type: "connection_accepted",
      title: "Connection Accepted",
      body: "Your connection request has been accepted.",
      reference_type: "vendor_pm_relationship",
      reference_id: relationshipId,
    });
  } else {
    // Decline — set status to declined
    const cleanReason = declineReason?.trim().slice(0, 500) || null;

    const { error: updateError } = await supabase
      .from("vendor_pm_relationships")
      .update({
        status: "declined",
        responded_at: now,
        responded_by: user.id,
        decline_reason: cleanReason,
      })
      .eq("id", relationshipId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    await logActivity({
      entityType: "relationship",
      entityId: relationshipId,
      action: "connection_declined",
      metadata: {
        pm_user_id: rel.pm_user_id,
        pm_org_id: rel.pm_org_id,
        vendor_org_id: rel.vendor_org_id,
        has_reason: !!cleanReason,
      },
    });

    // Notify PM that request was declined
    await supabase.from("vendor_notifications").insert({
      user_id: rel.pm_user_id,
      type: "connection_declined",
      title: "Connection Request Update",
      body: "Your connection request was not accepted at this time.",
      reference_type: "vendor_pm_relationship",
      reference_id: relationshipId,
    });
  }

  revalidatePath("/pro/clients");
  revalidatePath("/vendor/clients");
  revalidatePath("/operate/vendors");

  return { success: true };
}

// ============================================
// Get Pending Request Count (for badge)
// ============================================

export async function getPendingRequestCount(): Promise<number> {
  const vendorAuth = await requireVendorRole();

  if (!["owner", "admin"].includes(vendorAuth.role)) {
    return 0;
  }

  const supabase = await createClient();

  const { count } = await supabase
    .from("vendor_pm_relationships")
    .select("id", { count: "exact", head: true })
    .eq("vendor_org_id", vendorAuth.vendor_org_id)
    .eq("status", "pending");

  return count ?? 0;
}
