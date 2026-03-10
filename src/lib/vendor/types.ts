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
  slug: string | null;
  booking_enabled: boolean;
  booking_headline: string | null;
  booking_description: string | null;
  booking_trades: string[] | null;
  api_key: string | null;
  avg_rating: number;
  total_ratings: number;
  response_time_label: string | null;
  emergency_available: boolean;
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
  | "skill"
  | "inventory";

// ============================================
// Work Order Types (Phase 2, defined early for state-machine)
// ============================================

export type WoStatus =
  | "draft"
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
  | "on_hold"
  | "cancelled";

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
  slug?: string | null;
  booking_enabled?: boolean;
  booking_headline?: string | null;
  booking_description?: string | null;
  booking_trades?: string[] | null;
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
  sms_notification_statuses?: string[];
  auto_followups_enabled?: boolean;
  google_review_url?: string;
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

// ============================================
// Twilio Phone Masking
// ============================================

export type PhoneNumberStatus = "active" | "released";
export type MessageDirection = "inbound" | "outbound";
export type MessageType = "sms" | "call";
export type MessageStatus = "sent" | "delivered" | "failed" | "received" | "queued";

export interface VendorPhoneNumber {
  id: string;
  vendor_org_id: string;
  twilio_number: string;
  twilio_sid: string;
  friendly_name: string;
  is_default: boolean;
  status: PhoneNumberStatus;
  created_at: string;
  updated_at: string;
}

export interface VendorMessage {
  id: string;
  vendor_org_id: string;
  work_order_id: string | null;
  phone_number_id: string | null;
  sender_user_id: string | null;
  direction: MessageDirection;
  message_type: MessageType;
  from_number: string;
  to_number: string;
  body: string | null;
  status: MessageStatus;
  twilio_sid: string | null;
  duration_seconds: number | null;
  read_at: string | null;
  created_at: string;
}

// ============================================
// PM Vendor Management (Phase 6)
// ============================================

export interface EnrichedPmVendor {
  relationship_id: string;
  status: RelationshipStatus;
  vendor_org_id: string;
  vendor_name: string;
  vendor_email: string | null;
  vendor_phone: string | null;
  vendor_logo: string | null;
  trades: string[];
  invite_expires_at: string | null;
  invited_by: InvitedBy | null;
  payment_terms: string;
  notes: string | null;
  created_at: string;
  stats: {
    active_jobs: number;
    total_jobs: number;
    total_spent_cents: number;
  };
  credential_summary: {
    eligible: boolean;
    missing_critical: boolean;
    warnings: string[];
  };
}

export interface ConversationPreview {
  work_order_id: string;
  property_name: string | null;
  tenant_name: string | null;
  tenant_phone: string | null;
  last_message: string | null;
  last_message_at: string;
  unread_count: number;
}

// ============================================
// Scheduling Calendar (Phase 7)
// ============================================

export type ScheduleJob = {
  id: string;
  title: string;
  propertyName: string;
  trade: string;
  priority: WoPriority;
  status: string;
  scheduled_date: string | null;
  scheduled_time_start: string | null; // HH:MM (normalized)
  scheduled_time_end: string | null;   // HH:MM (normalized)
  assigned_to?: string | null;
  vendor_org_id?: string | null;
  pm_org_id?: string | null;
  property_zip?: string | null;
  property_address?: string | null;
  property_lat?: number | null;
  property_lng?: number | null;
};

/** Statuses that qualify for the unscheduled jobs panel */
export const SCHEDULABLE_STATUSES: WoStatus[] = [
  "assigned",
  "accepted",
  "scheduled",
  "en_route",
  "on_site",
  "in_progress",
];

/** "08:00:00" → "08:00", "9:00" → "09:00", null → null */
export function normalizeTime(t: string | null): string | null {
  if (!t) return null;
  const [hRaw, mRaw] = t.split(":");
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Map a VendorWorkOrder (or PM work order — same shape) to ScheduleJob.
 * Normalizes time fields and builds a display title.
 */
export function toScheduleJob(wo: {
  id: string;
  property_name?: string | null;
  property_address?: string | null;
  property_zip?: string | null;
  property_lat?: number | null;
  property_lng?: number | null;
  description?: string | null;
  trade?: string | null;
  priority: string;
  status: string;
  scheduled_date?: string | null;
  scheduled_time_start?: string | null;
  scheduled_time_end?: string | null;
  assigned_to?: string | null;
  vendor_org_id?: string | null;
  pm_user_id?: string | null;
}): ScheduleJob {
  return {
    id: wo.id,
    title: wo.property_name ?? wo.description ?? "Work Order",
    propertyName: wo.property_name ?? "",
    trade: wo.trade ?? "",
    priority: wo.priority as WoPriority,
    status: wo.status,
    scheduled_date: wo.scheduled_date ?? null,
    scheduled_time_start: normalizeTime(wo.scheduled_time_start ?? null),
    scheduled_time_end: normalizeTime(wo.scheduled_time_end ?? null),
    assigned_to: wo.assigned_to ?? null,
    vendor_org_id: wo.vendor_org_id ?? null,
    pm_org_id: wo.pm_user_id ?? null,
    property_zip: wo.property_zip ?? null,
    property_address: wo.property_address ?? null,
    property_lat: wo.property_lat ?? null,
    property_lng: wo.property_lng ?? null,
  };
}
