"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePmRole, logActivity } from "@/lib/vendor/role-helpers";
import { sendEmail } from "@/lib/email/resend-client";
import {
  vendorInviteEmail,
  relationshipStatusEmail,
} from "@/lib/email/templates";
import type {
  EnrichedPmVendor,
  RelationshipStatus,
  PaymentTerms,
} from "@/lib/vendor/types";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://assetatlaspro.com";

// ============================================
// Helpers
// ============================================

async function hashToken(raw: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(raw));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateToken(): string {
  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  return Array.from(tokenBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function expiresIn7Days(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d;
}

// ============================================
// Get all PM vendors (enriched)
// ============================================

export async function getPmVendors(): Promise<{
  data: EnrichedPmVendor[];
  error?: string;
}> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: [], error: "Not authenticated" };

  const { data: rels, error } = await supabase
    .from("vendor_pm_relationships")
    .select(
      "id, vendor_org_id, status, payment_terms, notes, invited_by, invite_expires_at, created_at"
    )
    .eq("pm_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { data: [], error: error.message };

  const enriched: EnrichedPmVendor[] = [];
  for (const rel of rels ?? []) {
    // Org info
    const { data: org } = await supabase
      .from("vendor_organizations")
      .select("name, email, phone, logo_url, trades")
      .eq("id", rel.vendor_org_id)
      .single();

    // Job stats
    const { data: wos } = await supabase
      .from("vendor_work_orders")
      .select("status")
      .eq("vendor_org_id", rel.vendor_org_id)
      .eq("pm_user_id", user.id);

    const jobs = wos ?? [];
    const activeStatuses = [
      "assigned",
      "accepted",
      "scheduled",
      "en_route",
      "on_site",
      "in_progress",
    ];

    // Revenue (paid invoices)
    const { data: invoices } = await supabase
      .from("vendor_invoices")
      .select("total")
      .eq("vendor_org_id", rel.vendor_org_id)
      .eq("pm_user_id", user.id)
      .eq("status", "paid");

    const totalSpentCents = (invoices ?? []).reduce(
      (sum, inv) => sum + Math.round(Number(inv.total || 0) * 100),
      0
    );

    // Credential summary
    const { data: creds } = await supabase
      .from("vendor_credentials")
      .select("type, status, expiration_date")
      .eq("vendor_org_id", rel.vendor_org_id);

    const credentials = creds ?? [];
    const hasGL = credentials.some(
      (c) => c.type === "insurance_gl" && c.status === "active"
    );
    const hasWC = credentials.some(
      (c) => c.type === "insurance_wc" && c.status === "active"
    );
    const hasW9 = credentials.some(
      (c) => c.type === "w9" && c.status === "active"
    );
    const expiringSoon = credentials.filter(
      (c) => c.status === "expiring_soon"
    );
    const expired = credentials.filter((c) => c.status === "expired");

    const warnings: string[] = [];
    if (!hasGL) warnings.push("Missing GL insurance");
    if (!hasWC) warnings.push("Missing WC insurance");
    if (!hasW9) warnings.push("Missing W9");
    if (expired.length > 0)
      warnings.push(`${expired.length} expired credential(s)`);
    if (expiringSoon.length > 0)
      warnings.push(`${expiringSoon.length} expiring soon`);

    enriched.push({
      relationship_id: rel.id,
      status: rel.status as RelationshipStatus,
      vendor_org_id: rel.vendor_org_id,
      vendor_name: org?.name ?? "Unknown",
      vendor_email: org?.email ?? null,
      vendor_phone: org?.phone ?? null,
      vendor_logo: org?.logo_url ?? null,
      trades: org?.trades ?? [],
      invite_expires_at: rel.invite_expires_at ?? null,
      invited_by: rel.invited_by ?? null,
      payment_terms: rel.payment_terms ?? "net_30",
      notes: rel.notes ?? null,
      created_at: rel.created_at,
      stats: {
        active_jobs: jobs.filter((j) =>
          activeStatuses.includes(j.status)
        ).length,
        total_jobs: jobs.length,
        total_spent_cents: totalSpentCents,
      },
      credential_summary: {
        eligible: hasGL && hasWC && hasW9 && expired.length === 0,
        missing_critical: !hasGL || !hasWC || !hasW9,
        warnings,
      },
    });
  }

  return { data: enriched };
}

// ============================================
// Invite vendor (PM → Vendor)
// ============================================

export async function inviteVendor(
  email: string
): Promise<{
  success: boolean;
  relationshipId?: string;
  inviteLink?: string;
  error?: string;
}> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  // Look up vendor org by email
  const { data: vendorOrg } = await supabase
    .from("vendor_organizations")
    .select("id, name, email")
    .eq("email", email)
    .single();

  if (!vendorOrg) {
    return {
      success: false,
      error:
        "No vendor found with that email. Share the invite link directly with the vendor.",
    };
  }

  // Generate token
  const rawToken = generateToken();
  const tokenHash = await hashToken(rawToken);
  const expiresAt = expiresIn7Days();

  // Check if relationship already exists
  const { data: existing } = await supabase
    .from("vendor_pm_relationships")
    .select("id, status")
    .eq("vendor_org_id", vendorOrg.id)
    .eq("pm_user_id", user.id)
    .single();

  let relationshipId: string;

  if (existing) {
    if (existing.status === "active") {
      return { success: false, error: "Already connected with this vendor" };
    }

    // Update existing pending/terminated relationship
    const { error: updateErr } = await supabase
      .from("vendor_pm_relationships")
      .update({
        status: "pending",
        invited_by: "pm",
        invite_token_hash: tokenHash,
        invite_expires_at: expiresAt.toISOString(),
        invite_consumed: false,
        updated_by: user.id,
      })
      .eq("id", existing.id)
      .eq("pm_user_id", user.id);

    if (updateErr) return { success: false, error: updateErr.message };
    relationshipId = existing.id;

    await logActivity({
      entityType: "relationship",
      entityId: existing.id,
      action: "invite_resent",
      metadata: { email },
    });
  } else {
    // Create new relationship
    const { data: newRel, error: insertErr } = await supabase
      .from("vendor_pm_relationships")
      .insert({
        vendor_org_id: vendorOrg.id,
        pm_user_id: user.id,
        status: "pending",
        invited_by: "pm",
        invite_token_hash: tokenHash,
        invite_expires_at: expiresAt.toISOString(),
        invite_consumed: false,
        updated_by: user.id,
      })
      .select("id")
      .single();

    if (insertErr) return { success: false, error: insertErr.message };
    relationshipId = newRel!.id;

    await logActivity({
      entityType: "relationship",
      entityId: newRel!.id,
      action: "invite_sent",
      metadata: { email, vendor_org_id: vendorOrg.id },
    });
  }

  const inviteLink = `${BASE_URL}/vendor/accept-invite/${rawToken}`;

  // Get PM name from profile for email
  const { data: pmProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const pmName = pmProfile?.full_name ?? "A property manager";

  // Send invite email (non-blocking — don't fail invite if email fails)
  const emailData = vendorInviteEmail({
    pmName,
    inviteLink,
    expiresAtText: expiresAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  });

  if (vendorOrg.email) {
    sendEmail({
      to: vendorOrg.email,
      subject: emailData.subject,
      html: emailData.html,
    }).catch((err) =>
      console.error("[pm-vendors] Invite email failed:", err)
    );
  }

  return { success: true, relationshipId, inviteLink };
}

// ============================================
// Resend invite
// ============================================

export async function resendInvite(
  relationshipId: string
): Promise<{ success: boolean; inviteLink?: string; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  // Verify ownership + get vendor org
  const { data: rel } = await supabase
    .from("vendor_pm_relationships")
    .select("id, vendor_org_id, status")
    .eq("id", relationshipId)
    .eq("pm_user_id", user.id)
    .single();

  if (!rel) return { success: false, error: "Relationship not found" };
  if (rel.status !== "pending") {
    return { success: false, error: "Can only resend for pending invites" };
  }

  // Rotate token
  const rawToken = generateToken();
  const tokenHash = await hashToken(rawToken);
  const expiresAt = expiresIn7Days();

  const { error: updateErr } = await supabase
    .from("vendor_pm_relationships")
    .update({
      invite_token_hash: tokenHash,
      invite_expires_at: expiresAt.toISOString(),
      invite_consumed: false,
      updated_by: user.id,
    })
    .eq("id", relationshipId)
    .eq("pm_user_id", user.id);

  if (updateErr) return { success: false, error: updateErr.message };

  const inviteLink = `${BASE_URL}/vendor/accept-invite/${rawToken}`;

  // Fetch vendor email from DB
  const { data: org } = await supabase
    .from("vendor_organizations")
    .select("email, name")
    .eq("id", rel.vendor_org_id)
    .single();

  const { data: pmProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const pmName = pmProfile?.full_name ?? "A property manager";

  if (org?.email) {
    const emailData = vendorInviteEmail({
      pmName,
      inviteLink,
      expiresAtText: expiresAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    });

    sendEmail({
      to: org.email,
      subject: emailData.subject,
      html: emailData.html,
    }).catch((err) =>
      console.error("[pm-vendors] Resend invite email failed:", err)
    );
  }

  await logActivity({
    entityType: "relationship",
    entityId: relationshipId,
    action: "invite_resent",
    metadata: { vendor_org_id: rel.vendor_org_id },
  });

  return { success: true, inviteLink };
}

// ============================================
// Suspend vendor
// ============================================

export async function suspendVendor(
  relationshipId: string
): Promise<{ success: boolean; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const { data: rel } = await supabase
    .from("vendor_pm_relationships")
    .select("id, vendor_org_id, status")
    .eq("id", relationshipId)
    .eq("pm_user_id", user.id)
    .single();

  if (!rel) return { success: false, error: "Relationship not found" };
  if (rel.status !== "active") {
    return { success: false, error: "Can only suspend active relationships" };
  }

  const { error: updateErr } = await supabase
    .from("vendor_pm_relationships")
    .update({ status: "suspended", updated_by: user.id })
    .eq("id", relationshipId)
    .eq("pm_user_id", user.id);

  if (updateErr) return { success: false, error: updateErr.message };

  await logActivity({
    entityType: "relationship",
    entityId: relationshipId,
    action: "relationship_suspended",
    oldValue: "active",
    newValue: "suspended",
  });

  // Notify vendor via email + in-app
  const { data: org } = await supabase
    .from("vendor_organizations")
    .select("name, email")
    .eq("id", rel.vendor_org_id)
    .single();

  const { data: pmProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  // Notify vendor users in-app
  const { data: vendorUsers } = await supabase
    .from("vendor_users")
    .select("user_id")
    .eq("vendor_org_id", rel.vendor_org_id)
    .eq("is_active", true);

  if (vendorUsers?.length) {
    await supabase.from("vendor_notifications").insert(
      vendorUsers.map((vu) => ({
        user_id: vu.user_id,
        type: "relationship_suspended",
        title: "Relationship suspended",
        body: `${pmProfile?.full_name ?? "A property manager"} has suspended your relationship. New assignments are paused.`,
        reference_type: "relationship",
        reference_id: relationshipId,
        is_read: false,
      }))
    );
  }

  // Email
  if (org?.email) {
    const emailData = relationshipStatusEmail({
      recipientName: org.name ?? "Vendor",
      otherPartyName: pmProfile?.full_name ?? "A property manager",
      status: "suspended",
    });
    sendEmail({
      to: org.email,
      subject: emailData.subject,
      html: emailData.html,
    }).catch((err) =>
      console.error("[pm-vendors] Suspend email failed:", err)
    );
  }

  return { success: true };
}

// ============================================
// Terminate vendor
// ============================================

export async function terminateVendor(
  relationshipId: string
): Promise<{ success: boolean; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const { data: rel } = await supabase
    .from("vendor_pm_relationships")
    .select("id, vendor_org_id, status")
    .eq("id", relationshipId)
    .eq("pm_user_id", user.id)
    .single();

  if (!rel) return { success: false, error: "Relationship not found" };
  if (rel.status === "terminated") {
    return { success: false, error: "Already terminated" };
  }

  const { error: updateErr } = await supabase
    .from("vendor_pm_relationships")
    .update({ status: "terminated", updated_by: user.id })
    .eq("id", relationshipId)
    .eq("pm_user_id", user.id);

  if (updateErr) return { success: false, error: updateErr.message };

  await logActivity({
    entityType: "relationship",
    entityId: relationshipId,
    action: "relationship_terminated",
    oldValue: rel.status,
    newValue: "terminated",
  });

  const { data: org } = await supabase
    .from("vendor_organizations")
    .select("name, email")
    .eq("id", rel.vendor_org_id)
    .single();

  const { data: pmProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  // In-app notify vendor users
  const { data: vendorUsers } = await supabase
    .from("vendor_users")
    .select("user_id")
    .eq("vendor_org_id", rel.vendor_org_id)
    .eq("is_active", true);

  if (vendorUsers?.length) {
    await supabase.from("vendor_notifications").insert(
      vendorUsers.map((vu) => ({
        user_id: vu.user_id,
        type: "relationship_terminated",
        title: "Relationship terminated",
        body: `${pmProfile?.full_name ?? "A property manager"} has ended the relationship. A new invite is needed to reconnect.`,
        reference_type: "relationship",
        reference_id: relationshipId,
        is_read: false,
      }))
    );
  }

  if (org?.email) {
    const emailData = relationshipStatusEmail({
      recipientName: org.name ?? "Vendor",
      otherPartyName: pmProfile?.full_name ?? "A property manager",
      status: "terminated",
    });
    sendEmail({
      to: org.email,
      subject: emailData.subject,
      html: emailData.html,
    }).catch((err) =>
      console.error("[pm-vendors] Terminate email failed:", err)
    );
  }

  return { success: true };
}

// ============================================
// Reactivate vendor
// ============================================

export async function reactivateVendor(
  relationshipId: string
): Promise<{ success: boolean; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const { data: rel } = await supabase
    .from("vendor_pm_relationships")
    .select("id, vendor_org_id, status")
    .eq("id", relationshipId)
    .eq("pm_user_id", user.id)
    .single();

  if (!rel) return { success: false, error: "Relationship not found" };
  if (rel.status !== "suspended") {
    return {
      success: false,
      error: "Can only reactivate suspended relationships",
    };
  }

  const { error: updateErr } = await supabase
    .from("vendor_pm_relationships")
    .update({ status: "active", updated_by: user.id })
    .eq("id", relationshipId)
    .eq("pm_user_id", user.id);

  if (updateErr) return { success: false, error: updateErr.message };

  await logActivity({
    entityType: "relationship",
    entityId: relationshipId,
    action: "relationship_reactivated",
    oldValue: "suspended",
    newValue: "active",
  });

  const { data: org } = await supabase
    .from("vendor_organizations")
    .select("name, email")
    .eq("id", rel.vendor_org_id)
    .single();

  const { data: pmProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  // In-app notify vendor users
  const { data: vendorUsers } = await supabase
    .from("vendor_users")
    .select("user_id")
    .eq("vendor_org_id", rel.vendor_org_id)
    .eq("is_active", true);

  if (vendorUsers?.length) {
    await supabase.from("vendor_notifications").insert(
      vendorUsers.map((vu) => ({
        user_id: vu.user_id,
        type: "relationship_reactivated",
        title: "Relationship reactivated",
        body: `${pmProfile?.full_name ?? "A property manager"} has reactivated your relationship. Assignments can resume.`,
        reference_type: "relationship",
        reference_id: relationshipId,
        is_read: false,
      }))
    );
  }

  if (org?.email) {
    const emailData = relationshipStatusEmail({
      recipientName: org.name ?? "Vendor",
      otherPartyName: pmProfile?.full_name ?? "A property manager",
      status: "active",
    });
    sendEmail({
      to: org.email,
      subject: emailData.subject,
      html: emailData.html,
    }).catch((err) =>
      console.error("[pm-vendors] Reactivate email failed:", err)
    );
  }

  return { success: true };
}

// ============================================
// Update PM notes
// ============================================

export async function updatePmNotes(
  relationshipId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("vendor_pm_relationships")
    .update({ notes, updated_by: user.id })
    .eq("id", relationshipId)
    .eq("pm_user_id", user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ============================================
// Update payment terms
// ============================================

export async function updatePaymentTerms(
  relationshipId: string,
  terms: PaymentTerms
): Promise<{ success: boolean; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("vendor_pm_relationships")
    .update({ payment_terms: terms, updated_by: user.id })
    .eq("id", relationshipId)
    .eq("pm_user_id", user.id);

  if (error) return { success: false, error: error.message };

  await logActivity({
    entityType: "relationship",
    entityId: relationshipId,
    action: "payment_terms_updated",
    newValue: terms,
  });

  return { success: true };
}

// ============================================
// Get PM vendor detail
// ============================================

export async function getPmVendorDetail(relationshipId: string): Promise<{
  vendor: EnrichedPmVendor | null;
  credentials: Array<{
    id: string;
    type: string;
    name: string;
    status: string;
    expiration_date: string | null;
    document_number: string | null;
  }>;
  jobs: Array<{
    id: string;
    description: string | null;
    property_name: string | null;
    status: string;
    trade: string | null;
    priority: string | null;
    created_at: string;
  }>;
  error?: string;
}> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    return { vendor: null, credentials: [], jobs: [], error: "Not authenticated" };

  const { data: rel } = await supabase
    .from("vendor_pm_relationships")
    .select(
      "id, vendor_org_id, status, payment_terms, notes, invited_by, invite_expires_at, created_at"
    )
    .eq("id", relationshipId)
    .eq("pm_user_id", user.id)
    .single();

  if (!rel) return { vendor: null, credentials: [], jobs: [], error: "Not found" };

  // Org info
  const { data: org } = await supabase
    .from("vendor_organizations")
    .select("name, email, phone, logo_url, trades")
    .eq("id", rel.vendor_org_id)
    .single();

  // Jobs
  const { data: wos } = await supabase
    .from("vendor_work_orders")
    .select("id, description, property_name, status, trade, priority, created_at")
    .eq("vendor_org_id", rel.vendor_org_id)
    .eq("pm_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const jobs = wos ?? [];
  const activeStatuses = [
    "assigned",
    "accepted",
    "scheduled",
    "en_route",
    "on_site",
    "in_progress",
  ];

  // Revenue
  const { data: invoices } = await supabase
    .from("vendor_invoices")
    .select("total")
    .eq("vendor_org_id", rel.vendor_org_id)
    .eq("pm_user_id", user.id)
    .eq("status", "paid");

  const totalSpentCents = (invoices ?? []).reduce(
    (sum, inv) => sum + Math.round(Number(inv.total || 0) * 100),
    0
  );

  // Credentials
  const { data: creds } = await supabase
    .from("vendor_credentials")
    .select("id, type, name, status, expiration_date, document_number")
    .eq("vendor_org_id", rel.vendor_org_id)
    .order("type");

  const credentials = creds ?? [];

  const hasGL = credentials.some(
    (c) => c.type === "insurance_gl" && c.status === "active"
  );
  const hasWC = credentials.some(
    (c) => c.type === "insurance_wc" && c.status === "active"
  );
  const hasW9 = credentials.some(
    (c) => c.type === "w9" && c.status === "active"
  );
  const expiringSoon = credentials.filter((c) => c.status === "expiring_soon");
  const expired = credentials.filter((c) => c.status === "expired");

  const warnings: string[] = [];
  if (!hasGL) warnings.push("Missing GL insurance");
  if (!hasWC) warnings.push("Missing WC insurance");
  if (!hasW9) warnings.push("Missing W9");
  if (expired.length > 0)
    warnings.push(`${expired.length} expired credential(s)`);
  if (expiringSoon.length > 0)
    warnings.push(`${expiringSoon.length} expiring soon`);

  const vendor: EnrichedPmVendor = {
    relationship_id: rel.id,
    status: rel.status as RelationshipStatus,
    vendor_org_id: rel.vendor_org_id,
    vendor_name: org?.name ?? "Unknown",
    vendor_email: org?.email ?? null,
    vendor_phone: org?.phone ?? null,
    vendor_logo: org?.logo_url ?? null,
    trades: org?.trades ?? [],
    invite_expires_at: rel.invite_expires_at ?? null,
    invited_by: rel.invited_by ?? null,
    payment_terms: rel.payment_terms ?? "net_30",
    notes: rel.notes ?? null,
    created_at: rel.created_at,
    stats: {
      active_jobs: jobs.filter((j) => activeStatuses.includes(j.status)).length,
      total_jobs: jobs.length,
      total_spent_cents: totalSpentCents,
    },
    credential_summary: {
      eligible: hasGL && hasWC && hasW9 && expired.length === 0,
      missing_critical: !hasGL || !hasWC || !hasW9,
      warnings,
    },
  };

  return { vendor, credentials, jobs };
}
