/**
 * Canonical Work Order State Machine
 *
 * ALL WO status transitions go through transitionWorkOrder().
 * No raw .update({ status }) calls anywhere in the codebase.
 *
 * States: draft → assigned → accepted → scheduled → en_route → on_site →
 *         in_progress → completed → done_pending_approval → invoiced → paid
 * Also:   on_hold (from any active state, returns to previous_status)
 *         declined, cancelled
 */
import type { WoStatus } from "./types";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "./role-helpers";
import { emitEvent } from "@/lib/platform/domain-events";

// ============================================
// Types
// ============================================

export type TransitionActor = "vendor" | "pm" | "homeowner" | "system";

export interface TransitionContext {
  /** Auth user ID of the actor */
  actorUserId?: string;
  /** Vendor org the actor belongs to */
  actorVendorOrgId?: string;
  /** PM user ID if actor is PM */
  actorPmUserId?: string;
  /** Vendor org assigned to the WO */
  woVendorOrgId?: string;
  /** PM user who created/owns the WO */
  woPmUserId?: string;
  /** Homeowner user ID on the WO */
  woHomeownerId?: string;
}

interface TransitionRule {
  to: WoStatus;
  allowedBy: TransitionActor[];
}

export interface TransitionResult {
  success: boolean;
  error?: string;
  previousStatus?: WoStatus;
  newStatus?: WoStatus;
}

// ============================================
// Transition Map (readable reference)
// ============================================

const TRANSITION_RULES: Record<string, TransitionRule[]> = {
  draft: [
    { to: "assigned", allowedBy: ["pm", "vendor", "system", "homeowner"] },
    { to: "cancelled", allowedBy: ["pm", "vendor", "homeowner"] },
  ],
  assigned: [
    { to: "accepted", allowedBy: ["vendor"] },
    { to: "declined", allowedBy: ["vendor"] },
    { to: "cancelled", allowedBy: ["pm", "homeowner"] },
    { to: "on_hold", allowedBy: ["pm"] },
  ],
  accepted: [
    { to: "scheduled", allowedBy: ["vendor", "pm"] },
    { to: "in_progress", allowedBy: ["vendor"] },
    { to: "on_hold", allowedBy: ["pm", "vendor"] },
    { to: "cancelled", allowedBy: ["pm"] },
  ],
  scheduled: [
    { to: "en_route", allowedBy: ["vendor"] },
    { to: "in_progress", allowedBy: ["vendor"] },
    { to: "on_hold", allowedBy: ["pm", "vendor"] },
    { to: "cancelled", allowedBy: ["pm"] },
  ],
  en_route: [
    { to: "on_site", allowedBy: ["vendor"] },
    { to: "on_hold", allowedBy: ["pm"] },
  ],
  on_site: [
    { to: "in_progress", allowedBy: ["vendor"] },
    { to: "on_hold", allowedBy: ["pm"] },
  ],
  in_progress: [
    { to: "completed", allowedBy: ["vendor"] },
    { to: "done_pending_approval", allowedBy: ["vendor"] },
    { to: "on_hold", allowedBy: ["vendor", "pm"] },
  ],
  completed: [
    { to: "invoiced", allowedBy: ["vendor", "system"] },
  ],
  done_pending_approval: [
    { to: "completed", allowedBy: ["pm"] },
    { to: "in_progress", allowedBy: ["pm"] },
    { to: "invoiced", allowedBy: ["vendor"] },
  ],
  invoiced: [
    { to: "paid", allowedBy: ["pm", "system", "homeowner"] },
  ],
  paid: [],
  declined: [
    { to: "assigned", allowedBy: ["pm"] },
    { to: "cancelled", allowedBy: ["pm"] },
  ],
  cancelled: [],
  on_hold: [
    // Returns to previous_status — target is dynamic
    { to: "accepted", allowedBy: ["vendor", "pm"] },
    { to: "assigned", allowedBy: ["pm"] },
    { to: "scheduled", allowedBy: ["vendor", "pm"] },
    { to: "in_progress", allowedBy: ["vendor", "pm"] },
    { to: "cancelled", allowedBy: ["pm"] },
  ],
};

// ============================================
// Validation
// ============================================

/**
 * Check if a transition is allowed.
 * Evaluates:
 *   1. Is currentStatus → nextStatus in the transition map?
 *   2. Does actor have permission for this specific transition pair?
 *   3. Ownership context when available
 */
export function canTransition(
  currentStatus: WoStatus | string,
  nextStatus: WoStatus | string,
  actor: TransitionActor,
  context?: TransitionContext
): { allowed: boolean; reason?: string } {
  const rules = TRANSITION_RULES[currentStatus];

  if (!rules) {
    return { allowed: false, reason: `Unknown status "${currentStatus}"` };
  }

  if (rules.length === 0) {
    return { allowed: false, reason: `No transitions from "${currentStatus}"` };
  }

  // Find a matching rule
  const matchingRule = rules.find(
    (r) => r.to === nextStatus && r.allowedBy.includes(actor)
  );

  if (!matchingRule) {
    // Check if transition exists at all (but role is wrong)
    const transitionExists = rules.some((r) => r.to === nextStatus);
    if (transitionExists) {
      return {
        allowed: false,
        reason: `Actor "${actor}" cannot transition from "${currentStatus}" to "${nextStatus}"`,
      };
    }
    return {
      allowed: false,
      reason: `Invalid transition: "${currentStatus}" → "${nextStatus}"`,
    };
  }

  // Ownership context checks (when context is provided)
  if (context) {
    if (actor === "vendor" && context.actorVendorOrgId && context.woVendorOrgId) {
      if (context.actorVendorOrgId !== context.woVendorOrgId) {
        return {
          allowed: false,
          reason: "Vendor does not own this work order",
        };
      }
    }
  }

  return { allowed: true };
}

/**
 * Get valid next statuses for a given current status + actor role.
 */
export function getValidTransitions(
  currentStatus: WoStatus | string,
  actor: TransitionActor
): string[] {
  const rules = TRANSITION_RULES[currentStatus] ?? [];
  return rules
    .filter((r) => r.allowedBy.includes(actor))
    .map((r) => r.to);
}

// ============================================
// Canonical Transition Function
// ============================================

/**
 * THE canonical way to change a work order status.
 * Every status change in the entire platform MUST go through this function.
 *
 * 1. Fetches current WO state
 * 2. Validates transition via canTransition()
 * 3. Handles on_hold (save/restore previous_status)
 * 4. Updates status + status_changed_at
 * 5. Emits domain event
 * 6. Triggers side effects (SMS, notifications)
 * 7. Logs activity
 */
export async function transitionWorkOrder(
  woId: string,
  newStatus: WoStatus | string,
  actor: TransitionActor,
  metadata?: {
    actorUserId?: string;
    vendorOrgId?: string;
    pmUserId?: string;
    homeownerId?: string;
    scheduledDate?: string;
    scheduledTimeStart?: string;
    scheduledTimeEnd?: string;
    declineReason?: string;
    completionNotes?: string;
    extra?: Record<string, unknown>;
  }
): Promise<TransitionResult> {
  const supabase = await createClient();

  // 1. Fetch current WO
  const { data: wo, error: fetchError } = await supabase
    .from("vendor_work_orders")
    .select("id, status, previous_status, vendor_org_id, pm_user_id, homeowner_id, property_name")
    .eq("id", woId)
    .single();

  if (fetchError || !wo) {
    return { success: false, error: "Work order not found" };
  }

  const currentStatus = wo.status as WoStatus;

  // 2. Determine actual target status
  let targetStatus = newStatus;

  // If transitioning FROM on_hold with no explicit target, use previous_status
  if (currentStatus === "on_hold" && newStatus === "resume" && wo.previous_status) {
    targetStatus = wo.previous_status;
  }

  // 3. Validate transition
  const context: TransitionContext = {
    actorUserId: metadata?.actorUserId,
    actorVendorOrgId: metadata?.vendorOrgId,
    actorPmUserId: metadata?.pmUserId,
    woVendorOrgId: wo.vendor_org_id,
    woPmUserId: wo.pm_user_id,
    woHomeownerId: wo.homeowner_id,
  };

  const check = canTransition(currentStatus, targetStatus, actor, context);
  if (!check.allowed) {
    return { success: false, error: check.reason };
  }

  // 3b. Checklist validation on completion transitions
  if (
    (targetStatus === "completed" || targetStatus === "done_pending_approval") &&
    currentStatus !== "completed"
  ) {
    try {
      const { validateChecklistCompletion } = await import(
        "@/app/actions/vendor-checklists"
      );
      const checkResult = await validateChecklistCompletion(woId);
      if (!checkResult.valid) {
        return {
          success: false,
          error: checkResult.error ?? "Required checklist items incomplete",
        };
      }
    } catch {
      // If checklist module not available, skip validation
    }
  }

  // 4. Build update payload
  const updatePayload: Record<string, unknown> = {
    status: targetStatus,
    updated_at: new Date().toISOString(),
  };

  // Handle on_hold transitions
  if (targetStatus === "on_hold") {
    // Save current status so we can return to it
    updatePayload.previous_status = currentStatus;
  } else if (currentStatus === "on_hold") {
    // Returning from on_hold — clear previous_status
    updatePayload.previous_status = null;
  }

  // Status-specific fields
  if (targetStatus === "scheduled" && metadata?.scheduledDate) {
    updatePayload.scheduled_date = metadata.scheduledDate;
    if (metadata.scheduledTimeStart) updatePayload.scheduled_time_start = metadata.scheduledTimeStart;
    if (metadata.scheduledTimeEnd) updatePayload.scheduled_time_end = metadata.scheduledTimeEnd;
  }

  // Set responded_at on first transition OUT of assigned (any target)
  if (currentStatus === "assigned" && targetStatus !== "assigned") {
    updatePayload.responded_at = new Date().toISOString();
  }

  if ((targetStatus === "in_progress" || targetStatus === "on_site") && currentStatus !== "in_progress") {
    updatePayload.started_at = new Date().toISOString();
  }

  if (targetStatus === "completed" || targetStatus === "done_pending_approval") {
    updatePayload.completed_at = new Date().toISOString();
    if (metadata?.completionNotes) updatePayload.completion_notes = metadata.completionNotes;
  }

  if (targetStatus === "declined" && metadata?.declineReason) {
    updatePayload.decline_reason = metadata.declineReason;
  }

  // 5. Perform update (optimistic lock on current status)
  const { error: updateError } = await supabase
    .from("vendor_work_orders")
    .update(updatePayload)
    .eq("id", woId)
    .eq("status", currentStatus);

  if (updateError) {
    return { success: false, error: `Failed to update: ${updateError.message}` };
  }

  // 6. Emit domain event (non-blocking)
  emitEvent(
    "work_order.status_changed",
    "work_order",
    woId,
    {
      vendor_org_id: wo.vendor_org_id,
      work_order_id: woId,
      previous_status: currentStatus,
      new_status: targetStatus,
      origin_module: "vendor",
      property_name: wo.property_name,
      ...(metadata?.extra ?? {}),
    },
    { id: metadata?.actorUserId, type: actor === "system" ? "system" : "user" }
  ).catch(() => {});

  // 7. Log activity (non-blocking)
  logActivity({
    entityType: "work_order",
    entityId: woId,
    action: "status_changed",
    oldValue: currentStatus,
    newValue: targetStatus as string,
    metadata: {
      actor,
      ...(metadata?.extra ?? {}),
    },
  }).catch(() => {});

  // 8. Fire SMS notifications for tenant-facing statuses (non-blocking)
  const SMS_STATUSES = ["scheduled", "en_route", "on_site", "completed"];
  if (SMS_STATUSES.includes(targetStatus as string)) {
    import("@/app/actions/vendor-sms-notifications")
      .then(({ sendWoStatusSms }) => {
        void sendWoStatusSms(woId, targetStatus as string);
      })
      .catch(() => {});
  }

  // 9. Create notification for relevant parties (non-blocking)
  const notifTitle = `Work order status: ${targetStatus}`;
  const notifBody = wo.property_name
    ? `${wo.property_name} — ${currentStatus} → ${targetStatus}`
    : `Status changed to ${targetStatus}`;

  if (wo.pm_user_id && (actor === "vendor" || actor === "system")) {
    void supabase
      .from("vendor_notifications")
      .insert({
        user_id: wo.pm_user_id,
        type: "wo_status",
        title: notifTitle,
        body: notifBody,
        reference_type: "work_order",
        reference_id: woId,
      });
  }

  return {
    success: true,
    previousStatus: currentStatus,
    newStatus: targetStatus as WoStatus,
  };
}

// ============================================
// Backward compatibility re-exports
// (existing code imports from ./state-machine)
// ============================================

export {
  validateWoTransition,
  validateEstimateTransition,
  validateInvoiceTransition,
  getValidWoTransitions,
  getValidEstimateTransitions,
  getValidInvoiceTransitions,
  ESTIMATE_TRANSITIONS,
  INVOICE_TRANSITIONS,
  vendorOrgRoleToTransitionRole,
} from "./state-machine";
