/**
 * Work Order Service
 *
 * Owns WO creation (normalized intake), detail fetching, and status transitions.
 * Actions call this service; this service owns business logic + DB writes + event emission.
 */
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { transitionWorkOrder } from "@/lib/vendor/wo-state-machine";
import { emitEvent } from "@/lib/platform/domain-events";
import type { OriginModule } from "@/lib/platform/domain-events";
import type { TransitionActor } from "@/lib/vendor/wo-state-machine";

// ============================================
// Types
// ============================================

export interface WorkOrderIntake {
  trade: string;
  urgency?: "normal" | "urgent" | "emergency";
  description: string;
  propertyId?: string;
  propertyName?: string;
  propertyAddress?: string;
  unitNumber?: string;
  requesterId?: string;
  vendorOrgId?: string;
  pmUserId?: string;
  homeownerId?: string;
  estimateRequired?: boolean;
  budgetType?: string;
  budgetAmount?: number;
  source: {
    type: string;
    id?: string;
    snapshot?: Record<string, unknown>;
    createdVia: string;
    originModule: string;
    leadSource?: string;
    leadSourceDetail?: string;
  };
  scheduledDate?: string;
  scheduledTimeStart?: string;
  scheduledTimeEnd?: string;
  tenantName?: string;
  tenantPhone?: string;
  tenantLanguage?: string;
  accessNotes?: string;
  pmNotes?: string;
  tags?: string[];
}

export interface NormalizedWorkOrder {
  vendor_org_id?: string;
  pm_user_id?: string;
  homeowner_id?: string;
  homeowner_property_id?: string;
  property_name: string;
  property_address?: string;
  unit_number?: string;
  description: string;
  trade: string;
  priority: string;
  status: string;
  budget_type?: string;
  budget_amount?: number;
  source_type?: string;
  source_id?: string;
  source_snapshot?: Record<string, unknown>;
  created_via: string;
  origin_module: string;
  lead_source?: string;
  lead_source_detail?: string;
  tenant_name?: string;
  tenant_phone?: string;
  tenant_language?: string;
  access_notes?: string;
  pm_notes?: string;
  tags?: string[];
  scheduled_date?: string;
  scheduled_time_start?: string;
  scheduled_time_end?: string;
}

// ============================================
// Intake Normalizer
// ============================================

/**
 * Normalize work order intake from any source into a standard shape.
 * Used by: PM creation, Home request, dispatch from findings, etc.
 */
export function normalizeWorkOrderIntake(
  intake: WorkOrderIntake
): NormalizedWorkOrder {
  const urgencyToPriority: Record<string, string> = {
    normal: "normal",
    urgent: "urgent",
    emergency: "emergency",
  };

  return {
    vendor_org_id: intake.vendorOrgId ?? undefined,
    pm_user_id: intake.pmUserId ?? undefined,
    homeowner_id: intake.homeownerId ?? undefined,
    homeowner_property_id: intake.propertyId ?? undefined,
    property_name: intake.propertyName ?? intake.propertyAddress ?? "Property",
    property_address: intake.propertyAddress ?? undefined,
    unit_number: intake.unitNumber ?? undefined,
    description: intake.description,
    trade: intake.trade,
    priority: urgencyToPriority[intake.urgency ?? "normal"] ?? "normal",
    status: intake.vendorOrgId ? "assigned" : "draft",
    budget_type: intake.budgetType ?? (intake.estimateRequired ? "estimate_required" : undefined),
    budget_amount: intake.budgetAmount ?? undefined,
    source_type: intake.source.type,
    source_id: intake.source.id ?? undefined,
    source_snapshot: intake.source.snapshot ?? undefined,
    created_via: intake.source.createdVia,
    origin_module: intake.source.originModule,
    lead_source: intake.source.leadSource ?? "pm_assignment",
    lead_source_detail: intake.source.leadSourceDetail ?? undefined,
    tenant_name: intake.tenantName ?? undefined,
    tenant_phone: intake.tenantPhone ?? undefined,
    tenant_language: intake.tenantLanguage ?? undefined,
    access_notes: intake.accessNotes ?? undefined,
    pm_notes: intake.pmNotes ?? undefined,
    tags: intake.tags ?? undefined,
    scheduled_date: intake.scheduledDate ?? undefined,
    scheduled_time_start: intake.scheduledTimeStart ?? undefined,
    scheduled_time_end: intake.scheduledTimeEnd ?? undefined,
  };
}

/**
 * Create a work order from normalized intake.
 * Inserts the record, emits creation event, returns the new WO ID.
 */
export async function createFromIntake(
  intake: WorkOrderIntake,
  actorUserId?: string
): Promise<{ data: { id: string } | null; error: string | null }> {
  const supabase = await createClient();
  const normalized = normalizeWorkOrderIntake(intake);

  // Clean undefined fields
  const insertData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(normalized)) {
    if (value !== undefined) {
      insertData[key] = value;
    }
  }

  const { data, error } = await supabase
    .from("vendor_work_orders")
    .insert(insertData)
    .select("id")
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  // Emit creation event (non-blocking)
  emitEvent(
    "work_order.created",
    "work_order",
    data.id,
    {
      vendor_org_id: normalized.vendor_org_id,
      work_order_id: data.id,
      origin_module: normalized.origin_module as OriginModule,
      source_type: normalized.source_type,
      source_id: normalized.source_id,
      trade: normalized.trade,
      priority: normalized.priority,
    },
    { id: actorUserId, type: "user" }
  ).catch(() => {});

  return { data: { id: data.id }, error: null };
}

/**
 * Transition a work order status via the canonical state machine.
 * Thin wrapper for service layer consumers.
 */
export async function changeStatus(
  woId: string,
  newStatus: string,
  actor: TransitionActor,
  metadata?: Parameters<typeof transitionWorkOrder>[3]
) {
  return transitionWorkOrder(woId, newStatus, actor, metadata);
}

// ============================================
// PM Fetchers (for Operate WO Detail)
// ============================================

/**
 * Get WO summary for PM detail page.
 */
export async function getPmWorkOrderSummary(woId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_work_orders")
    .select(`
      *,
      vendor_organizations!vendor_work_orders_vendor_org_id_fkey(
        id, name, logo_url, phone, email
      )
    `)
    .eq("id", woId)
    .single();

  return { data, error: error?.message ?? null };
}

/**
 * Get WO photos for PM detail page, paginated.
 */
export async function getPmWorkOrderPhotos(woId: string, limit = 50) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_wo_photos")
    .select("*")
    .eq("work_order_id", woId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return { data: data ?? [], error: error?.message ?? null };
}

/**
 * Get WO time log entries for PM detail page.
 */
export async function getPmWorkOrderTimeLog(woId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_wo_time_entries")
    .select("*")
    .eq("work_order_id", woId)
    .order("clock_in", { ascending: false });

  return { data: data ?? [], error: error?.message ?? null };
}

/**
 * Get linked estimate + invoice for PM detail page.
 */
export async function getPmWorkOrderFinancials(woId: string) {
  const supabase = await createClient();

  const [estimateResult, invoiceResult] = await Promise.all([
    supabase
      .from("vendor_estimates")
      .select("id, estimate_number, status, total, created_at")
      .eq("work_order_id", woId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("vendor_invoices")
      .select("id, invoice_number, status, total, created_at")
      .eq("work_order_id", woId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    estimate: estimateResult.data,
    invoice: invoiceResult.data,
    error: estimateResult.error?.message ?? invoiceResult.error?.message ?? null,
  };
}
