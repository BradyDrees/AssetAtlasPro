"use server";

/**
 * Daily Action List — Server Actions
 *
 * 5 exported functions:
 *   1. getActionItems()       — Core engine: compute all action items
 *   2. getActionSummary()     — Lightweight counts + top 5 for dashboard widget
 *   3. recordActionEvent()    — INSERT into action_events + logActivity()
 *   4. getCompletionHistory() — Completions/dismissals grouped by day
 *   5. getActionPreferences() — Returns org's current preferences
 */

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole, logActivity } from "@/lib/vendor/role-helpers";
import type { ActionVisibleRole } from "@/lib/vendor/action-rules";
import {
  type RuleKey,
  type ActionItem,
  type ActionEvent,
  type ActionSummary,
  type EventType,
  type OrgRulePreference,
  RULE_KEYS,
  buildTaskKey,
  resolveRuleConfig,
  getOrgToday,
  getOrgNow,
  isCandidateDue,
  isCandidateVisibleToUser,
  isCandidateSuppressed,
  sortActionItems,
  RULE_TITLE_KEYS,
  daysBetween,
  isValidRuleKey,
} from "@/lib/vendor/action-rules";

// ─────────────────────────────────────────────
// Internal row types (minimal select shapes)
// ─────────────────────────────────────────────

interface WoRow {
  id: string;
  status: string;
  assigned_to: string | null;
  responded_at: string | null;
  scheduled_date: string | null;
  completed_at: string | null;
  property_name: string | null;
  description: string | null;
  trade: string | null;
  priority: string;
  created_at: string;
}

interface EstRow {
  id: string;
  status: string;
  property_name: string | null;
  title: string | null;
  created_at: string;
  approved_at: string | null;
  work_order_id: string | null;
}

interface InvRow {
  id: string;
  status: string;
  property_name: string | null;
  invoice_number: string | null;
  due_date: string | null;
  total: number | null;
  created_at: string;
  estimate_id: string | null;
}

interface CredRow {
  id: string;
  type: string;
  name: string;
  expiration_date: string | null;
  status: string;
}

interface ParticipantRow {
  thread_id: string;
  last_read_at: string | null;
}

interface ThreadRow {
  id: string;
  last_message_at: string | null;
  title: string | null;
  thread_type: string;
  work_order_id: string | null;
}

// ═════════════════════════════════════════════════════════════════
// 1. getActionItems() — Core engine
// ═════════════════════════════════════════════════════════════════

export async function getActionItems(): Promise<{
  items: ActionItem[];
  completedToday: ActionEvent[];
}> {
  const vendorAuth = await requireVendorRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], completedToday: [] };

  const authUserId = user.id;
  const userRole = vendorAuth.role as ActionVisibleRole;
  const vendorUserId = vendorAuth.id; // vendor_users PK (for assigned_to checks)
  const orgId = vendorAuth.vendor_org_id;

  // ── Parallel: org timezone, preferences, action_events ──
  const [orgResult, prefsResult, eventsResult] = await Promise.all([
    supabase
      .from("vendor_organizations")
      .select("timezone")
      .eq("id", orgId)
      .single(),
    supabase
      .from("vendor_action_preferences")
      .select("*")
      .eq("vendor_org_id", orgId),
    supabase
      .from("action_events")
      .select("*")
      .eq("user_id", authUserId)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  // Timezone: fall back if column doesn't exist yet (pre-migration)
  const timezone =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (orgResult.data as Record<string, any> | null)?.timezone ??
    "America/Chicago";
  const orgToday = getOrgToday(timezone);
  const now = getOrgNow(timezone);

  // Preferences: graceful fallback if table doesn't exist yet
  const prefs = prefsResult.error
    ? []
    : ((prefsResult.data ?? []) as OrgRulePreference[]);

  // Events: graceful fallback if table doesn't exist yet
  const allEvents = eventsResult.error
    ? []
    : ((eventsResult.data ?? []) as ActionEvent[]);

  // ── Build preference map ──
  const prefMap = new Map<string, OrgRulePreference>();
  for (const pref of prefs) {
    prefMap.set(pref.rule_key, pref);
  }

  // ── Resolve configs — skip disabled or role-invisible rules ──
  const configs = new Map<RuleKey, ReturnType<typeof resolveRuleConfig>>();
  for (const ruleKey of RULE_KEYS) {
    const config = resolveRuleConfig(ruleKey, prefMap.get(ruleKey));
    if (!config.enabled) continue;
    // Broad role check (entity-level assigned_to is checked per-candidate)
    if (
      config.visibleRoles.length > 0 &&
      !config.visibleRoles.includes(userRole)
    )
      continue;
    configs.set(ruleKey, config);
  }

  if (configs.size === 0) return { items: [], completedToday: [] };

  // ── Determine which signal queries are needed ──
  const needWo =
    configs.has("respond_wo") ||
    configs.has("schedule_wo") ||
    configs.has("todays_jobs") ||
    configs.has("followup_completed");
  const needEst =
    configs.has("send_estimate") ||
    configs.has("followup_estimate") ||
    configs.has("estimate_changes") ||
    configs.has("create_invoice");
  const needInv =
    configs.has("submit_invoice") ||
    configs.has("overdue_invoice") ||
    configs.has("disputed_invoice") ||
    configs.has("create_invoice");
  const needCred = configs.has("expiring_credential");
  const needMsg = configs.has("unread_messages");

  // ── Parallel signal queries ──
  const empty = { data: [] as never[], error: null };

  const [woResult, estResult, invResult, credResult, participantResult] =
    await Promise.all([
      needWo
        ? supabase
            .from("vendor_work_orders")
            .select(
              "id, status, assigned_to, responded_at, scheduled_date, completed_at, property_name, description, trade, priority, created_at",
            )
            .eq("vendor_org_id", orgId)
            .in("status", [
              "assigned",
              "accepted",
              "scheduled",
              "en_route",
              "on_site",
              "in_progress",
              "completed",
            ])
            .order("created_at", { ascending: false })
            .limit(500)
        : Promise.resolve(empty),
      needEst
        ? supabase
            .from("vendor_estimates")
            .select(
              "id, status, property_name, title, created_at, approved_at, work_order_id",
            )
            .eq("vendor_org_id", orgId)
            .in("status", [
              "draft",
              "sent",
              "pm_reviewing",
              "changes_requested",
              "approved",
            ])
            .order("created_at", { ascending: false })
            .limit(500)
        : Promise.resolve(empty),
      needInv
        ? supabase
            .from("vendor_invoices")
            .select(
              "id, status, property_name, invoice_number, due_date, total, created_at, estimate_id",
            )
            .eq("vendor_org_id", orgId)
            .in("status", [
              "draft",
              "submitted",
              "pm_approved",
              "processing",
              "disputed",
            ])
            .order("created_at", { ascending: false })
            .limit(500)
        : Promise.resolve(empty),
      needCred
        ? supabase
            .from("vendor_credentials")
            .select("id, type, name, expiration_date, status")
            .eq("vendor_org_id", orgId)
            .not("expiration_date", "is", null)
            .neq("status", "revoked")
        : Promise.resolve(empty),
      needMsg
        ? supabase
            .from("thread_participants")
            .select("thread_id, last_read_at")
            .eq("user_id", authUserId)
        : Promise.resolve(empty),
    ]);

  const workOrders = (woResult.data ?? []) as WoRow[];
  const estimates = (estResult.data ?? []) as EstRow[];
  const invoices = (invResult.data ?? []) as InvRow[];
  const credentials = (credResult.data ?? []) as CredRow[];
  const participants = (participantResult.data ?? []) as ParticipantRow[];

  // Follow-up: threads (depends on participant results)
  let threads: ThreadRow[] = [];
  if (needMsg && participants.length > 0) {
    const threadIds = participants.map((p) => p.thread_id).filter(Boolean);
    if (threadIds.length > 0) {
      const threadResult = await supabase
        .from("message_threads")
        .select("id, last_message_at, title, thread_type, work_order_id")
        .in("id", threadIds)
        .eq("is_archived", false);
      threads = (threadResult.data ?? []) as ThreadRow[];
    }
  }

  // ── Build candidate items ──
  const items: ActionItem[] = [];

  const addIfNotSuppressed = (item: ActionItem) => {
    if (!isCandidateSuppressed(item.taskKey, allEvents, orgToday, now)) {
      items.push(item);
    }
  };

  // ────────────────── WORK ORDER rules ──────────────────

  // respond_wo: WO status='assigned', no responded_at
  if (configs.has("respond_wo")) {
    const config = configs.get("respond_wo")!;
    for (const wo of workOrders) {
      if (wo.status !== "assigned" || wo.responded_at) continue;
      if (!isCandidateDue(wo.created_at, config, now)) continue;
      if (
        !isCandidateVisibleToUser(
          config,
          userRole,
          vendorUserId,
          wo.assigned_to,
        )
      )
        continue;

      addIfNotSuppressed({
        taskKey: buildTaskKey("respond_wo", wo.id),
        ruleKey: "respond_wo",
        priority: config.priority,
        ...RULE_TITLE_KEYS.respond_wo,
        titleValues: {
          property: wo.property_name ?? wo.description ?? "Work Order",
        },
        href: `/pro/jobs/${wo.id}`,
        entityId: wo.id,
        actionableAt: wo.created_at,
        completable: config.completable,
        meta: {
          property: wo.property_name,
          trade: wo.trade,
          priority: wo.priority,
        },
      });
    }
  }

  // schedule_wo: WO status='accepted', no scheduled_date
  if (configs.has("schedule_wo")) {
    const config = configs.get("schedule_wo")!;
    for (const wo of workOrders) {
      if (wo.status !== "accepted" || wo.scheduled_date) continue;
      if (!isCandidateDue(wo.created_at, config, now)) continue;
      if (
        !isCandidateVisibleToUser(
          config,
          userRole,
          vendorUserId,
          wo.assigned_to,
        )
      )
        continue;

      addIfNotSuppressed({
        taskKey: buildTaskKey("schedule_wo", wo.id),
        ruleKey: "schedule_wo",
        priority: config.priority,
        ...RULE_TITLE_KEYS.schedule_wo,
        titleValues: {
          property: wo.property_name ?? wo.description ?? "Work Order",
        },
        href: `/pro/calendar`,
        entityId: wo.id,
        actionableAt: wo.created_at,
        completable: config.completable,
        meta: { property: wo.property_name, trade: wo.trade },
      });
    }
  }

  // todays_jobs: WO scheduled_date = today (active statuses only)
  if (configs.has("todays_jobs")) {
    const config = configs.get("todays_jobs")!;
    for (const wo of workOrders) {
      if (wo.scheduled_date !== orgToday) continue;
      if (
        wo.status === "completed" ||
        wo.status === "cancelled" ||
        wo.status === "declined"
      )
        continue;
      if (
        !isCandidateVisibleToUser(
          config,
          userRole,
          vendorUserId,
          wo.assigned_to,
        )
      )
        continue;

      addIfNotSuppressed({
        taskKey: buildTaskKey("todays_jobs", wo.id, orgToday),
        ruleKey: "todays_jobs",
        priority: config.priority,
        ...RULE_TITLE_KEYS.todays_jobs,
        titleValues: {
          property: wo.property_name ?? wo.description ?? "Job",
        },
        href: `/pro/jobs/${wo.id}`,
        entityId: wo.id,
        actionableAt: wo.created_at,
        completable: config.completable,
        meta: { property: wo.property_name, trade: wo.trade },
      });
    }
  }

  // followup_completed: WO completed 1–3 days ago (date-based, one task per dayOffset)
  if (configs.has("followup_completed")) {
    const config = configs.get("followup_completed")!;
    for (const wo of workOrders) {
      if (wo.status !== "completed" || !wo.completed_at) continue;
      const completedDate = wo.completed_at.slice(0, 10);
      const daysAgo = daysBetween(completedDate, orgToday);
      if (daysAgo < 1 || daysAgo > 3) continue;
      if (
        !isCandidateVisibleToUser(
          config,
          userRole,
          vendorUserId,
          wo.assigned_to,
        )
      )
        continue;

      for (
        let dayOffset = 1;
        dayOffset <= Math.min(daysAgo, 3);
        dayOffset++
      ) {
        addIfNotSuppressed({
          taskKey: buildTaskKey(
            "followup_completed",
            wo.id,
            String(dayOffset),
          ),
          ruleKey: "followup_completed",
          priority: config.priority,
          ...RULE_TITLE_KEYS.followup_completed,
          titleValues: {
            property: wo.property_name ?? wo.description ?? "Job",
            days: dayOffset,
          },
          href: `/pro/jobs/${wo.id}`,
          entityId: wo.id,
          actionableAt: wo.completed_at,
          completable: config.completable,
          meta: { property: wo.property_name, dayOffset },
        });
      }
    }
  }

  // ────────────────── ESTIMATE rules ──────────────────

  // send_estimate: Estimate status='draft'
  if (configs.has("send_estimate")) {
    const config = configs.get("send_estimate")!;
    for (const est of estimates) {
      if (est.status !== "draft") continue;
      if (!isCandidateDue(est.created_at, config, now)) continue;

      addIfNotSuppressed({
        taskKey: buildTaskKey("send_estimate", est.id),
        ruleKey: "send_estimate",
        priority: config.priority,
        ...RULE_TITLE_KEYS.send_estimate,
        titleValues: {
          title: est.title ?? est.property_name ?? "Estimate",
        },
        href: `/pro/estimates/${est.id}`,
        entityId: est.id,
        actionableAt: est.created_at,
        completable: config.completable,
        meta: { property: est.property_name, title: est.title },
      });
    }
  }

  // followup_estimate: Estimate status IN ('sent', 'pm_reviewing')
  if (configs.has("followup_estimate")) {
    const config = configs.get("followup_estimate")!;
    for (const est of estimates) {
      if (est.status !== "sent" && est.status !== "pm_reviewing") continue;
      if (!isCandidateDue(est.created_at, config, now)) continue;

      addIfNotSuppressed({
        taskKey: buildTaskKey("followup_estimate", est.id),
        ruleKey: "followup_estimate",
        priority: config.priority,
        ...RULE_TITLE_KEYS.followup_estimate,
        titleValues: {
          title: est.title ?? est.property_name ?? "Estimate",
        },
        href: `/pro/estimates/${est.id}`,
        entityId: est.id,
        actionableAt: est.created_at,
        completable: config.completable,
        meta: {
          property: est.property_name,
          title: est.title,
          status: est.status,
        },
      });
    }
  }

  // estimate_changes: Estimate status='changes_requested'
  if (configs.has("estimate_changes")) {
    const config = configs.get("estimate_changes")!;
    for (const est of estimates) {
      if (est.status !== "changes_requested") continue;
      if (!isCandidateDue(est.created_at, config, now)) continue;

      addIfNotSuppressed({
        taskKey: buildTaskKey("estimate_changes", est.id),
        ruleKey: "estimate_changes",
        priority: config.priority,
        ...RULE_TITLE_KEYS.estimate_changes,
        titleValues: {
          title: est.title ?? est.property_name ?? "Estimate",
        },
        href: `/pro/estimates/${est.id}`,
        entityId: est.id,
        actionableAt: est.created_at,
        completable: config.completable,
        meta: { property: est.property_name, title: est.title },
      });
    }
  }

  // create_invoice: Estimate approved, no linked invoice
  if (configs.has("create_invoice")) {
    const config = configs.get("create_invoice")!;
    // Build set of estimate IDs that already have invoices
    const invoicedEstimateIds = new Set(
      invoices.filter((i) => i.estimate_id).map((i) => i.estimate_id!),
    );
    for (const est of estimates) {
      if (est.status !== "approved") continue;
      if (invoicedEstimateIds.has(est.id)) continue;
      if (!est.approved_at) continue;
      if (!isCandidateDue(est.approved_at, config, now)) continue;

      addIfNotSuppressed({
        taskKey: buildTaskKey("create_invoice", est.id),
        ruleKey: "create_invoice",
        priority: config.priority,
        ...RULE_TITLE_KEYS.create_invoice,
        titleValues: {
          title: est.title ?? est.property_name ?? "Estimate",
        },
        href: `/pro/invoices/new?estimate_id=${est.id}`,
        entityId: est.id,
        actionableAt: est.approved_at,
        completable: config.completable,
        meta: { property: est.property_name, title: est.title },
      });
    }
  }

  // ────────────────── INVOICE rules ──────────────────

  // submit_invoice: Invoice status='draft'
  if (configs.has("submit_invoice")) {
    const config = configs.get("submit_invoice")!;
    for (const inv of invoices) {
      if (inv.status !== "draft") continue;
      if (!isCandidateDue(inv.created_at, config, now)) continue;

      addIfNotSuppressed({
        taskKey: buildTaskKey("submit_invoice", inv.id),
        ruleKey: "submit_invoice",
        priority: config.priority,
        ...RULE_TITLE_KEYS.submit_invoice,
        titleValues: { number: inv.invoice_number ?? "Invoice" },
        href: `/pro/invoices/${inv.id}`,
        entityId: inv.id,
        actionableAt: inv.created_at,
        completable: config.completable,
        meta: {
          property: inv.property_name,
          number: inv.invoice_number,
          total: inv.total,
        },
      });
    }
  }

  // overdue_invoice: Invoice past due_date, unpaid (not draft/paid/disputed)
  if (configs.has("overdue_invoice")) {
    const config = configs.get("overdue_invoice")!;
    for (const inv of invoices) {
      if (
        inv.status === "draft" ||
        inv.status === "paid" ||
        inv.status === "disputed"
      )
        continue;
      if (!inv.due_date || inv.due_date >= orgToday) continue;

      const overdueDays = daysBetween(inv.due_date, orgToday);
      addIfNotSuppressed({
        taskKey: buildTaskKey("overdue_invoice", inv.id),
        ruleKey: "overdue_invoice",
        priority: config.priority,
        ...RULE_TITLE_KEYS.overdue_invoice,
        titleValues: {
          number: inv.invoice_number ?? "Invoice",
          days: overdueDays,
        },
        href: `/pro/invoices/${inv.id}`,
        entityId: inv.id,
        actionableAt: inv.due_date,
        completable: config.completable,
        meta: {
          property: inv.property_name,
          number: inv.invoice_number,
          total: inv.total,
          dueDate: inv.due_date,
        },
      });
    }
  }

  // disputed_invoice: Invoice status='disputed'
  if (configs.has("disputed_invoice")) {
    const config = configs.get("disputed_invoice")!;
    for (const inv of invoices) {
      if (inv.status !== "disputed") continue;

      addIfNotSuppressed({
        taskKey: buildTaskKey("disputed_invoice", inv.id),
        ruleKey: "disputed_invoice",
        priority: config.priority,
        ...RULE_TITLE_KEYS.disputed_invoice,
        titleValues: { number: inv.invoice_number ?? "Invoice" },
        href: `/pro/invoices/${inv.id}`,
        entityId: inv.id,
        actionableAt: inv.created_at,
        completable: config.completable,
        meta: {
          property: inv.property_name,
          number: inv.invoice_number,
          total: inv.total,
        },
      });
    }
  }

  // ────────────────── MESSAGE rules ──────────────────

  // unread_messages: thread.last_message_at > participant.last_read_at
  if (configs.has("unread_messages") && threads.length > 0) {
    const config = configs.get("unread_messages")!;
    const participantMap = new Map<string, string | null>();
    for (const p of participants) {
      participantMap.set(p.thread_id, p.last_read_at);
    }

    for (const thread of threads) {
      if (!thread.last_message_at) continue;
      const lastRead = participantMap.get(thread.id);
      // Skip if already read
      if (lastRead && new Date(lastRead) >= new Date(thread.last_message_at))
        continue;

      addIfNotSuppressed({
        taskKey: buildTaskKey("unread_messages", thread.id),
        ruleKey: "unread_messages",
        priority: config.priority,
        ...RULE_TITLE_KEYS.unread_messages,
        titleValues: { thread: thread.title ?? "Message" },
        href: `/pro/inbox`,
        entityId: thread.id,
        actionableAt: thread.last_message_at,
        completable: config.completable,
        meta: { title: thread.title, type: thread.thread_type },
      });
    }
  }

  // ────────────────── CREDENTIAL rules ──────────────────

  // expiring_credential: Credential expiring within reminder window
  if (configs.has("expiring_credential")) {
    const config = configs.get("expiring_credential")!;
    const remindDays = config.remindAfterValue; // 30 days before by default

    for (const cred of credentials) {
      if (!cred.expiration_date) continue;
      const daysUntilExpiry = daysBetween(orgToday, cred.expiration_date);
      // Not in warning window yet
      if (daysUntilExpiry > remindDays) continue;
      // Past 30 days expired — stop showing
      if (daysUntilExpiry < -30) continue;

      addIfNotSuppressed({
        taskKey: buildTaskKey("expiring_credential", cred.id),
        ruleKey: "expiring_credential",
        priority: config.priority,
        ...RULE_TITLE_KEYS.expiring_credential,
        titleValues: {
          name: cred.name,
          days: Math.max(0, daysUntilExpiry),
        },
        href: `/pro/profile`,
        entityId: cred.id,
        actionableAt: cred.expiration_date,
        completable: config.completable,
        meta: {
          name: cred.name,
          type: cred.type,
          expirationDate: cred.expiration_date,
          daysUntil: daysUntilExpiry,
        },
      });
    }
  }

  // open_dispute: No separate disputes table yet — will be wired when
  // the disputes feature is built. For now, produces no items.

  // ── Sort and return ──
  const sortedItems = sortActionItems(items);

  const completedToday = allEvents.filter(
    (e) =>
      e.event_type === "completed" && e.created_at.slice(0, 10) === orgToday,
  );

  return { items: sortedItems, completedToday };
}

// ═════════════════════════════════════════════════════════════════
// 2. getActionSummary() — Lightweight counts + top 5 for dashboard
// ═════════════════════════════════════════════════════════════════

export async function getActionSummary(): Promise<ActionSummary> {
  const { items } = await getActionItems();

  const criticalCount = items.filter((i) => i.priority === "critical").length;
  const highCount = items.filter((i) => i.priority === "high").length;

  // Group by ruleKey
  const byRule = new Map<RuleKey, number>();
  for (const item of items) {
    byRule.set(item.ruleKey, (byRule.get(item.ruleKey) ?? 0) + 1);
  }

  const categories = Array.from(byRule.entries()).map(
    ([ruleKey, count]) => ({ ruleKey, count }),
  );

  return {
    totalCount: items.length,
    criticalCount,
    highCount,
    categories,
    topItems: items.slice(0, 5),
  };
}

// ═════════════════════════════════════════════════════════════════
// 3. recordActionEvent() — INSERT + logActivity
// ═════════════════════════════════════════════════════════════════

export async function recordActionEvent(
  taskKey: string,
  ruleKey: string,
  eventType: EventType,
  dismissedUntil?: string | null,
  note?: string | null,
): Promise<{ error?: string }> {
  if (!isValidRuleKey(ruleKey)) {
    return { error: "Invalid rule key" };
  }

  const vendorAuth = await requireVendorRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("action_events").insert({
    user_id: user.id,
    vendor_org_id: vendorAuth.vendor_org_id,
    task_key: taskKey,
    rule_key: ruleKey,
    event_type: eventType,
    dismissed_until: eventType === "snoozed" ? dismissedUntil : null,
    note: note ?? null,
    task_snapshot: {},
  });

  if (error) return { error: error.message };

  // Non-blocking activity log
  await logActivity({
    entityType: "action_item",
    entityId: taskKey,
    action: `action_${eventType}`,
    metadata: { rule_key: ruleKey, dismissed_until: dismissedUntil },
  });

  return {};
}

// ═════════════════════════════════════════════════════════════════
// 4. getCompletionHistory() — Daily breakdown for productivity stats
// ═════════════════════════════════════════════════════════════════

export async function getCompletionHistory(
  days = 7,
): Promise<{
  daily: {
    date: string;
    completed: number;
    dismissed: number;
    snoozed: number;
  }[];
}> {
  const vendorAuth = await requireVendorRole();
  void vendorAuth; // auth required but we only need user.id
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { daily: [] };

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("action_events")
    .select("event_type, created_at")
    .eq("user_id", user.id)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  if (error || !data) return { daily: [] };

  // Group by date
  const dailyMap = new Map<
    string,
    { completed: number; dismissed: number; snoozed: number }
  >();
  for (const event of data) {
    const date = event.created_at.slice(0, 10);
    const entry = dailyMap.get(date) ?? {
      completed: 0,
      dismissed: 0,
      snoozed: 0,
    };
    if (event.event_type === "completed") entry.completed++;
    else if (event.event_type === "dismissed") entry.dismissed++;
    else if (event.event_type === "snoozed") entry.snoozed++;
    dailyMap.set(date, entry);
  }

  // Build array for past N days
  const daily: {
    date: string;
    completed: number;
    dismissed: number;
    snoozed: number;
  }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    daily.push({
      date,
      ...(dailyMap.get(date) ?? { completed: 0, dismissed: 0, snoozed: 0 }),
    });
  }

  return { daily };
}

// ═════════════════════════════════════════════════════════════════
// 5. getActionPreferences() — Org's current rule overrides
// ═════════════════════════════════════════════════════════════════

export async function getActionPreferences(): Promise<{
  preferences: OrgRulePreference[];
  error?: string;
}> {
  const vendorAuth = await requireVendorRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_action_preferences")
    .select("*")
    .eq("vendor_org_id", vendorAuth.vendor_org_id);

  if (error) return { preferences: [], error: error.message };

  return { preferences: (data ?? []) as OrgRulePreference[] };
}
