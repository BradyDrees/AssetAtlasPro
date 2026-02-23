"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/vendor/role-helpers";

/**
 * Accept an invite by raw token.
 * Verifies sha256(token) matches, checks expiry + one-time use.
 * Sets vendor_pm_relationships status to 'active'.
 */
export async function acceptInvite(token: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Hash the raw token to compare with stored hash
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const tokenHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  // Find the matching relationship
  const { data: rel, error: findError } = await supabase
    .from("vendor_pm_relationships")
    .select("*")
    .eq("invite_token_hash", tokenHash)
    .single();

  if (findError || !rel) {
    return { success: false, error: "Invalid or expired invite link" };
  }

  // Check if already consumed
  if (rel.invite_consumed) {
    return { success: false, error: "This invite has already been used" };
  }

  // Check expiry
  if (rel.invite_expires_at && new Date(rel.invite_expires_at) < new Date()) {
    return { success: false, error: "This invite has expired" };
  }

  // Check caller is the PM on this invite
  if (rel.pm_user_id !== user.id) {
    // If the invite was sent to a different user, allow if user is vendor
    // Check if user has a vendor org
    const { data: vendorUser } = await supabase
      .from("vendor_users")
      .select("vendor_org_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!vendorUser) {
      return { success: false, error: "You must set up your vendor account first" };
    }
  }

  // Consume the invite and activate
  const { error: updateError } = await supabase
    .from("vendor_pm_relationships")
    .update({
      status: "active",
      invite_consumed: true,
      updated_by: user.id,
    })
    .eq("id", rel.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  await logActivity({
    entityType: "relationship",
    entityId: rel.id,
    action: "invite_accepted",
    metadata: { pm_user_id: rel.pm_user_id, vendor_org_id: rel.vendor_org_id },
  });

  return { success: true };
}
