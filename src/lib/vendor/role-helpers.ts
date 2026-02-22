/**
 * Server-only role helpers (Correction 7).
 *
 * Uses Supabase server client. Checks membership tables (vendor_users, user_roles).
 * NEVER reads cookies. NEVER trusts client-provided role.
 *
 * Usage:
 * - Call requireVendorRole() in vendor layouts and vendor server actions.
 * - Call requirePmRole() in PM layouts and PM server actions.
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  VendorAuthContext,
  PmAuthContext,
  AppRole,
  VendorEntityType,
  UserRole,
  ActiveRoleContext,
} from "./types";

// ============================================
// Role enforcement (server-side only)
// ============================================

/**
 * Verify the caller is an active vendor org member.
 * Redirects to /login if unauthenticated, /vendor/onboarding if no membership.
 * Returns { id, vendor_org_id, role } for the vendor user row.
 */
export async function requireVendorRole(): Promise<VendorAuthContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check membership table — NOT cookie, NOT profile.active_role
  const { data: vendorUser } = await supabase
    .from("vendor_users")
    .select("id, vendor_org_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!vendorUser) {
    redirect("/vendor/onboarding");
  }

  return vendorUser as VendorAuthContext;
}

/**
 * Verify the caller has a PM role.
 * Redirects to /login if unauthenticated, /vendor if no PM role.
 */
export async function requirePmRole(): Promise<PmAuthContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: pmRole } = await supabase
    .from("user_roles")
    .select("id, org_id")
    .eq("user_id", user.id)
    .eq("role", "pm")
    .eq("is_active", true)
    .single();

  if (!pmRole) {
    redirect("/vendor");
  }

  return pmRole as PmAuthContext;
}

// ============================================
// Role queries
// ============================================

/** Get all active roles for the current user */
export async function getUserRoles(): Promise<UserRole[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("user_roles")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true);

  return (data ?? []) as UserRole[];
}

/** Get active_role + active_org_id from profiles (UI context only) */
export async function getActiveRole(): Promise<ActiveRoleContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("active_role, active_org_id")
    .eq("id", user.id)
    .single();

  if (!data) return null;

  return {
    active_role: (data.active_role as AppRole) ?? "pm",
    active_org_id: data.active_org_id as string | null,
  };
}

/**
 * Switch the user's active role context.
 * VALIDATES membership table first, then updates profile.
 * Returns the new active role context.
 */
export async function switchActiveRole(
  newRole: AppRole,
  orgId?: string
): Promise<ActiveRoleContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // Validate membership exists for the requested role
  if (newRole === "vendor") {
    const { data: vendorUser } = await supabase
      .from("vendor_users")
      .select("id, vendor_org_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!vendorUser) {
      throw new Error("No active vendor membership");
    }

    // Use the vendor org ID from the membership record
    orgId = vendorUser.vendor_org_id;
  } else if (newRole === "pm") {
    const { data: pmRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "pm")
      .eq("is_active", true)
      .single();

    if (!pmRole) {
      throw new Error("No active PM role");
    }
  }

  // Update profile (UI context only)
  await supabase
    .from("profiles")
    .update({
      active_role: newRole,
      active_org_id: orgId ?? null,
    })
    .eq("id", user.id);

  // Log the role switch
  await logActivity({
    entityType: "vendor_user",
    entityId: user.id,
    action: "role_switched",
    newValue: newRole,
    metadata: { org_id: orgId },
  });

  return {
    active_role: newRole,
    active_org_id: orgId ?? null,
  };
}

// ============================================
// Activity logging
// ============================================

interface LogActivityParams {
  entityType: VendorEntityType;
  entityId: string;
  action: string;
  actorRole?: string;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Insert an entry into the vendor_activity_log.
 * Automatically sets actor_id from the current session.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // Determine actor_role from params or derive from membership
  let actorRole = params.actorRole;
  if (!actorRole) {
    const { data: vendorUser } = await supabase
      .from("vendor_users")
      .select("role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    actorRole = vendorUser
      ? `vendor_${vendorUser.role}`
      : "pm";
  }

  await supabase.from("vendor_activity_log").insert({
    actor_id: user.id,
    actor_role: actorRole,
    entity_type: params.entityType,
    entity_id: params.entityId,
    action: params.action,
    old_value: params.oldValue ?? null,
    new_value: params.newValue ?? null,
    metadata: params.metadata ?? {},
  });
}
