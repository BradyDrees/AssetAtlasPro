/**
 * Server-only role helpers — Unified Permissions & Auth Layer.
 *
 * Uses Supabase server client. Checks membership tables (vendor_users, user_roles).
 * NEVER reads cookies. NEVER trusts client-provided role.
 *
 * Three tiers of auth checking:
 * 1. requireVendorRole() / requirePmRole() / requireOwnerRole() — tier-level guards (existing API)
 * 2. getAuthContext() — unified context with resolved permissions
 * 3. hasPermission() / requirePermission() — granular permission checks
 *
 * Super admin (profiles.is_super_admin) bypasses ALL permission checks.
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPermissionsForRole, ALL_PERMISSIONS } from "@/lib/auth/permissions";
import type {
  VendorAuthContext,
  PmAuthContext,
  AppRole,
  PmOrgRole,
  VendorOrgRole,
  VendorEntityType,
  UserRole,
  ActiveRoleContext,
  AuthContext,
  Permission,
} from "./types";
import { PM_ROLES } from "./types";

// ============================================
// Unified Auth Context
// ============================================

/**
 * Build a unified AuthContext for the current user.
 * Resolves all memberships and computes granted permissions.
 *
 * Returns null if user is not authenticated.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch profile (is_super_admin + active_role) and memberships in parallel
  const [profileResult, rolesResult, vendorResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("is_super_admin, active_role, active_org_id")
      .eq("id", user.id)
      .single(),
    supabase
      .from("user_roles")
      .select("role, org_id, org_type")
      .eq("user_id", user.id)
      .eq("is_active", true),
    supabase
      .from("vendor_users")
      .select("vendor_org_id, role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single(),
  ]);

  const profile = profileResult.data;
  const roles = rolesResult.data ?? [];
  const vendorUser = vendorResult.data;

  const isSuperAdmin = profile?.is_super_admin === true;
  const activePlatformRole = (profile?.active_role as AppRole) ?? "pm";

  // Resolve PM membership
  const pmRole = roles.find((r) => PM_ROLES.includes(r.role));
  const pmOrgRole = pmRole ? (pmRole.role as PmOrgRole) : null;
  const pmOrgId = pmRole?.org_id ?? null;

  // Resolve vendor membership
  const vendorOrgId = vendorUser?.vendor_org_id ?? null;
  const vendorOrgRole = vendorUser?.role as VendorOrgRole | null ?? null;

  // Build permissions from all active roles
  const permissions: Permission[] = [];

  if (isSuperAdmin) {
    // Super admin gets all permissions
    permissions.push(...ALL_PERMISSIONS);
  } else {
    // Add vendor permissions
    if (vendorOrgRole) {
      permissions.push(...getPermissionsForRole(`vendor_${vendorOrgRole}`));
    }
    // Add PM permissions
    if (pmOrgRole) {
      permissions.push(...getPermissionsForRole(pmOrgRole));
    }
    // Add owner/tenant permissions
    for (const r of roles) {
      if (r.role === "owner" || r.role === "tenant") {
        permissions.push(...getPermissionsForRole(r.role));
      }
    }
  }

  // Deduplicate
  const uniquePermissions = [...new Set(permissions)];

  return {
    userId: user.id,
    isSuperAdmin,
    activePlatformRole,
    orgId: profile?.active_org_id ?? null,
    vendorOrgId,
    vendorOrgRole,
    pmOrgId,
    pmOrgRole,
    grantedPermissions: uniquePermissions,
  };
}

/**
 * Check if the current user has a specific permission.
 * Returns false if not authenticated.
 */
export async function hasPermission(permission: Permission): Promise<boolean> {
  const ctx = await getAuthContext();
  if (!ctx) return false;
  if (ctx.isSuperAdmin) return true;
  return ctx.grantedPermissions.includes(permission);
}

/**
 * Require a specific permission. Redirects to /login if not authenticated.
 * Throws an error if the permission is not granted.
 */
export async function requirePermission(permission: Permission): Promise<AuthContext> {
  const ctx = await getAuthContext();

  if (!ctx) {
    redirect("/login");
  }

  if (ctx.isSuperAdmin) return ctx;

  if (!ctx.grantedPermissions.includes(permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }

  return ctx;
}

// ============================================
// Tier-level role enforcement (existing API, now delegates)
// ============================================

/**
 * Verify the caller is an active vendor org member.
 * Super admins bypass this check.
 * Redirects to /login if unauthenticated, /pro/onboarding if no membership.
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

  // Super admin bypass — return a synthetic context
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  if (profile?.is_super_admin) {
    // Check if they actually have a vendor membership to use its org
    const { data: vendorUser } = await supabase
      .from("vendor_users")
      .select("id, vendor_org_id, role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (vendorUser) {
      return vendorUser as VendorAuthContext;
    }

    // Super admin without vendor membership — return synthetic owner context
    return { id: user.id, vendor_org_id: "", role: "owner" as VendorOrgRole };
  }

  // Check membership table — NOT cookie, NOT profile.active_role
  const { data: vendorUser } = await supabase
    .from("vendor_users")
    .select("id, vendor_org_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!vendorUser) {
    redirect("/pro/onboarding");
  }

  return vendorUser as VendorAuthContext;
}

/**
 * Verify the caller has a PM role (pm_admin, pm_manager, or pm_member).
 * Super admins bypass this check.
 * Redirects to /login if unauthenticated, /pro if no PM role.
 */
export async function requirePmRole(): Promise<PmAuthContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Super admin bypass
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  if (profile?.is_super_admin) {
    // Check if they have a PM role to use its org
    const { data: pmRole } = await supabase
      .from("user_roles")
      .select("id, org_id")
      .eq("user_id", user.id)
      .in("role", [...PM_ROLES])
      .eq("is_active", true)
      .single();

    if (pmRole) {
      return pmRole as PmAuthContext;
    }

    // Super admin without PM role — synthetic context
    return { id: user.id, org_id: null };
  }

  // Check for any PM-tier role (pm_admin, pm_manager, pm_member)
  const { data: pmRole } = await supabase
    .from("user_roles")
    .select("id, org_id")
    .eq("user_id", user.id)
    .in("role", [...PM_ROLES])
    .eq("is_active", true)
    .single();

  if (!pmRole) {
    redirect("/pro");
  }

  return pmRole as PmAuthContext;
}

/**
 * Verify the caller has an owner (homeowner) role.
 * Super admins bypass this check.
 * Redirects to /login if unauthenticated, /home/onboarding if no owner role.
 */
export async function requireOwnerRole(): Promise<{ userId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Super admin bypass
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  if (profile?.is_super_admin) {
    return { userId: user.id };
  }

  const { data: ownerRole } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .eq("is_active", true)
    .single();

  if (!ownerRole) {
    redirect("/home/onboarding");
  }

  return { userId: user.id };
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
  } else if (newRole === "pm" || PM_ROLES.includes(newRole)) {
    // "pm" is the UI tier selector; check for any pm_* role in user_roles
    const { data: pmRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .in("role", [...PM_ROLES])
      .eq("is_active", true)
      .single();

    if (!pmRole) {
      throw new Error("No active PM role");
    }
  } else if (newRole === "owner") {
    const { data: ownerRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "owner")
      .eq("is_active", true)
      .single();

    if (!ownerRole) {
      // Auto-create owner role for authenticated user
      await supabase.from("user_roles").upsert(
        { user_id: user.id, role: "owner", is_active: true },
        { onConflict: "user_id,role" }
      );
    }
  }

  // For PM tier switching, always store "pm" as active_role (UI routing)
  const storedRole = PM_ROLES.includes(newRole) ? "pm" : newRole;

  // Update profile (UI context only)
  await supabase
    .from("profiles")
    .update({
      active_role: storedRole,
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
    active_role: storedRole as AppRole,
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
