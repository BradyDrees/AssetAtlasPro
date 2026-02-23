"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePmRole, logActivity } from "@/lib/vendor/role-helpers";

/**
 * Get all vendor relationships for the current PM
 */
export async function getPmVendors(): Promise<{
  data: Array<{
    id: string;
    vendor_org_id: string;
    vendor_name: string;
    vendor_email: string | null;
    vendor_phone: string | null;
    trades: string[];
    status: string;
    payment_terms: string;
    created_at: string;
  }>;
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
    .select("id, vendor_org_id, status, payment_terms, created_at")
    .eq("pm_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { data: [], error: error.message };

  const enriched = [];
  for (const rel of rels ?? []) {
    const { data: org } = await supabase
      .from("vendor_organizations")
      .select("name, email, phone, trades")
      .eq("id", rel.vendor_org_id)
      .single();

    enriched.push({
      ...rel,
      vendor_name: org?.name ?? "Unknown",
      vendor_email: org?.email ?? null,
      vendor_phone: org?.phone ?? null,
      trades: org?.trades ?? [],
    });
  }

  return { data: enriched };
}

/**
 * Invite a vendor by email.
 * Generates a random token, stores sha256(token) with expiry + one-time use flag.
 * Returns the raw token for the invite link (not stored).
 */
export async function inviteVendor(email: string): Promise<{
  success: boolean;
  token?: string;
  error?: string;
}> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  // Check if vendor org exists with this email
  const { data: vendorOrg } = await supabase
    .from("vendor_organizations")
    .select("id")
    .eq("email", email)
    .single();

  // Generate secure random token
  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const rawToken = Array.from(tokenBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Hash for storage (never store raw)
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(rawToken));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const tokenHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  // Expiry: 7 days from now
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  if (vendorOrg) {
    // Check if relationship already exists
    const { data: existing } = await supabase
      .from("vendor_pm_relationships")
      .select("id, status")
      .eq("vendor_org_id", vendorOrg.id)
      .eq("pm_user_id", user.id)
      .single();

    if (existing) {
      if (existing.status === "active") {
        return { success: false, error: "Already connected with this vendor" };
      }
      // Update existing pending/terminated relationship
      await supabase
        .from("vendor_pm_relationships")
        .update({
          status: "pending",
          invited_by: "pm",
          invite_token_hash: tokenHash,
          invite_expires_at: expiresAt.toISOString(),
          invite_consumed: false,
          updated_by: user.id,
        })
        .eq("id", existing.id);

      await logActivity({
        entityType: "relationship",
        entityId: existing.id,
        action: "invite_resent",
        metadata: { email },
      });

      return { success: true, token: rawToken };
    }

    // Create new relationship
    const { data: newRel, error } = await supabase
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

    if (error) return { success: false, error: error.message };

    await logActivity({
      entityType: "relationship",
      entityId: newRel!.id,
      action: "invite_sent",
      metadata: { email, vendor_org_id: vendorOrg.id },
    });

    return { success: true, token: rawToken };
  }

  // No vendor org with that email — create a placeholder relationship
  // The vendor will need to create an account and accept the invite
  // For now just return the token; the accept-invite page handles matching
  // We need a vendor_org_id, so we create a temporary "pending" org placeholder
  // Actually: we can't insert without a valid vendor_org_id FK
  // Instead, return error asking PM to share the invite link directly
  return {
    success: false,
    error: "No vendor found with that email. Share the invite link directly with the vendor.",
  };
}
