"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole, logActivity } from "@/lib/vendor/role-helpers";
import { sendEmail } from "@/lib/email/resend-client";
import { pmInviteEmail } from "@/lib/email/templates";
import type { VendorPmRelationship } from "@/lib/vendor/types";
import { PM_ROLES } from "@/lib/vendor/types";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://assetatlaspro.com";

// ============================================
// Client (PM relationship) queries
// ============================================

export interface ClientWithStats extends VendorPmRelationship {
  pm_email: string | null;
  pm_name: string | null;
  total_jobs: number;
  active_jobs: number;
  total_revenue: number;
}

/** Get all PM clients for the current vendor org with stats */
export async function getVendorClients(): Promise<{
  data: ClientWithStats[];
  error?: string;
}> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  // Get relationships
  const { data: rels, error: relError } = await supabase
    .from("vendor_pm_relationships")
    .select("*")
    .eq("vendor_org_id", vendor_org_id)
    .in("status", ["active", "pending"])
    .order("created_at", { ascending: false });

  if (relError) {
    return { data: [], error: relError.message };
  }

  if (!rels || rels.length === 0) {
    return { data: [] };
  }

  // Enrich with stats
  const enriched: ClientWithStats[] = [];
  for (const rel of rels) {
    // Get PM profile info
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", rel.pm_user_id)
      .single();

    // Get work order stats
    const { data: wos } = await supabase
      .from("vendor_work_orders")
      .select("status, total:budget_amount")
      .eq("vendor_org_id", vendor_org_id)
      .eq("pm_user_id", rel.pm_user_id);

    const jobs = wos ?? [];
    const activeStatuses = ["assigned", "accepted", "scheduled", "en_route", "on_site", "in_progress"];
    const paidJobs = jobs.filter((j) => j.status === "paid");

    // Get invoice revenue
    const { data: invoices } = await supabase
      .from("vendor_invoices")
      .select("total, status")
      .eq("vendor_org_id", vendor_org_id)
      .eq("pm_user_id", rel.pm_user_id)
      .eq("status", "paid");

    const revenue = (invoices ?? []).reduce(
      (sum, inv) => sum + Number(inv.total || 0),
      0
    );

    enriched.push({
      ...rel,
      pm_email: profile?.email ?? null,
      pm_name: profile?.full_name ?? null,
      total_jobs: jobs.length,
      active_jobs: jobs.filter((j) => activeStatuses.includes(j.status)).length,
      total_revenue: revenue,
    });
  }

  return { data: enriched };
}

/** Get detail for a single PM client */
export async function getClientDetail(pmUserId: string): Promise<{
  client: ClientWithStats | null;
  jobs: Array<{
    id: string;
    description: string | null;
    property_name: string | null;
    status: string;
    trade: string | null;
    completed_at: string | null;
    created_at: string;
  }>;
  error?: string;
}> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  const { data: rel, error: relError } = await supabase
    .from("vendor_pm_relationships")
    .select("*")
    .eq("vendor_org_id", vendor_org_id)
    .eq("pm_user_id", pmUserId)
    .single();

  if (relError || !rel) {
    return { client: null, jobs: [], error: relError?.message ?? "Not found" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", pmUserId)
    .single();

  const { data: wos } = await supabase
    .from("vendor_work_orders")
    .select("id, description, property_name, status, trade, completed_at, created_at")
    .eq("vendor_org_id", vendor_org_id)
    .eq("pm_user_id", pmUserId)
    .order("created_at", { ascending: false })
    .limit(50);

  const jobs = wos ?? [];
  const activeStatuses = ["assigned", "accepted", "scheduled", "en_route", "on_site", "in_progress"];

  const { data: invoices } = await supabase
    .from("vendor_invoices")
    .select("total")
    .eq("vendor_org_id", vendor_org_id)
    .eq("pm_user_id", pmUserId)
    .eq("status", "paid");

  const revenue = (invoices ?? []).reduce(
    (sum, inv) => sum + Number(inv.total || 0),
    0
  );

  return {
    client: {
      ...rel,
      pm_email: profile?.email ?? null,
      pm_name: profile?.full_name ?? null,
      total_jobs: jobs.length,
      active_jobs: jobs.filter((j) => activeStatuses.includes(j.status)).length,
      total_revenue: revenue,
    },
    jobs,
  };
}

/** Update notes on a PM relationship */
export async function updateClientNotes(
  pmUserId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  const { error } = await supabase
    .from("vendor_pm_relationships")
    .update({ notes })
    .eq("vendor_org_id", vendor_org_id)
    .eq("pm_user_id", pmUserId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ============================================
// Vendor-initiated invite (Vendor → PM)
// ============================================

/**
 * Invite a PM by email. Since pm_user_id is NOT nullable,
 * we must find an existing PM user by email. Returns error if not found.
 */
export async function invitePm(
  email: string
): Promise<{
  success: boolean;
  relationshipId?: string;
  inviteLink?: string;
  error?: string;
}> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  // Look up PM by email in profiles
  const { data: pmProfile } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("email", email)
    .single();

  if (!pmProfile) {
    return {
      success: false,
      error: "No user found with that email. They must create an account first.",
    };
  }

  // Verify they have a PM role
  const { data: pmRole } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", pmProfile.id)
    .in("role", [...PM_ROLES])
    .eq("is_active", true)
    .single();

  if (!pmRole) {
    return {
      success: false,
      error: "That user does not have a property manager role.",
    };
  }

  // Check if relationship already exists
  const { data: existing } = await supabase
    .from("vendor_pm_relationships")
    .select("id, status")
    .eq("vendor_org_id", vendor_org_id)
    .eq("pm_user_id", pmProfile.id)
    .single();

  if (existing) {
    if (existing.status === "active") {
      return { success: false, error: "Already connected with this PM" };
    }
  }

  // Generate token
  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const rawToken = Array.from(tokenBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(rawToken)
  );
  const tokenHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  let relationshipId: string;

  if (existing) {
    // Update existing relationship
    const { error: updateErr } = await supabase
      .from("vendor_pm_relationships")
      .update({
        status: "pending",
        invited_by: "vendor",
        invite_token_hash: tokenHash,
        invite_expires_at: expiresAt.toISOString(),
        invite_consumed: false,
        updated_by: user.id,
      })
      .eq("id", existing.id);

    if (updateErr) return { success: false, error: updateErr.message };
    relationshipId = existing.id;
  } else {
    // Create new relationship
    const { data: newRel, error: insertErr } = await supabase
      .from("vendor_pm_relationships")
      .insert({
        vendor_org_id,
        pm_user_id: pmProfile.id,
        status: "pending",
        invited_by: "vendor",
        invite_token_hash: tokenHash,
        invite_expires_at: expiresAt.toISOString(),
        invite_consumed: false,
        updated_by: user.id,
      })
      .select("id")
      .single();

    if (insertErr) return { success: false, error: insertErr.message };
    relationshipId = newRel!.id;
  }

  const inviteLink = `${BASE_URL}/pro/accept-invite/${rawToken}`;

  // Get vendor org name for email
  const { data: vendorOrg } = await supabase
    .from("vendor_organizations")
    .select("name")
    .eq("id", vendor_org_id)
    .single();

  const vendorName = vendorOrg?.name ?? "A vendor";

  // Send invite email
  if (pmProfile.email) {
    const emailData = pmInviteEmail({
      vendorName,
      inviteLink,
      expiresAtText: expiresAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    });

    sendEmail({
      to: pmProfile.email,
      subject: emailData.subject,
      html: emailData.html,
    }).catch((err) =>
      console.error("[vendor-clients] PM invite email failed:", err)
    );
  }

  await logActivity({
    entityType: "relationship",
    entityId: relationshipId,
    action: "pm_invite_sent",
    metadata: { pm_email: email, pm_user_id: pmProfile.id },
  });

  return { success: true, relationshipId, inviteLink };
}
