"use server";

import { createClient } from "@/lib/supabase/server";

// ─── Types ────────────────────────────────────────────────
export interface DashboardActiveWo {
  id: string;
  status: string;
  trade: string | null;
  description: string | null;
  property_name: string | null;
  vendor_name: string | null;
  created_at: string;
  scheduled_date: string | null;
  scheduled_time_start: string | null;
}

export interface DashboardUpcoming {
  id: string;
  trade: string | null;
  property_name: string | null;
  vendor_name: string | null;
  scheduled_date: string;
  scheduled_time_start: string | null;
  scheduled_time_end: string | null;
  status: string;
}

export interface DashboardProperty {
  id: string;
  address: string;
  city: string | null;
  state: string | null;
  property_type: string | null;
  hvac_age: number | null;
  water_heater_age: number | null;
  roof_age: number | null;
  electrical_panel: string | null;
}

export type ActivityEventType =
  | "wo_created"
  | "estimate_received"
  | "estimate_approved"
  | "job_scheduled"
  | "job_completed"
  | "review_requested"
  | "review_submitted";

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  timestamp: string;
  trade: string | null;
  vendor_name: string | null;
  wo_id: string | null;
  meta?: Record<string, unknown>;
}

export interface DashboardData {
  activeWos: DashboardActiveWo[];
  upcoming: DashboardUpcoming[];
  property: DashboardProperty | null;
  activity: ActivityEvent[];
  stats: {
    totalActive: number;
    totalCompleted: number;
    upcomingCount: number;
    poolBalance: number;
  };
}

// ─── Main aggregator ──────────────────────────────────────
export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      activeWos: [],
      upcoming: [],
      property: null,
      activity: [],
      stats: { totalActive: 0, totalCompleted: 0, upcomingCount: 0, poolBalance: 0 },
    };
  }

  const today = new Date().toISOString().split("T")[0];

  // Run all queries in parallel
  const [
    woRes,
    propertyRes,
    poolRes,
    estimateRes,
    ratingRes,
  ] = await Promise.all([
    // All homeowner WOs
    supabase
      .from("vendor_work_orders")
      .select("id, status, trade, description, property_name, vendor_org_id, created_at, scheduled_date, scheduled_time_start, scheduled_time_end, completed_at")
      .eq("homeowner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),

    // Property
    supabase
      .from("homeowner_properties")
      .select("id, address, city, state, property_type, hvac_age, water_heater_age, roof_age, electrical_panel")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Maintenance pool
    supabase
      .from("maintenance_pools")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle(),

    // Recent estimates
    supabase
      .from("vendor_estimates")
      .select("id, status, total, work_order_id, vendor_org_id, created_at, updated_at")
      .in("work_order_id", []) // Will be populated below
      .limit(0), // placeholder - real query after WOs

    // Recent ratings by this homeowner
    supabase
      .from("vendor_ratings")
      .select("id, work_order_id, vendor_org_id, rating, created_at, trade")
      .eq("homeowner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const wos = woRes.data ?? [];

  // Fetch vendor names for all relevant vendor_org_ids
  const vendorOrgIds = [...new Set(wos.map((w) => w.vendor_org_id).filter(Boolean))] as string[];
  let vendorNameMap: Record<string, string> = {};

  if (vendorOrgIds.length > 0) {
    const { data: vendorOrgs } = await supabase
      .from("vendor_organizations")
      .select("id, name")
      .in("id", vendorOrgIds);

    vendorNameMap = Object.fromEntries(
      (vendorOrgs ?? []).map((v) => [v.id, v.name])
    );
  }

  // Fetch estimates for these WOs
  const woIds = wos.map((w) => w.id);
  let estimates: Array<{
    id: string;
    status: string;
    total: number;
    work_order_id: string;
    vendor_org_id: string;
    created_at: string;
    updated_at: string;
  }> = [];

  if (woIds.length > 0) {
    const { data: estData } = await supabase
      .from("vendor_estimates")
      .select("id, status, total, work_order_id, vendor_org_id, created_at, updated_at")
      .in("work_order_id", woIds)
      .order("created_at", { ascending: false });
    estimates = estData ?? [];
  }

  // Active statuses
  const activeStatuses = ["open", "matching", "no_match", "assigned", "accepted", "scheduled", "en_route", "on_site", "in_progress"];
  const completedStatuses = ["completed", "done_pending_approval", "invoiced", "paid"];

  // Build active WO list (last 5)
  const activeWos: DashboardActiveWo[] = wos
    .filter((w) => activeStatuses.includes(w.status))
    .slice(0, 5)
    .map((w) => ({
      id: w.id,
      status: w.status,
      trade: w.trade,
      description: w.description,
      property_name: w.property_name,
      vendor_name: w.vendor_org_id ? vendorNameMap[w.vendor_org_id] ?? null : null,
      created_at: w.created_at,
      scheduled_date: w.scheduled_date,
      scheduled_time_start: w.scheduled_time_start,
    }));

  // Build upcoming visits (scheduled_date >= today)
  const upcoming: DashboardUpcoming[] = wos
    .filter((w) => w.scheduled_date && w.scheduled_date >= today && !completedStatuses.includes(w.status) && w.status !== "declined")
    .sort((a, b) => (a.scheduled_date! > b.scheduled_date! ? 1 : -1))
    .slice(0, 5)
    .map((w) => ({
      id: w.id,
      trade: w.trade,
      property_name: w.property_name,
      vendor_name: w.vendor_org_id ? vendorNameMap[w.vendor_org_id] ?? null : null,
      scheduled_date: w.scheduled_date!,
      scheduled_time_start: w.scheduled_time_start,
      scheduled_time_end: w.scheduled_time_end,
      status: w.status,
    }));

  // Build activity feed
  const activity: ActivityEvent[] = [];

  // 1. WO created events
  for (const w of wos.slice(0, 10)) {
    activity.push({
      id: `wo-${w.id}`,
      type: "wo_created",
      timestamp: w.created_at,
      trade: w.trade,
      vendor_name: null,
      wo_id: w.id,
    });
  }

  // 2. Estimate received / approved events
  for (const e of estimates) {
    const vName = vendorNameMap[e.vendor_org_id] ?? null;
    if (e.status === "approved") {
      activity.push({
        id: `est-approved-${e.id}`,
        type: "estimate_approved",
        timestamp: e.updated_at,
        trade: null,
        vendor_name: vName,
        wo_id: e.work_order_id,
        meta: { total: e.total },
      });
    }
    // Estimate received (any status means it was sent to homeowner at some point)
    activity.push({
      id: `est-recv-${e.id}`,
      type: "estimate_received",
      timestamp: e.created_at,
      trade: null,
      vendor_name: vName,
      wo_id: e.work_order_id,
      meta: { total: e.total },
    });
  }

  // 3. Job scheduled events
  for (const w of wos.filter((w) => w.scheduled_date)) {
    activity.push({
      id: `sched-${w.id}`,
      type: "job_scheduled",
      timestamp: w.scheduled_date! + "T00:00:00Z",
      trade: w.trade,
      vendor_name: w.vendor_org_id ? vendorNameMap[w.vendor_org_id] ?? null : null,
      wo_id: w.id,
      meta: { date: w.scheduled_date },
    });
  }

  // 4. Job completed events
  for (const w of wos.filter((w) => completedStatuses.includes(w.status) && w.completed_at)) {
    activity.push({
      id: `done-${w.id}`,
      type: "job_completed",
      timestamp: w.completed_at!,
      trade: w.trade,
      vendor_name: w.vendor_org_id ? vendorNameMap[w.vendor_org_id] ?? null : null,
      wo_id: w.id,
    });
  }

  // 5. Review submitted events
  const ratings = ratingRes.data ?? [];
  for (const r of ratings) {
    const vName = r.vendor_org_id ? vendorNameMap[r.vendor_org_id] ?? null : null;
    activity.push({
      id: `review-${r.id}`,
      type: "review_submitted",
      timestamp: r.created_at,
      trade: r.trade,
      vendor_name: vName,
      wo_id: r.work_order_id,
      meta: { rating: r.rating },
    });
  }

  // Sort by timestamp DESC and limit to 10
  activity.sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1));
  const dedupedActivity: ActivityEvent[] = [];
  const seenIds = new Set<string>();
  for (const evt of activity) {
    if (!seenIds.has(evt.id)) {
      seenIds.add(evt.id);
      dedupedActivity.push(evt);
    }
    if (dedupedActivity.length >= 10) break;
  }

  // Stats
  const totalActive = wos.filter((w) => activeStatuses.includes(w.status)).length;
  const totalCompleted = wos.filter((w) => completedStatuses.includes(w.status)).length;

  return {
    activeWos,
    upcoming,
    property: propertyRes.data ?? null,
    activity: dedupedActivity,
    stats: {
      totalActive,
      totalCompleted,
      upcomingCount: upcoming.length,
      poolBalance: poolRes.data?.balance ?? 0,
    },
  };
}
