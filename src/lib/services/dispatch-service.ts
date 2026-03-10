/**
 * Dispatch Service
 *
 * Finding→WO, unit turn→WO, bid→WO creation with:
 * - Duplicate prevention via source_type + source_id
 * - Source snapshots in JSONB
 * - Domain event emission
 */
import { createClient } from "@/lib/supabase/server";
import { hasActiveWoForSource } from "@/lib/platform/idempotency";
import { createFromIntake, type WorkOrderIntake } from "./work-order-service";
import { emitEvent } from "@/lib/platform/domain-events";

// ============================================
// Types
// ============================================

export interface FindingSnapshot {
  title: string;
  description?: string;
  priority: number;
  trade?: string;
  estimatedExposure?: number;
  photoUrls?: string[];
  sectionName?: string;
  categoryName?: string;
}

export interface DispatchResult {
  success: boolean;
  woId?: string;
  error?: string;
  skipped?: boolean;
  existingWoId?: string;
}

// ============================================
// Priority Mapping
// ============================================

const PRIORITY_MAP: Record<number, string> = {
  1: "emergency",
  2: "urgent",
  3: "normal",
  4: "normal",
  5: "normal",
};

// ============================================
// Dispatch from Inspection Finding
// ============================================

/**
 * Create a work order from an inspection finding.
 *
 * - Checks for duplicate (active WO with same source)
 * - Preserves finding snapshot
 * - Maps priority: 1→emergency, 2→urgent, 3-5→normal
 */
export async function dispatchFromFinding(params: {
  findingId: string;
  finding: FindingSnapshot;
  vendorOrgId?: string;
  pmUserId: string;
  propertyName?: string;
  propertyAddress?: string;
  unitNumber?: string;
  actorUserId: string;
  force?: boolean; // skip dedup check
}): Promise<DispatchResult> {
  // Duplicate check
  if (!params.force) {
    const existing = await hasActiveWoForSource(
      "inspection_finding",
      params.findingId
    );
    if (existing.exists) {
      return {
        success: false,
        skipped: true,
        existingWoId: existing.woId,
        error: "Active work order already exists for this finding",
      };
    }
  }

  const intake: WorkOrderIntake = {
    trade: params.finding.trade ?? "general",
    urgency: (PRIORITY_MAP[params.finding.priority] ?? "normal") as "normal" | "urgent" | "emergency",
    description: `${params.finding.title}${params.finding.description ? ` — ${params.finding.description}` : ""}`,
    propertyName: params.propertyName,
    propertyAddress: params.propertyAddress,
    unitNumber: params.unitNumber,
    vendorOrgId: params.vendorOrgId,
    pmUserId: params.pmUserId,
    budgetAmount: params.finding.estimatedExposure,
    source: {
      type: "inspection_finding",
      id: params.findingId,
      snapshot: params.finding as unknown as Record<string, unknown>,
      createdVia: "manual",
      originModule: "operate",
      leadSource: "pm_assignment",
    },
  };

  const { data, error } = await createFromIntake(intake, params.actorUserId);

  if (error || !data) {
    return { success: false, error: error ?? "Failed to create work order" };
  }

  // Emit dispatch event
  await emitEvent(
    "dispatch.created",
    "work_order",
    data.id,
    {
      work_order_id: data.id,
      source_type: "inspection_finding",
      source_id: params.findingId,
      origin_module: "operate",
      vendor_org_id: params.vendorOrgId,
    },
    { id: params.actorUserId, type: "user" }
  ).catch(() => {});

  return { success: true, woId: data.id };
}

// ============================================
// Dispatch from Unit Turn
// ============================================

/**
 * Create a work order from a unit turn item.
 */
export async function dispatchFromUnitTurn(params: {
  unitTurnItemId: string;
  finding: FindingSnapshot;
  vendorOrgId?: string;
  pmUserId: string;
  propertyName?: string;
  propertyAddress?: string;
  unitNumber?: string;
  actorUserId: string;
  force?: boolean;
}): Promise<DispatchResult> {
  if (!params.force) {
    const existing = await hasActiveWoForSource(
      "unit_turn_item",
      params.unitTurnItemId
    );
    if (existing.exists) {
      return {
        success: false,
        skipped: true,
        existingWoId: existing.woId,
        error: "Active work order already exists for this unit turn item",
      };
    }
  }

  const intake: WorkOrderIntake = {
    trade: params.finding.trade ?? "general",
    urgency: (PRIORITY_MAP[params.finding.priority] ?? "normal") as "normal" | "urgent" | "emergency",
    description: params.finding.title,
    propertyName: params.propertyName,
    propertyAddress: params.propertyAddress,
    unitNumber: params.unitNumber,
    vendorOrgId: params.vendorOrgId,
    pmUserId: params.pmUserId,
    budgetAmount: params.finding.estimatedExposure,
    source: {
      type: "unit_turn_item",
      id: params.unitTurnItemId,
      snapshot: params.finding as unknown as Record<string, unknown>,
      createdVia: "manual",
      originModule: "operate",
      leadSource: "pm_assignment",
    },
  };

  const { data, error } = await createFromIntake(intake, params.actorUserId);

  if (error || !data) {
    return { success: false, error: error ?? "Failed to create work order" };
  }

  await emitEvent(
    "dispatch.created",
    "work_order",
    data.id,
    {
      work_order_id: data.id,
      source_type: "unit_turn_item",
      source_id: params.unitTurnItemId,
      origin_module: "operate",
      vendor_org_id: params.vendorOrgId,
    },
    { id: params.actorUserId, type: "user" }
  ).catch(() => {});

  return { success: true, woId: data.id };
}

// ============================================
// Bulk Dispatch from Findings
// ============================================

/**
 * Dispatch multiple findings as work orders, grouped by trade.
 * Returns results per finding.
 */
export async function bulkDispatchFindings(params: {
  findings: Array<{ id: string; finding: FindingSnapshot }>;
  vendorOrgId?: string;
  pmUserId: string;
  propertyName?: string;
  propertyAddress?: string;
  actorUserId: string;
}): Promise<DispatchResult[]> {
  const results: DispatchResult[] = [];

  for (const { id, finding } of params.findings) {
    const result = await dispatchFromFinding({
      findingId: id,
      finding,
      vendorOrgId: params.vendorOrgId,
      pmUserId: params.pmUserId,
      propertyName: params.propertyName,
      propertyAddress: params.propertyAddress,
      actorUserId: params.actorUserId,
    });
    results.push(result);
  }

  return results;
}
