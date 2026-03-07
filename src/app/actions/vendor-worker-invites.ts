"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole, logActivity } from "@/lib/vendor/role-helpers";
import { revalidatePath } from "next/cache";

// ============================================
// Token Helpers (same pattern as pm-vendors.ts)
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

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000";

// ============================================
// Invite Worker
// ============================================

export async function inviteWorker(
  email: string,
  role: "admin" | "office_manager" | "tech"
): Promise<{ success: boolean; inviteLink?: string; error?: string }> {
  const vendorAuth = await requireVendorRole();

  // Only owner/admin can invite
  if (!["owner", "admin"].includes(vendorAuth.role)) {
    return { success: false, error: "Only owners and admins can invite workers" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { success: false, error: "Invalid email address" };
  }

  // Check if already a member
  const { data: existingMember } = await supabase
    .from("vendor_users")
    .select("id")
    .eq("vendor_org_id", vendorAuth.vendor_org_id)
    .eq("email", normalizedEmail)
    .eq("is_active", true)
    .maybeSingle();

  if (existingMember) {
    return { success: false, error: "already_member" };
  }

  // Generate token
  const rawToken = generateToken();
  const tokenHash = await hashToken(rawToken);
  const expiresAt = expiresIn7Days();

  // Insert invite (partial unique index prevents duplicates)
  const { data: invite, error: insertErr } = await supabase
    .from("vendor_worker_invites")
    .insert({
      vendor_org_id: vendorAuth.vendor_org_id,
      email: normalizedEmail,
      role,
      invited_by: user.id,
      invite_token_hash: tokenHash,
      invite_expires_at: expiresAt.toISOString(),
      invite_consumed: false,
    })
    .select("id")
    .single();

  if (insertErr) {
    // Check for unique constraint violation (pending invite exists)
    if (insertErr.code === "23505") {
      return { success: false, error: "pending_invite" };
    }
    return { success: false, error: insertErr.message };
  }

  const inviteLink = `${BASE_URL}/register-worker/${rawToken}`;

  await logActivity({
    entityType: "vendor_user",
    entityId: invite!.id,
    action: "invite_created",
    metadata: {
      email: normalizedEmail,
      role,
      vendor_org_id: vendorAuth.vendor_org_id,
    },
  });

  revalidatePath("/pro/team");
  revalidatePath("/vendor/profile/team");

  return { success: true, inviteLink };
}

// ============================================
// Get Worker Invites
// ============================================

export interface WorkerInvite {
  id: string;
  email: string;
  role: string;
  invite_expires_at: string;
  invite_consumed: boolean;
  revoked_at: string | null;
  created_at: string;
}

export async function getWorkerInvites(): Promise<{
  data: WorkerInvite[];
  error?: string;
}> {
  const vendorAuth = await requireVendorRole();

  // Only owner/admin can view invites
  if (!["owner", "admin"].includes(vendorAuth.role)) {
    return { data: [] };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_worker_invites")
    .select("id, email, role, invite_expires_at, invite_consumed, revoked_at, created_at")
    .eq("vendor_org_id", vendorAuth.vendor_org_id)
    .eq("invite_consumed", false)
    .is("revoked_at", null)
    .gt("invite_expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as WorkerInvite[] };
}

// ============================================
// Revoke Worker Invite
// ============================================

export async function revokeWorkerInvite(
  inviteId: string
): Promise<{ error?: string }> {
  const vendorAuth = await requireVendorRole();

  // Only owner/admin can revoke
  if (!["owner", "admin"].includes(vendorAuth.role)) {
    return { error: "Only owners and admins can revoke invites" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("vendor_worker_invites")
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: user.id,
    })
    .eq("id", inviteId)
    .eq("vendor_org_id", vendorAuth.vendor_org_id);

  if (error) return { error: error.message };

  await logActivity({
    entityType: "vendor_user",
    entityId: inviteId,
    action: "invite_revoked",
    metadata: { vendor_org_id: vendorAuth.vendor_org_id },
  });

  revalidatePath("/pro/team");
  revalidatePath("/vendor/profile/team");

  return {};
}

// ============================================
// Accept Worker Invite
// ============================================

export async function acceptWorkerInvite(token: string): Promise<{
  success: boolean;
  error?: string;
  errorCode?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated", errorCode: "not_authenticated" };

  const tokenHash = await hashToken(token);

  // Call the SECURITY DEFINER RPC
  const { data: vendorUserId, error: rpcError } = await supabase.rpc(
    "accept_worker_invite",
    {
      p_token_hash: tokenHash,
      p_user_id: user.id,
    }
  );

  if (rpcError) {
    const msg = rpcError.message || "";
    if (msg.includes("invalid_token")) {
      return { success: false, error: "Invalid invite link", errorCode: "invalid_token" };
    }
    if (msg.includes("already_consumed")) {
      return { success: false, error: "This invite has already been used", errorCode: "already_consumed" };
    }
    if (msg.includes("invite_revoked")) {
      return { success: false, error: "This invite has been revoked", errorCode: "invite_revoked" };
    }
    if (msg.includes("invite_expired")) {
      return { success: false, error: "This invite has expired", errorCode: "invite_expired" };
    }
    if (msg.includes("email_mismatch")) {
      return { success: false, error: "email_mismatch", errorCode: "email_mismatch" };
    }
    if (msg.includes("user_not_found")) {
      return { success: false, error: "User not found", errorCode: "user_not_found" };
    }
    return { success: false, error: rpcError.message, errorCode: "unknown" };
  }

  // Lookup invite details for logging (non-blocking)
  const { data: inviteInfo } = await supabase
    .rpc("lookup_worker_invite", { p_token_hash: tokenHash });

  const invite = Array.isArray(inviteInfo) ? inviteInfo[0] : inviteInfo;

  if (invite) {
    await logActivity({
      entityType: "vendor_user",
      entityId: vendorUserId as string,
      action: "invite_accepted",
      metadata: {
        vendor_user_id: vendorUserId,
        accepted_email: user.email,
        invite_id: invite.invite_id,
        org_name: invite.org_name,
      },
    });
  }

  // Update active role cookie + profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (profile) {
    await supabase
      .from("profiles")
      .update({ active_role: "vendor" })
      .eq("id", user.id);
  }

  revalidatePath("/pro/team");
  revalidatePath("/vendor/profile/team");

  return { success: true };
}

// ============================================
// Lookup Invite (for accept page rendering)
// ============================================

export interface InviteLookup {
  invite_id: string;
  email: string;
  role: string;
  invite_expires_at: string;
  invite_consumed: boolean;
  revoked_at: string | null;
  org_name: string;
}

export async function lookupWorkerInvite(
  token: string
): Promise<{ data: InviteLookup | null; error?: string }> {
  const supabase = await createClient();
  const tokenHash = await hashToken(token);

  const { data, error } = await supabase.rpc("lookup_worker_invite", {
    p_token_hash: tokenHash,
  });

  if (error) return { data: null, error: error.message };

  const invite = Array.isArray(data) ? data[0] : data;
  if (!invite) return { data: null, error: "Invalid invite link" };

  return { data: invite as InviteLookup };
}
