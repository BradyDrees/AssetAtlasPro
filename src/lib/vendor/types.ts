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
  | "vendor_user"
  | "client"
  | "expense"
  | "skill";

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
  | "done_pending_approval"
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

export interface VendorCredential {
  id: string;
  vendor_org_id: string;
  type: CredentialType;
  name: string;
  document_number: string | null;
  storage_path: string | null;
  file_name: string | null;
  file_size: number | null;
  issued_date: string | null;
  expiration_date: string | null;
  status: CredentialStatus;
  notes: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCredentialInput {
  type: CredentialType;
  name: string;
  document_number?: string;
  issued_date?: string;
  expiration_date?: string;
  notes?: string;
}

export interface UpdateCredentialInput {
  name?: string;
  document_number?: string;
  issued_date?: string;
  expiration_date?: string;
  notes?: string;
}

export interface UpdateVendorOrgInput {
  name?: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  service_radius_miles?: number;
  max_concurrent_jobs?: number;
  trades?: string[];
}

/** Display colors for credential status */
export const CREDENTIAL_STATUS_COLORS: Record<CredentialStatus, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  expiring_soon: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  expired: "bg-red-500/20 text-red-400 border-red-500/30",
  revoked: "bg-content-quaternary/20 text-content-quaternary border-content-quaternary/30",
};

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

// ============================================
// Org Settings (Phase 5 — Workiz Enhancements)
// ============================================

/** Custom field schema definition */
export interface CustomFieldSchema {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select";
  options?: string[];
  required?: boolean;
}

/** Numbering config for estimates/invoices */
export interface NumberingConfig {
  estimate_prefix: string;
  invoice_prefix: string;
  next_estimate: number;
  next_invoice: number;
}

/** Tax rate entry */
export interface TaxRate {
  name: string;
  rate: number;
  is_default?: boolean;
}

/** Working hours config */
export interface WorkingHoursConfig {
  start: string; // "HH:mm"
  end: string; // "HH:mm"
  days: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
}

/** Custom field schemas keyed by entity type */
export interface CustomFieldSchemas {
  work_orders: CustomFieldSchema[];
  estimates: CustomFieldSchema[];
  invoices: CustomFieldSchema[];
}

/** Full org settings — replaced atomically, never partially mutated */
export interface VendorOrgSettings {
  settings_version: number;
  numbering: NumberingConfig;
  tax_rates: TaxRate[];
  job_types: string[];
  sub_statuses: string[];
  working_hours: WorkingHoursConfig;
  auto_show_estimate: boolean;
  custom_field_schemas: CustomFieldSchemas;
}

/** Default org settings (matches migration default) */
export const DEFAULT_ORG_SETTINGS: VendorOrgSettings = {
  settings_version: 1,
  numbering: {
    estimate_prefix: "EST",
    invoice_prefix: "INV",
    next_estimate: 1,
    next_invoice: 1,
  },
  tax_rates: [],
  job_types: [
    "service",
    "repair",
    "emergency",
    "maintenance",
    "inspection",
    "turn",
    "estimate_visit",
  ],
  sub_statuses: [
    "pending_parts",
    "waiting_approval",
    "done_pending_payment",
  ],
  working_hours: { start: "08:00", end: "17:00", days: [1, 2, 3, 4, 5] },
  auto_show_estimate: false,
  custom_field_schemas: {
    work_orders: [],
    estimates: [],
    invoices: [],
  },
};

/** Skill proficiency levels */
export type SkillProficiency = "learning" | "competent" | "expert";

/** Client type for direct vendor clients */
export type ClientType = "direct" | "homeowner" | "business" | "other";

/** Document template types */
export type DocumentTemplateType =
  | "terms"
  | "contract"
  | "warranty"
  | "scope"
  | "cover"
  | "other";

/** Expense categories */
export type ExpenseCategory =
  | "fuel"
  | "tools"
  | "supplies"
  | "materials"
  | "subcontractor"
  | "permits"
  | "insurance"
  | "office"
  | "vehicle"
  | "travel"
  | "meals"
  | "other";
