"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePmRole } from "@/lib/vendor/role-helpers";
import type { WoStatus, WoPriority } from "@/lib/vendor/types";

// ============================================
// Terminal Statuses — single source of truth
// ============================================

/** Array for Supabase .not("status", "in", `(...)`) queries */
const TERMINAL_STATUS_LIST = [
  "completed",
  "done_pending_approval",
  "invoiced",
  "paid",
  "cancelled",
  "declined",
] as const;

/** Set for fast JS .has() checks */
const TERMINAL_STATUS_SET = new Set<string>(TERMINAL_STATUS_LIST);

// ============================================
// Exported Types
// ============================================

export interface DerivedProperty {
  /** Normalized key (lowercase, trimmed, collapsed whitespace) */
  key: string;
  /** Best display name (highest-frequency original casing, most recent as tie-break) */
  displayName: string;
  /** Best address (same resolution as displayName) */
  address: string;
  open_wo_count: number;
  overdue_count: number;
  emergency_count: number;
  /** "red" = overdue or emergency, "yellow" = open > 5, "green" = everything else */
  color: "red" | "yellow" | "green";
}

export interface FeedWorkOrder {
  id: string;
  property_name: string;
  property_address: string | null;
  unit_number: string | null;
  description: string | null;
  trade: string | null;
  priority: WoPriority;
  status: WoStatus;
  scheduled_date: string | null;
  scheduled_time_start: string | null;
  scheduled_time_end: string | null;
  created_at: string;
  vendor_org_id: string | null;
  vendor_org_name: string;
  assigned_to: string | null;
  tech_name: string;
  days_open: number;
  is_overdue: boolean;
  /** Normalized property key for client-side filtering */
  property_key: string;
}

export interface DispatchJob {
  id: string;
  property_name: string;
  property_address: string | null;
  unit_number: string | null;
  description: string | null;
  trade: string | null;
  priority: WoPriority;
  status: WoStatus;
  scheduled_time_start: string | null;
  scheduled_time_end: string | null;
  vendor_org_id: string | null;
  vendor_org_name: string;
  assigned_to: string | null;
}

export interface DispatchTech {
  /** vendor_users.id (table PK) */
  id: string;
  name: string;
  jobs: DispatchJob[];
}

export interface OperateDashboardData {
  properties: DerivedProperty[];
  feed: FeedWorkOrder[];
  dispatch: {
    techs: DispatchTech[];
    unscheduledToday: DispatchJob[];
    needsAssignment: DispatchJob[];
  };
  alertsCount: number;
  todayStr: string;
}

// ============================================
// Helpers
// ============================================

/**
 * Normalize property name for grouping.
 * null/blank → "__unknown__"
 * Otherwise: trim, lowercase, collapse repeated whitespace.
 *
 * NOTE: Two different addresses with the same property name will merge.
 * Known limitation — PMs have no properties table.
 */
function normalizePropertyName(name: string | null): string {
  if (!name || !name.trim()) return "__unknown__";
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Resolve best display name from frequency map.
 * Highest count wins; most-recent-seen as deterministic tie-break.
 */
function resolveBestName(
  freqMap: Map<string, { count: number; lastSeen: string }>
): string {
  let best = "";
  let bestCount = 0;
  let bestLastSeen = "";

  for (const [name, stats] of freqMap) {
    if (
      stats.count > bestCount ||
      (stats.count === bestCount && stats.lastSeen > bestLastSeen)
    ) {
      best = name;
      bestCount = stats.count;
      bestLastSeen = stats.lastSeen;
    }
  }

  return best;
}

/**
 * Check if a date string is a valid YYYY-MM-DD date.
 * Returns false for null, undefined, empty, or malformed dates.
 */
function isValidDateStr(d: string | null | undefined): d is string {
  if (!d) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

// ============================================
// Main Data Fetch
// ============================================

export async function getOperateDashboard(): Promise<OperateDashboardData> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      properties: [],
      feed: [],
      dispatch: { techs: [], unscheduledToday: [], needsAssignment: [] },
      alertsCount: 0,
      todayStr: new Date().toISOString().slice(0, 10),
    };
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  // ── Single query: all non-archived, non-terminal WOs for this PM ──
  const terminalFilter = `(${TERMINAL_STATUS_LIST.join(",")})`;
  const { data: rawWos, error } = await supabase
    .from("vendor_work_orders")
    .select(
      "id, property_name, property_address, unit_number, description, trade, priority, status, scheduled_date, scheduled_time_start, scheduled_time_end, created_at, updated_at, vendor_org_id, assigned_to"
    )
    .eq("pm_user_id", user.id)
    .is("archived_at", null)
    .not("status", "in", terminalFilter)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch WOs for command center:", error);
    return {
      properties: [],
      feed: [],
      dispatch: { techs: [], unscheduledToday: [], needsAssignment: [] },
      alertsCount: 0,
      todayStr,
    };
  }

  const wos = (rawWos ?? []) as Array<{
    id: string;
    property_name: string | null;
    property_address: string | null;
    unit_number: string | null;
    description: string | null;
    trade: string | null;
    priority: string;
    status: string;
    scheduled_date: string | null;
    scheduled_time_start: string | null;
    scheduled_time_end: string | null;
    created_at: string;
    updated_at: string | null;
    vendor_org_id: string | null;
    assigned_to: string | null;
  }>;

  // ── Batch-fetch vendor org names ──
  const vendorOrgIds = [...new Set(wos.map((w) => w.vendor_org_id).filter(Boolean))] as string[];
  const vendorOrgMap = new Map<string, string>();
  if (vendorOrgIds.length > 0) {
    const { data: orgs } = await supabase
      .from("vendor_organizations")
      .select("id, name")
      .in("id", vendorOrgIds);
    for (const org of orgs ?? []) {
      vendorOrgMap.set(org.id, org.name ?? "Unknown Vendor");
    }
  }

  // ── Batch-fetch tech names (vendor_users → first_name, last_name) ──
  const techIds = [...new Set(wos.map((w) => w.assigned_to).filter(Boolean))] as string[];
  const techNameMap = new Map<string, string>();
  if (techIds.length > 0) {
    const { data: techs } = await supabase
      .from("vendor_users")
      .select("id, first_name, last_name, is_active")
      .in("id", techIds);
    for (const t of techs ?? []) {
      const tu = t as { id: string; first_name: string | null; last_name: string | null; is_active: boolean };
      if (!tu.is_active) {
        techNameMap.set(tu.id, "Inactive Tech");
      } else {
        const name = [tu.first_name, tu.last_name].filter(Boolean).join(" ");
        techNameMap.set(tu.id, name || "Tech");
      }
    }
  }

  // ── Derive Properties ──
  const propertyMap = new Map<
    string,
    {
      nameFreq: Map<string, { count: number; lastSeen: string }>;
      addressFreq: Map<string, { count: number; lastSeen: string }>;
      open_wo_count: number;
      overdue_count: number;
      emergency_count: number;
    }
  >();

  for (const wo of wos) {
    const key = normalizePropertyName(wo.property_name);
    const lastSeen = wo.updated_at || wo.created_at;

    if (!propertyMap.has(key)) {
      propertyMap.set(key, {
        nameFreq: new Map(),
        addressFreq: new Map(),
        open_wo_count: 0,
        overdue_count: 0,
        emergency_count: 0,
      });
    }
    const prop = propertyMap.get(key)!;

    // All WOs in this set are open (non-terminal, non-archived)
    prop.open_wo_count++;

    // Track name frequency
    const rawName = wo.property_name?.trim() || "";
    if (rawName) {
      const existing = prop.nameFreq.get(rawName);
      if (existing) {
        existing.count++;
        if (lastSeen > existing.lastSeen) existing.lastSeen = lastSeen;
      } else {
        prop.nameFreq.set(rawName, { count: 1, lastSeen });
      }
    }

    // Track address frequency
    const rawAddr = wo.property_address?.trim() || "";
    if (rawAddr) {
      const existing = prop.addressFreq.get(rawAddr);
      if (existing) {
        existing.count++;
        if (lastSeen > existing.lastSeen) existing.lastSeen = lastSeen;
      } else {
        prop.addressFreq.set(rawAddr, { count: 1, lastSeen });
      }
    }

    // Overdue: scheduled_date < today (strict past-due). Null/malformed = not overdue.
    if (isValidDateStr(wo.scheduled_date) && wo.scheduled_date < todayStr) {
      prop.overdue_count++;
    }

    // Emergency
    if (wo.priority === "emergency") {
      prop.emergency_count++;
    }
  }

  const properties: DerivedProperty[] = [];
  for (const [key, prop] of propertyMap) {
    const color: DerivedProperty["color"] =
      prop.overdue_count > 0 || prop.emergency_count > 0
        ? "red"
        : prop.open_wo_count > 5
          ? "yellow"
          : "green";

    properties.push({
      key,
      displayName: key === "__unknown__" ? "" : resolveBestName(prop.nameFreq),
      address: resolveBestName(prop.addressFreq),
      open_wo_count: prop.open_wo_count,
      overdue_count: prop.overdue_count,
      emergency_count: prop.emergency_count,
      color,
    });
  }

  // Sort properties: red → yellow → green, then by open count desc within each
  const colorOrder = { red: 0, yellow: 1, green: 2 };
  properties.sort((a, b) => {
    if (colorOrder[a.color] !== colorOrder[b.color]) {
      return colorOrder[a.color] - colorOrder[b.color];
    }
    return b.open_wo_count - a.open_wo_count;
  });

  // ── Build Feed ──
  const now = Date.now();
  const dayMs = 86_400_000;

  const feedItems: FeedWorkOrder[] = wos.map((wo) => {
    const isOverdue = isValidDateStr(wo.scheduled_date) && wo.scheduled_date < todayStr;
    const createdMs = new Date(wo.created_at).getTime();
    const daysOpen = Math.max(0, Math.floor((now - createdMs) / dayMs));

    return {
      id: wo.id,
      property_name: wo.property_name?.trim() || "Unknown Property",
      property_address: wo.property_address,
      unit_number: wo.unit_number,
      description: wo.description,
      trade: wo.trade,
      priority: (wo.priority as WoPriority) || "normal",
      status: wo.status as WoStatus,
      scheduled_date: wo.scheduled_date,
      scheduled_time_start: wo.scheduled_time_start,
      scheduled_time_end: wo.scheduled_time_end,
      created_at: wo.created_at,
      vendor_org_id: wo.vendor_org_id,
      vendor_org_name: wo.vendor_org_id
        ? vendorOrgMap.get(wo.vendor_org_id) ?? "Unknown Vendor"
        : "Unassigned",
      assigned_to: wo.assigned_to,
      tech_name: wo.assigned_to
        ? techNameMap.get(wo.assigned_to) ?? "Unknown Tech"
        : "Unassigned",
      days_open: daysOpen,
      is_overdue: isOverdue,
      property_key: normalizePropertyName(wo.property_name),
    };
  });

  // Sort feed by urgency:
  // 1. Overdue first (scheduled_date ASC — longest overdue at top)
  // 2. Emergency next (created_at ASC — oldest emergency first)
  // 3. Scheduled today or future (scheduled_date ASC)
  // 4. Then newest created (created_at DESC)
  feedItems.sort((a, b) => {
    const aOverdue = a.is_overdue ? 0 : 1;
    const bOverdue = b.is_overdue ? 0 : 1;
    if (aOverdue !== bOverdue) return aOverdue - bOverdue;

    // Both overdue — sort by scheduled_date ASC (longest overdue first)
    if (a.is_overdue && b.is_overdue) {
      return (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? "");
    }

    // Emergency bucket
    const aEmergency = a.priority === "emergency" ? 0 : 1;
    const bEmergency = b.priority === "emergency" ? 0 : 1;
    if (aEmergency !== bEmergency) return aEmergency - bEmergency;

    // Both emergency — sort by created_at ASC (oldest first)
    if (a.priority === "emergency" && b.priority === "emergency") {
      return a.created_at.localeCompare(b.created_at);
    }

    // Scheduled bucket (today or future)
    const aScheduled = isValidDateStr(a.scheduled_date) && a.scheduled_date >= todayStr ? 0 : 1;
    const bScheduled = isValidDateStr(b.scheduled_date) && b.scheduled_date >= todayStr ? 0 : 1;
    if (aScheduled !== bScheduled) return aScheduled - bScheduled;

    // Both scheduled — sort by scheduled_date ASC
    if (aScheduled === 0 && bScheduled === 0) {
      return (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? "");
    }

    // Fallback: newest created first
    return b.created_at.localeCompare(a.created_at);
  });

  // ── Build Dispatch ──
  const todayDispatchMap = new Map<string, DispatchJob[]>(); // keyed by assigned_to
  const unscheduledToday: DispatchJob[] = [];
  const needsAssignment: DispatchJob[] = [];

  for (const wo of wos) {
    const makeJob = (): DispatchJob => ({
      id: wo.id,
      property_name: wo.property_name?.trim() || "Unknown Property",
      property_address: wo.property_address,
      unit_number: wo.unit_number,
      description: wo.description,
      trade: wo.trade,
      priority: (wo.priority as WoPriority) || "normal",
      status: wo.status as WoStatus,
      scheduled_time_start: wo.scheduled_time_start,
      scheduled_time_end: wo.scheduled_time_end,
      vendor_org_id: wo.vendor_org_id,
      vendor_org_name: wo.vendor_org_id
        ? vendorOrgMap.get(wo.vendor_org_id) ?? "Unknown Vendor"
        : "Unassigned",
      assigned_to: wo.assigned_to,
    });

    const isScheduledToday = wo.scheduled_date === todayStr;

    if (isScheduledToday && wo.assigned_to) {
      // Today's dispatch — grouped by tech
      const techJobs = todayDispatchMap.get(wo.assigned_to) || [];
      techJobs.push(makeJob());
      todayDispatchMap.set(wo.assigned_to, techJobs);
    } else if (isScheduledToday && !wo.assigned_to) {
      // Scheduled today but no tech assigned
      unscheduledToday.push(makeJob());
    } else if (!wo.assigned_to && !wo.scheduled_date) {
      // No tech AND no schedule — needs dispatch attention
      needsAssignment.push(makeJob());
    }
  }

  // Build DispatchTech array
  const techs: DispatchTech[] = [];
  for (const [techId, jobs] of todayDispatchMap) {
    techs.push({
      id: techId,
      name: techNameMap.get(techId) ?? "Unknown Tech",
      jobs,
    });
  }
  // Sort techs by job count descending
  techs.sort((a, b) => b.jobs.length - a.jobs.length);

  // ── Alerts Count ──
  // Unique WO count where overdue OR emergency (no double-counting)
  const alertsCount = wos.filter((wo) => {
    const isOverdue = isValidDateStr(wo.scheduled_date) && wo.scheduled_date < todayStr;
    const isEmergency = wo.priority === "emergency";
    return isOverdue || isEmergency;
  }).length;

  return {
    properties,
    feed: feedItems,
    dispatch: { techs, unscheduledToday, needsAssignment },
    alertsCount,
    todayStr,
  };
}
