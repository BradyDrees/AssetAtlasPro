/**
 * State machine for work order, estimate, and invoice status transitions.
 * Server-side enforcement — blocks arbitrary status writes.
 * Every transition is validated against the allowed map + role permissions.
 */
import type {
  WoStatus,
  EstimateStatus,
  InvoiceStatus,
  VendorOrgRole,
} from "./types";

// ============================================
// Work Order State Machine
// ============================================

/** Which roles can trigger each transition */
type TransitionRole = "vendor" | "pm";

interface TransitionRule {
  to: WoStatus[];
  allowedBy: TransitionRole[];
}

/**
 * Work order status transition map.
 * Key = current status, value = { to: allowed next statuses, allowedBy: which role can trigger }
 */
export const WO_TRANSITIONS: Record<WoStatus, TransitionRule[]> = {
  assigned: [
    { to: ["accepted"], allowedBy: ["vendor"] },
    { to: ["declined"], allowedBy: ["vendor"] },
  ],
  accepted: [
    { to: ["scheduled"], allowedBy: ["vendor", "pm"] },
    { to: ["on_hold"], allowedBy: ["pm"] },
  ],
  scheduled: [
    { to: ["en_route"], allowedBy: ["vendor"] },
    { to: ["on_hold"], allowedBy: ["pm"] },
  ],
  en_route: [
    { to: ["on_site"], allowedBy: ["vendor"] },
  ],
  on_site: [
    { to: ["in_progress"], allowedBy: ["vendor"] },
  ],
  in_progress: [
    { to: ["completed"], allowedBy: ["vendor"] },
    { to: ["on_hold"], allowedBy: ["vendor", "pm"] },
  ],
  completed: [
    { to: ["invoiced"], allowedBy: ["vendor"] },
  ],
  invoiced: [
    { to: ["paid"], allowedBy: ["pm"] },
  ],
  paid: [],
  declined: [
    { to: ["assigned"], allowedBy: ["pm"] }, // PM can re-assign
  ],
  on_hold: [
    { to: ["accepted"], allowedBy: ["vendor", "pm"] },
    { to: ["scheduled"], allowedBy: ["vendor", "pm"] },
    { to: ["in_progress"], allowedBy: ["vendor"] },
  ],
};

/**
 * Validate a work order status transition.
 * Returns { valid: true } or { valid: false, reason: string }.
 */
export function validateWoTransition(
  currentStatus: WoStatus,
  newStatus: WoStatus,
  callerRole: TransitionRole
): { valid: true } | { valid: false; reason: string } {
  const rules = WO_TRANSITIONS[currentStatus];

  if (!rules || rules.length === 0) {
    return {
      valid: false,
      reason: `No transitions allowed from status "${currentStatus}"`,
    };
  }

  for (const rule of rules) {
    if (rule.to.includes(newStatus) && rule.allowedBy.includes(callerRole)) {
      return { valid: true };
    }
  }

  // Check if the transition exists but caller role is wrong
  const transitionExists = rules.some((r) => r.to.includes(newStatus));
  if (transitionExists) {
    return {
      valid: false,
      reason: `Role "${callerRole}" cannot transition from "${currentStatus}" to "${newStatus}"`,
    };
  }

  return {
    valid: false,
    reason: `Invalid transition: "${currentStatus}" → "${newStatus}"`,
  };
}

/**
 * Get the list of valid next statuses for a work order given the caller's role.
 */
export function getValidWoTransitions(
  currentStatus: WoStatus,
  callerRole: TransitionRole
): WoStatus[] {
  const rules = WO_TRANSITIONS[currentStatus] ?? [];
  const result: WoStatus[] = [];

  for (const rule of rules) {
    if (rule.allowedBy.includes(callerRole)) {
      result.push(...rule.to);
    }
  }

  return result;
}

/**
 * Derive the TransitionRole from a VendorOrgRole.
 * Any vendor org member is treated as "vendor" for transitions.
 */
export function vendorOrgRoleToTransitionRole(
  _role: VendorOrgRole
): TransitionRole {
  return "vendor";
}

// ============================================
// Estimate State Machine
// ============================================

interface EstimateTransitionRule {
  to: EstimateStatus[];
  allowedBy: TransitionRole[];
}

export const ESTIMATE_TRANSITIONS: Record<EstimateStatus, EstimateTransitionRule[]> = {
  draft: [
    { to: ["sent"], allowedBy: ["vendor"] },
  ],
  sent: [
    { to: ["pm_reviewing"], allowedBy: ["pm"] },
    { to: ["draft"], allowedBy: ["vendor"] }, // Vendor can pull back
  ],
  pm_reviewing: [
    { to: ["with_owner"], allowedBy: ["pm"] },
    { to: ["approved"], allowedBy: ["pm"] },
    { to: ["declined"], allowedBy: ["pm"] },
    { to: ["changes_requested"], allowedBy: ["pm"] },
  ],
  with_owner: [
    { to: ["approved"], allowedBy: ["pm"] },
    { to: ["declined"], allowedBy: ["pm"] },
    { to: ["changes_requested"], allowedBy: ["pm"] },
  ],
  changes_requested: [
    { to: ["draft"], allowedBy: ["vendor"] }, // Vendor revises
    { to: ["sent"], allowedBy: ["vendor"] }, // Vendor re-sends
  ],
  approved: [],
  declined: [
    { to: ["draft"], allowedBy: ["vendor"] }, // Vendor can revise after decline
  ],
  expired: [
    { to: ["draft"], allowedBy: ["vendor"] }, // Vendor can renew
  ],
};

export function validateEstimateTransition(
  currentStatus: EstimateStatus,
  newStatus: EstimateStatus,
  callerRole: TransitionRole
): { valid: true } | { valid: false; reason: string } {
  const rules = ESTIMATE_TRANSITIONS[currentStatus];

  if (!rules || rules.length === 0) {
    return {
      valid: false,
      reason: `No transitions allowed from estimate status "${currentStatus}"`,
    };
  }

  for (const rule of rules) {
    if (rule.to.includes(newStatus) && rule.allowedBy.includes(callerRole)) {
      return { valid: true };
    }
  }

  const transitionExists = rules.some((r) => r.to.includes(newStatus));
  if (transitionExists) {
    return {
      valid: false,
      reason: `Role "${callerRole}" cannot transition estimate from "${currentStatus}" to "${newStatus}"`,
    };
  }

  return {
    valid: false,
    reason: `Invalid estimate transition: "${currentStatus}" → "${newStatus}"`,
  };
}

export function getValidEstimateTransitions(
  currentStatus: EstimateStatus,
  callerRole: TransitionRole
): EstimateStatus[] {
  const rules = ESTIMATE_TRANSITIONS[currentStatus] ?? [];
  const result: EstimateStatus[] = [];

  for (const rule of rules) {
    if (rule.allowedBy.includes(callerRole)) {
      result.push(...rule.to);
    }
  }

  return result;
}

// ============================================
// Invoice State Machine
// ============================================

interface InvoiceTransitionRule {
  to: InvoiceStatus[];
  allowedBy: TransitionRole[];
}

export const INVOICE_TRANSITIONS: Record<InvoiceStatus, InvoiceTransitionRule[]> = {
  draft: [
    { to: ["submitted"], allowedBy: ["vendor"] },
  ],
  submitted: [
    { to: ["pm_approved"], allowedBy: ["pm"] },
    { to: ["disputed"], allowedBy: ["pm"] },
    { to: ["draft"], allowedBy: ["vendor"] }, // Pull back
  ],
  pm_approved: [
    { to: ["processing"], allowedBy: ["pm"] },
    { to: ["disputed"], allowedBy: ["pm"] },
  ],
  processing: [
    { to: ["paid"], allowedBy: ["pm"] },
  ],
  paid: [],
  disputed: [
    { to: ["draft"], allowedBy: ["vendor"] }, // Vendor revises
    { to: ["submitted"], allowedBy: ["vendor"] }, // Vendor re-submits
  ],
};

export function validateInvoiceTransition(
  currentStatus: InvoiceStatus,
  newStatus: InvoiceStatus,
  callerRole: TransitionRole
): { valid: true } | { valid: false; reason: string } {
  const rules = INVOICE_TRANSITIONS[currentStatus];

  if (!rules || rules.length === 0) {
    return {
      valid: false,
      reason: `No transitions allowed from invoice status "${currentStatus}"`,
    };
  }

  for (const rule of rules) {
    if (rule.to.includes(newStatus) && rule.allowedBy.includes(callerRole)) {
      return { valid: true };
    }
  }

  const transitionExists = rules.some((r) => r.to.includes(newStatus));
  if (transitionExists) {
    return {
      valid: false,
      reason: `Role "${callerRole}" cannot transition invoice from "${currentStatus}" to "${newStatus}"`,
    };
  }

  return {
    valid: false,
    reason: `Invalid invoice transition: "${currentStatus}" → "${newStatus}"`,
  };
}

export function getValidInvoiceTransitions(
  currentStatus: InvoiceStatus,
  callerRole: TransitionRole
): InvoiceStatus[] {
  const rules = INVOICE_TRANSITIONS[currentStatus] ?? [];
  const result: InvoiceStatus[] = [];

  for (const rule of rules) {
    if (rule.allowedBy.includes(callerRole)) {
      result.push(...rule.to);
    }
  }

  return result;
}
