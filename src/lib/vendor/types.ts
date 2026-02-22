// ============================================
// Vendor Side — Core TypeScript Types
// ============================================

/** Roles a user can hold */
export type AppRole = "pm" | "vendor" | "owner" | "tenant";

/** Org types for role scoping */
export type OrgType = "pm_org" | "vendor_org";

/** Vendor org-level roles */
export type VendorOrgRole = "owner" | "admin" | "office_manager" | "tech";

/** Vendor org status */
export type VendorOrgStatus = "active" | "suspended" | "inactive";

/** PM–Vendor relationship status */
export type RelationshipStatus = "pending" | "active" | "suspended" | "terminated";

/** Who initiated the invite */
export type InvitedBy = "pm" | "vendor";

/** Payment terms */
export type PaymentTerms = "net_15" | "net_30" | "net_45" | "net_60";

// ============================================
// Tables
// ============================================

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  org_id: string | null;
  org_type: OrgType | null;
  is_active: boolean;
  created_at: string;
}

export interface VendorOrganization {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  service_radius_miles: number;
  max_concurrent_jobs: number;
  trades: string[];
  status: VendorOrgStatus;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorUser {
  id: string;
  user_id: string;
  vendor_org_id: string;
  role: VendorOrgRole;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  trades: string[];
  is_active: boolean;
  created_at: string;
}

export interface VendorPmRelationship {
  id: string;
  vendor_org_id: string;
  pm_user_id: string;
  status: RelationshipStatus;
  invited_by: InvitedBy | null;
  invite_token_hash: string | null;
  invite_expires_at: string | null;
  invite_consumed: boolean;
  notes: string | null;
  pm_preferences: Record<string, unknown>;
  payment_terms: string;
  updated_by: string | null;
  created_at: string;
}

export interface VendorActivityLog {
  id: string;
  actor_id: string;
  actor_role: string;
  entity_type: VendorEntityType;
  entity_id: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** Entity types that can be logged in the activity log */
export type VendorEntityType =
  | "work_order"
  | "estimate"
  | "invoice"
  | "credential"
  | "relationship"
  | "vendor_org"
  | "vendor_user";

// ============================================
// Work Order Types (Phase 2, defined early for state-machine)
// ============================================

export type WoStatus =
  | "assigned"
  | "accepted"
  | "scheduled"
  | "en_route"
  | "on_site"
  | "in_progress"
  | "completed"
  | "invoiced"
  | "paid"
  | "declined"
  | "on_hold";

export type WoPriority = "normal" | "urgent" | "emergency";

export type WoBudgetType = "nte" | "approved" | "estimate_required";

// ============================================
// Estimate Types (Phase 3, defined early for state-machine)
// ============================================

export type EstimateStatus =
  | "draft"
  | "sent"
  | "pm_reviewing"
  | "with_owner"
  | "changes_requested"
  | "approved"
  | "declined"
  | "expired";

export type EstimateTierMode = "none" | "section" | "line_item";

export type EstimateTier = "good" | "better" | "best";

export type EstimateItemType =
  | "labor"
  | "material"
  | "equipment"
  | "subcontractor"
  | "other";

// ============================================
// Invoice Types (Phase 4, defined early for state-machine)
// ============================================

export type InvoiceStatus =
  | "draft"
  | "submitted"
  | "pm_approved"
  | "processing"
  | "paid"
  | "disputed";

export type InvoiceItemType = "labor" | "material" | "other";

// ============================================
// Credential Types (Phase 5)
// ============================================

export type CredentialType =
  | "insurance_gl"
  | "insurance_wc"
  | "license"
  | "w9"
  | "certification"
  | "bond"
  | "other";

export type CredentialStatus = "active" | "expiring_soon" | "expired" | "revoked";

// ============================================
// Notification Types
// ============================================

export interface VendorNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

// ============================================
// Composite / Utility Types
// ============================================

/** Return type from requireVendorRole() */
export interface VendorAuthContext {
  id: string;
  vendor_org_id: string;
  role: VendorOrgRole;
}

/** Return type from requirePmRole() */
export interface PmAuthContext {
  id: string;
  org_id: string | null;
}

/** Profile active context (UI only, not a security boundary) */
export interface ActiveRoleContext {
  active_role: AppRole;
  active_org_id: string | null;
}
