/**
 * Daily Action List — Configurable Reminder Engine
 *
 * Two-layer architecture:
 *   Layer 1: System-generated task candidates (detected from DB signals)
 *   Layer 2: Vendor rules/preferences (org-level overrides)
 *
 * Tasks are computed at runtime from existing DB state — not stored.
 * Only completions/dismissals/snoozes are persisted in `action_events`.
 * The `vendor_action_preferences` table holds org-level overrides.
 */

// ─── Canonical Rule Keys ────────────────────────────────────────────
// First-class stable identifiers used across computation, settings,
// completions, analytics, and UI. Defined ONCE here, referenced everywhere.

export const RULE_KEYS = [
  "respond_wo",
  "schedule_wo",
  "todays_jobs",
  "followup_completed",
  "send_estimate",
  "followup_estimate",
  "estimate_changes",
  "create_invoice",
  "submit_invoice",
  "overdue_invoice",
  "disputed_invoice",
  "unread_messages",
  "expiring_credential",
  "open_dispute",
] as const;

export type RuleKey = (typeof RULE_KEYS)[number];

/** Type guard: checks if a string is a valid RuleKey */
export function isValidRuleKey(key: string): key is RuleKey {
  return (RULE_KEYS as readonly string[]).includes(key);
}

// ─── Priority & Event Types ─────────────────────────────────────────

export type ActionPriority = "critical" | "high" | "medium" | "low";

export const PRIORITY_ORDER: Record<ActionPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export type EventType = "completed" | "dismissed" | "snoozed";

export type TimeUnit = "hours" | "days";

// ─── Roles (re-exported for convenience) ────────────────────────────

export type ActionVisibleRole = "owner" | "admin" | "office_manager" | "tech";

// ─── System Rule Defaults ───────────────────────────────────────────

export interface SystemRuleDefaults {
  priority: ActionPriority;
  remindAfterValue: number;
  remindAfterUnit: TimeUnit;
  repeatEnabled: boolean;
  repeatEveryValue: number;
  repeatEveryUnit: TimeUnit;
  /**
   * Which roles can see this rule's tasks.
   * Empty array means ALL roles can see it.
   * To restrict, list specific roles: ["owner", "admin"].
   */
  visibleRoles: ActionVisibleRole[];
  /** If true, only the user assigned to the entity sees the task (e.g. tech assigned to WO) */
  assignedUserOnly: boolean;
  /** If true, user can mark the task as "completed" (done forever). If false, only dismiss/snooze. */
  completable: boolean;
}

export const SYSTEM_DEFAULTS: Record<RuleKey, SystemRuleDefaults> = {
  respond_wo: {
    priority: "critical",
    remindAfterValue: 0,
    remindAfterUnit: "hours",
    repeatEnabled: true,
    repeatEveryValue: 1,
    repeatEveryUnit: "days",
    visibleRoles: [],
    assignedUserOnly: false,
    completable: false,
  },
  schedule_wo: {
    priority: "medium",
    remindAfterValue: 1,
    remindAfterUnit: "days",
    repeatEnabled: true,
    repeatEveryValue: 1,
    repeatEveryUnit: "days",
    visibleRoles: [],
    assignedUserOnly: false,
    completable: false,
  },
  todays_jobs: {
    priority: "high",
    remindAfterValue: 0,
    remindAfterUnit: "hours",
    repeatEnabled: false,
    repeatEveryValue: 0,
    repeatEveryUnit: "days",
    visibleRoles: [],
    assignedUserOnly: true,
    completable: false,
  },
  followup_completed: {
    priority: "medium",
    remindAfterValue: 1,
    remindAfterUnit: "days",
    repeatEnabled: true,
    repeatEveryValue: 1,
    repeatEveryUnit: "days",
    visibleRoles: [],
    assignedUserOnly: false,
    completable: true,
  },
  send_estimate: {
    priority: "medium",
    remindAfterValue: 2,
    remindAfterUnit: "days",
    repeatEnabled: true,
    repeatEveryValue: 2,
    repeatEveryUnit: "days",
    visibleRoles: ["owner", "admin", "office_manager"],
    assignedUserOnly: false,
    completable: true,
  },
  followup_estimate: {
    priority: "medium",
    remindAfterValue: 5,
    remindAfterUnit: "days",
    repeatEnabled: true,
    repeatEveryValue: 3,
    repeatEveryUnit: "days",
    visibleRoles: ["owner", "admin", "office_manager"],
    assignedUserOnly: false,
    completable: true,
  },
  estimate_changes: {
    priority: "high",
    remindAfterValue: 0,
    remindAfterUnit: "hours",
    repeatEnabled: true,
    repeatEveryValue: 1,
    repeatEveryUnit: "days",
    visibleRoles: ["owner", "admin", "office_manager"],
    assignedUserOnly: false,
    completable: true,
  },
  create_invoice: {
    priority: "medium",
    remindAfterValue: 0,
    remindAfterUnit: "hours",
    repeatEnabled: true,
    repeatEveryValue: 2,
    repeatEveryUnit: "days",
    visibleRoles: ["owner", "admin"],
    assignedUserOnly: false,
    completable: true,
  },
  submit_invoice: {
    priority: "medium",
    remindAfterValue: 2,
    remindAfterUnit: "days",
    repeatEnabled: true,
    repeatEveryValue: 2,
    repeatEveryUnit: "days",
    visibleRoles: ["owner", "admin"],
    assignedUserOnly: false,
    completable: true,
  },
  overdue_invoice: {
    priority: "high",
    remindAfterValue: 0,
    remindAfterUnit: "days",
    repeatEnabled: true,
    repeatEveryValue: 1,
    repeatEveryUnit: "days",
    visibleRoles: ["owner", "admin"],
    assignedUserOnly: false,
    completable: false,
  },
  disputed_invoice: {
    priority: "critical",
    remindAfterValue: 0,
    remindAfterUnit: "hours",
    repeatEnabled: true,
    repeatEveryValue: 1,
    repeatEveryUnit: "days",
    visibleRoles: ["owner", "admin"],
    assignedUserOnly: false,
    completable: false,
  },
  unread_messages: {
    priority: "low",
    remindAfterValue: 0,
    remindAfterUnit: "hours",
    repeatEnabled: false,
    repeatEveryValue: 0,
    repeatEveryUnit: "days",
    visibleRoles: [],
    assignedUserOnly: false,
    completable: true,
  },
  expiring_credential: {
    priority: "high",
    remindAfterValue: 30,
    remindAfterUnit: "days",
    repeatEnabled: true,
    repeatEveryValue: 7,
    repeatEveryUnit: "days",
    visibleRoles: ["owner", "admin"],
    assignedUserOnly: false,
    completable: true,
  },
  open_dispute: {
    priority: "critical",
    remindAfterValue: 0,
    remindAfterUnit: "hours",
    repeatEnabled: true,
    repeatEveryValue: 1,
    repeatEveryUnit: "days",
    visibleRoles: [],
    assignedUserOnly: false,
    completable: false,
  },
};

// ─── Org Preference (matches vendor_action_preferences table) ───────

export interface OrgRulePreference {
  rule_key: string;
  enabled: boolean;
  priority_override: ActionPriority | null;
  remind_after_value: number | null;
  remind_after_unit: TimeUnit | null;
  repeat_enabled: boolean | null;
  repeat_every_value: number | null;
  repeat_every_unit: TimeUnit | null;
  visible_roles: ActionVisibleRole[];
  assigned_user_only: boolean;
}

// ─── Resolved Config (system default + org override merged) ─────────

export interface ResolvedRuleConfig extends SystemRuleDefaults {
  ruleKey: RuleKey;
  enabled: boolean;
}

// ─── Action Item (computed task candidate) ──────────────────────────

export interface ActionItem {
  /** Unique key: built by buildTaskKey() */
  taskKey: string;
  /** Canonical rule key */
  ruleKey: RuleKey;
  /** Resolved priority (system default or org override) */
  priority: ActionPriority;
  /** i18n key for the title, e.g. "items.respondWo" */
  titleKey: string;
  /** i18n key for the subtitle */
  subtitleKey: string;
  /** Interpolation values for i18n strings */
  titleValues: Record<string, string | number>;
  /** Deep link to the relevant page */
  href: string;
  /** Entity ID (WO, estimate, invoice, thread, credential, dispute) */
  entityId: string;
  /** When the source entity became actionable (ISO string) */
  actionableAt: string;
  /** Whether the user can mark this as "completed" vs only dismiss/snooze */
  completable: boolean;
  /** Extra context for display (property name, amount, etc.) */
  meta: Record<string, string | number | null>;
}

// ─── Action Event (stored in action_events table) ───────────────────

export interface ActionEvent {
  id: string;
  user_id: string;
  vendor_org_id: string;
  task_key: string;
  rule_key: string;
  event_type: EventType;
  dismissed_until: string | null;
  note: string | null;
  task_snapshot: Record<string, unknown>;
  created_at: string;
}

// ─── Action Summary (for dashboard widget) ──────────────────────────

export interface ActionSummary {
  totalCount: number;
  criticalCount: number;
  highCount: number;
  categories: { ruleKey: RuleKey; count: number }[];
  topItems: ActionItem[];
}

// ─── i18n Key Mapping ───────────────────────────────────────────────

export const RULE_TITLE_KEYS: Record<RuleKey, { titleKey: string; subtitleKey: string }> = {
  respond_wo: { titleKey: "items.respondWo", subtitleKey: "items.respondWoSub" },
  schedule_wo: { titleKey: "items.scheduleWo", subtitleKey: "items.scheduleWoSub" },
  todays_jobs: { titleKey: "items.todaysJob", subtitleKey: "items.todaysJobSub" },
  followup_completed: { titleKey: "items.followupCompleted", subtitleKey: "items.followupCompletedSub" },
  send_estimate: { titleKey: "items.sendEstimate", subtitleKey: "items.sendEstimateSub" },
  followup_estimate: { titleKey: "items.followupEstimate", subtitleKey: "items.followupEstimateSub" },
  estimate_changes: { titleKey: "items.estimateChanges", subtitleKey: "items.estimateChangesSub" },
  create_invoice: { titleKey: "items.createInvoice", subtitleKey: "items.createInvoiceSub" },
  submit_invoice: { titleKey: "items.submitInvoice", subtitleKey: "items.submitInvoiceSub" },
  overdue_invoice: { titleKey: "items.overdueInvoice", subtitleKey: "items.overdueInvoiceSub" },
  disputed_invoice: { titleKey: "items.disputedInvoice", subtitleKey: "items.disputedInvoiceSub" },
  unread_messages: { titleKey: "items.unreadMessage", subtitleKey: "items.unreadMessageSub" },
  expiring_credential: { titleKey: "items.expiringCredential", subtitleKey: "items.expiringCredentialSub" },
  open_dispute: { titleKey: "items.openDispute", subtitleKey: "items.openDisputeSub" },
};

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Build a canonical task key. All code must use this helper — never
 * construct task keys inline.
 *
 * Format: `{ruleKey}:{entityId}` or `{ruleKey}:{entityId}:{suffix}`
 *
 * Examples:
 *   buildTaskKey("respond_wo", "abc123")             → "respond_wo:abc123"
 *   buildTaskKey("todays_jobs", "abc123", "2026-03-16") → "todays_jobs:abc123:2026-03-16"
 *   buildTaskKey("followup_completed", "abc123", "2") → "followup_completed:abc123:2"
 */
export function buildTaskKey(ruleKey: RuleKey, entityId: string, suffix?: string): string {
  return suffix ? `${ruleKey}:${entityId}:${suffix}` : `${ruleKey}:${entityId}`;
}

/**
 * Merge system defaults with an optional org-level preference override.
 * Null fields in the preference row mean "use system default".
 */
export function resolveRuleConfig(
  ruleKey: RuleKey,
  orgPref?: OrgRulePreference | null,
): ResolvedRuleConfig {
  const defaults = SYSTEM_DEFAULTS[ruleKey];

  if (!orgPref) {
    return { ...defaults, ruleKey, enabled: true };
  }

  return {
    ruleKey,
    enabled: orgPref.enabled,
    priority: orgPref.priority_override ?? defaults.priority,
    remindAfterValue: orgPref.remind_after_value ?? defaults.remindAfterValue,
    remindAfterUnit: orgPref.remind_after_unit ?? defaults.remindAfterUnit,
    repeatEnabled: orgPref.repeat_enabled ?? defaults.repeatEnabled,
    repeatEveryValue: orgPref.repeat_every_value ?? defaults.repeatEveryValue,
    repeatEveryUnit: orgPref.repeat_every_unit ?? defaults.repeatEveryUnit,
    visibleRoles:
      orgPref.visible_roles && orgPref.visible_roles.length > 0
        ? orgPref.visible_roles
        : defaults.visibleRoles,
    assignedUserOnly: orgPref.assigned_user_only ?? defaults.assignedUserOnly,
    completable: defaults.completable, // not overridable — product decision per rule
  };
}

/**
 * Get "today" as YYYY-MM-DD in the org's timezone.
 * Fallback: America/Chicago (US Central).
 */
export function getOrgToday(timezone?: string | null): string {
  const tz = timezone || "America/Chicago";
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: tz }); // en-CA = YYYY-MM-DD
  } catch {
    return new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
  }
}

/**
 * Get "now" as a Date in the org's timezone context.
 * Used for timestamp comparisons.
 */
export function getOrgNow(timezone?: string | null): Date {
  // JavaScript Date is always UTC internally. We use this function to get
  // a reference point, and do timezone-aware comparisons using getOrgToday().
  return new Date();
}

/**
 * Convert a remindAfter config into milliseconds for threshold comparison.
 */
function remindAfterMs(value: number, unit: TimeUnit): number {
  return unit === "hours" ? value * 60 * 60 * 1000 : value * 24 * 60 * 60 * 1000;
}

/**
 * Check if an entity has passed the remindAfter threshold.
 * `actionableAt` is when the entity entered the triggering state (ISO string).
 */
export function isCandidateDue(
  actionableAt: string | Date,
  config: ResolvedRuleConfig,
  now: Date = new Date(),
): boolean {
  const actionableDate = typeof actionableAt === "string" ? new Date(actionableAt) : actionableAt;
  const thresholdMs = remindAfterMs(config.remindAfterValue, config.remindAfterUnit);
  return now.getTime() - actionableDate.getTime() >= thresholdMs;
}

/**
 * Check if the current user's role can see this rule's tasks.
 * - Empty visibleRoles means all roles can see it.
 * - assignedUserOnly checks if userId matches the entity's assigned_to field.
 */
export function isCandidateVisibleToUser(
  config: ResolvedRuleConfig,
  userRole: ActionVisibleRole,
  userId: string,
  entityAssignedTo?: string | null,
): boolean {
  // Role check: empty array = all roles
  if (config.visibleRoles.length > 0 && !config.visibleRoles.includes(userRole)) {
    return false;
  }

  // Assigned-user-only check
  if (config.assignedUserOnly && entityAssignedTo && entityAssignedTo !== userId) {
    return false;
  }

  return true;
}

/**
 * Check if a task is suppressed by a completion, dismissal, or active snooze.
 *
 * Rules:
 * - 'completed' suppresses permanently (for that task_key)
 * - 'dismissed' suppresses until tomorrow (in org timezone)
 * - 'snoozed' suppresses until dismissed_until timestamp
 */
export function isCandidateSuppressed(
  taskKey: string,
  events: ActionEvent[],
  orgToday: string,
  now: Date = new Date(),
): boolean {
  const matching = events.filter((e) => e.task_key === taskKey);
  if (matching.length === 0) return false;

  for (const event of matching) {
    const eventDate = event.created_at.slice(0, 10); // YYYY-MM-DD

    if (event.event_type === "completed") {
      // Completed = suppressed permanently
      return true;
    }

    if (event.event_type === "dismissed" && eventDate === orgToday) {
      // Dismissed today = suppressed for the rest of today
      return true;
    }

    if (event.event_type === "snoozed" && event.dismissed_until) {
      // Snoozed = suppressed until dismissed_until
      const snoozeEnd = new Date(event.dismissed_until);
      if (now < snoozeEnd) return true;
    }
  }

  return false;
}

/**
 * Sort action items: critical first, then by actionableAt (oldest first).
 */
export function sortActionItems(items: ActionItem[]): ActionItem[] {
  return [...items].sort((a, b) => {
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(a.actionableAt).getTime() - new Date(b.actionableAt).getTime();
  });
}

/**
 * Calculate days between two dates.
 */
export function daysBetween(from: string | Date, to: string | Date): number {
  const fromDate = typeof from === "string" ? new Date(from) : from;
  const toDate = typeof to === "string" ? new Date(to) : to;
  return Math.floor((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000));
}
