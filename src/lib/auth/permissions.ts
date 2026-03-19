/**
 * Permission Registry — Single Source of Truth
 *
 * Every server action reads from PERMISSIONS_BY_ROLE to determine
 * what a user can do. No scattered checks, no inferred arrays.
 *
 * Keys use the resolved role string:
 * - Vendor org roles: "vendor_owner", "vendor_admin", "vendor_office_manager", "vendor_tech"
 * - PM org roles: "pm_admin", "pm_manager", "pm_member"
 * - Homeowner/tenant: "owner", "tenant"
 */
import type { Permission } from "@/lib/vendor/types";

export const PERMISSIONS_BY_ROLE: Record<string, readonly Permission[]> = {
  // ─── Vendor org roles (from vendor_users.role) ───
  vendor_owner: [
    "invite_team",
    "deactivate_team",
    "manage_roles",
    "create_wo",
    "assign_jobs",
    "manage_schedule",
    "view_jobs",
    "manage_billing",
    "create_estimates",
    "create_invoices",
  ],
  vendor_admin: [
    "invite_team",
    "deactivate_team",
    "manage_roles",
    "create_wo",
    "assign_jobs",
    "manage_schedule",
    "view_jobs",
    "manage_billing",
    "create_estimates",
    "create_invoices",
  ],
  vendor_office_manager: [
    "assign_jobs",
    "manage_schedule",
    "view_jobs",
    "create_estimates",
    "create_invoices",
  ],
  vendor_tech: [
    "view_assigned_jobs",
    "update_job_status",
  ],

  // ─── PM org roles (from user_roles.role) ───
  pm_admin: [
    "manage_pm_org_users",
    "invite_team",
    "deactivate_team",
    "create_wo",
    "create_projects",
    "manage_vendors",
    "manage_settings",
    "manage_billing",
    "view_operate",
  ],
  pm_manager: [
    "create_wo",
    "create_projects",
    "manage_vendors",
    "view_operate",
  ],
  pm_member: [
    "view_operate",
  ],

  // ─── Homeowner / Tenant (from user_roles.role) ───
  owner: [
    "manage_property",
    "create_home_wo",
    "manage_home_vendors",
  ],
  tenant: [
    "view_property",
    "create_maintenance_request",
  ],
} as const;

/** All permissions as a flat set (for super admin grant-all) */
export const ALL_PERMISSIONS: readonly Permission[] = [
  ...new Set(Object.values(PERMISSIONS_BY_ROLE).flat()),
];

/**
 * Resolve permissions for a given role key.
 * Returns empty array for unknown roles (safe default).
 */
export function getPermissionsForRole(roleKey: string): readonly Permission[] {
  return PERMISSIONS_BY_ROLE[roleKey] ?? [];
}
