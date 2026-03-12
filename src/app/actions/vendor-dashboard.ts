"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole } from "@/lib/vendor/role-helpers";

// Types
export type DateRangePreset = "today" | "week" | "month" | "quarter";

export interface DateRange {
  from: string; // ISO date
  to: string; // ISO date
}

export interface DashboardStats {
  activeJobs: number;
  pendingEstimates: number;
  unpaidInvoices: number;
  monthlyRevenue: number;
  monthlyProfit: number;
  completedThisMonth: number;
  avgResponseHours: number;
}

export interface IncomingWorkOrder {
  id: string;
  property_name: string | null;
  description: string | null;
  trade: string | null;
  priority: string;
  pm_name: string | null;
  created_at: string;
  vendor_selection_mode: string | null;
}

export interface TodayJob {
  id: string;
  property_name: string | null;
  property_address: string | null;
  description: string | null;
  trade: string | null;
  status: string;
  priority: string;
  scheduled_time_start: string | null;
  scheduled_time_end: string | null;
  scheduled_date: string | null;
}

export interface TopSource {
  pm_name: string;
  job_count: number;
  revenue: number;
}

export interface TechScore {
  user_id: string;
  name: string;
  jobs_completed: number;
  avg_rating: number | null;
}

export interface RevenueBalance {
  outstanding: number;
  received: number;
  pastDue: number;
}

export interface ExpenseSummary {
  category: string;
  total: number;
}

export interface DashboardData {
  stats: DashboardStats;
  topSources: TopSource[];
  techScoreboard: TechScore[];
  upcomingJobs: TodayJob[];
  revenueBalance: RevenueBalance;
  expensesSummary: ExpenseSummary[];
  incoming: IncomingWorkOrder[];
}

function getDateRange(preset: DateRangePreset): DateRange {
  const now = new Date();
  const to = now.toISOString().split("T")[0];
  let from: string;
  switch (preset) {
    case "today":
      from = to;
      break;
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      from = d.toISOString().split("T")[0];
      break;
    }
    case "month": {
      from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      break;
    }
    case "quarter": {
      const d2 = new Date(now);
      d2.setMonth(d2.getMonth() - 3);
      from = d2.toISOString().split("T")[0];
      break;
    }
  }
  return { from, to };
}

export async function getDashboardData(
  preset: DateRangePreset = "month"
): Promise<DashboardData> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();
  const { from, to } = getDateRange(preset);
  const fromISO = from + "T00:00:00Z";
  const toISO = to + "T23:59:59Z";
  const todayStr = new Date().toISOString().split("T")[0];

  // Single parallel DB round trip
  const [
    activeWosResult,
    pendingEstResult,
    unpaidInvResult,
    paidInvResult,
    completedResult,
    incomingResult,
    upcomingResult,
    expensesResult,
    outstandingResult,
    pastDueResult,
    topSourcesResult,
    techJobsResult,
    responseTimeResult,
  ] = await Promise.all([
    // Active jobs
    supabase.from("vendor_work_orders").select("id").eq("vendor_org_id", vendor_org_id)
      .in("status", ["assigned","accepted","scheduled","en_route","on_site","in_progress"]),
    // Pending estimates
    supabase.from("vendor_estimates").select("id").eq("vendor_org_id", vendor_org_id)
      .in("status", ["sent","pm_reviewing","with_owner"]),
    // Unpaid invoices
    supabase.from("vendor_invoices").select("id").eq("vendor_org_id", vendor_org_id)
      .in("status", ["submitted","pm_approved","processing"]),
    // Paid invoices in range (revenue)
    supabase.from("vendor_invoices").select("total").eq("vendor_org_id", vendor_org_id)
      .eq("status", "paid").gte("paid_at", fromISO).lte("paid_at", toISO),
    // Completed jobs in range
    supabase.from("vendor_work_orders").select("id").eq("vendor_org_id", vendor_org_id)
      .eq("status", "completed").gte("completed_at", fromISO),
    // Incoming (unaccepted) work orders
    supabase.from("vendor_work_orders")
      .select("id, property_name, description, trade, priority, pm_user_id, created_at, vendor_selection_mode")
      .eq("vendor_org_id", vendor_org_id).eq("status", "assigned")
      .order("created_at", { ascending: false }).limit(5),
    // Upcoming jobs (next 5 days)
    supabase.from("vendor_work_orders")
      .select("id, property_name, property_address, description, trade, status, priority, scheduled_time_start, scheduled_time_end, scheduled_date")
      .eq("vendor_org_id", vendor_org_id)
      .gte("scheduled_date", todayStr)
      .not("status", "in", '("completed","invoiced","paid","declined")')
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time_start", { ascending: true })
      .limit(5),
    // Expenses in range
    supabase.from("vendor_expenses").select("category, amount")
      .eq("vendor_org_id", vendor_org_id)
      .gte("date", from).lte("date", to),
    // Outstanding invoices
    supabase.from("vendor_invoices").select("balance_due")
      .eq("vendor_org_id", vendor_org_id)
      .in("status", ["submitted","pm_approved","processing"]),
    // Past due (submitted > 30 days ago)
    supabase.from("vendor_invoices").select("balance_due")
      .eq("vendor_org_id", vendor_org_id)
      .in("status", ["submitted","pm_approved","processing"])
      .lt("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
    // Top sources: paid invoices grouped by PM (for revenue by PM)
    supabase.from("vendor_invoices").select("pm_user_id, total")
      .eq("vendor_org_id", vendor_org_id)
      .eq("status", "paid")
      .gte("paid_at", fromISO),
    // Tech scoreboard: completed jobs by assigned tech
    supabase.from("vendor_work_orders").select("assigned_to")
      .eq("vendor_org_id", vendor_org_id)
      .eq("status", "completed")
      .not("assigned_to", "is", null),
    // Avg response time: WOs with responded_at in date range
    supabase.from("vendor_work_orders").select("created_at, responded_at")
      .eq("vendor_org_id", vendor_org_id)
      .not("responded_at", "is", null)
      .gte("created_at", fromISO)
      .lte("created_at", toISO),
  ]);

  const monthlyRevenue = (paidInvResult.data ?? []).reduce((s, i) => s + Number(i.total || 0), 0);
  const totalExpenses = (expensesResult.data ?? []).reduce((s, e) => s + Number((e as { amount: number }).amount || 0), 0);
  const monthlyProfit = monthlyRevenue - totalExpenses;
  const received = monthlyRevenue;
  const outstanding = (outstandingResult.data ?? []).reduce((s, i) => s + Number(i.balance_due || 0), 0);
  const pastDue = (pastDueResult.data ?? []).reduce((s, i) => s + Number(i.balance_due || 0), 0);

  // Expense summary by category
  const expenseMap: Record<string, number> = {};
  for (const e of (expensesResult.data ?? [])) {
    const cat = (e as { category: string; amount: number }).category;
    expenseMap[cat] = (expenseMap[cat] || 0) + Number((e as { category: string; amount: number }).amount || 0);
  }
  const expensesSummary = Object.entries(expenseMap).map(([category, total]) => ({ category, total }));

  // Aggregate top sources (PMs by revenue)
  const pmRevenueMap: Record<string, { revenue: number; jobCount: number }> = {};
  for (const inv of (topSourcesResult.data ?? [])) {
    const row = inv as { pm_user_id: string | null; total: number };
    if (!row.pm_user_id) continue;
    const entry = pmRevenueMap[row.pm_user_id] || { revenue: 0, jobCount: 0 };
    entry.revenue += Number(row.total || 0);
    entry.jobCount += 1;
    pmRevenueMap[row.pm_user_id] = entry;
  }
  const topSources: TopSource[] = Object.entries(pmRevenueMap)
    .map(([, val]) => ({
      pm_name: "PM", // Generic label; real names would require auth lookup
      job_count: val.jobCount,
      revenue: val.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // If we have PM IDs, look up their emails as names (best effort, single query)
  const pmIds = Object.keys(pmRevenueMap);
  if (pmIds.length > 0) {
    // Try to get names from vendor_pm_connections if available
    const { data: pmConnections } = await supabase
      .from("vendor_pm_connections")
      .select("pm_user_id, pm_display_name")
      .eq("vendor_org_id", vendor_org_id)
      .in("pm_user_id", pmIds);

    if (pmConnections) {
      const nameMap: Record<string, string> = {};
      for (const c of pmConnections) {
        const conn = c as { pm_user_id: string; pm_display_name: string | null };
        if (conn.pm_display_name) nameMap[conn.pm_user_id] = conn.pm_display_name;
      }
      // Re-map topSources with names
      let idx = 0;
      for (const pmId of Object.keys(pmRevenueMap)) {
        if (idx < topSources.length) {
          topSources[idx].pm_name = nameMap[pmId] || `PM ${idx + 1}`;
          idx++;
        }
      }
    }
  }

  // Aggregate tech scoreboard (team members by completed jobs)
  const techJobMap: Record<string, number> = {};
  for (const wo of (techJobsResult.data ?? [])) {
    const row = wo as { assigned_to: string | null };
    if (!row.assigned_to) continue;
    techJobMap[row.assigned_to] = (techJobMap[row.assigned_to] || 0) + 1;
  }

  let techScoreboard: TechScore[] = [];
  const techIds = Object.keys(techJobMap);
  if (techIds.length > 0) {
    const { data: techs } = await supabase
      .from("vendor_users")
      .select("id, first_name, last_name")
      .eq("vendor_org_id", vendor_org_id)
      .in("id", techIds);

    const techNameMap: Record<string, string> = {};
    for (const t of (techs ?? [])) {
      const tech = t as { id: string; first_name: string | null; last_name: string | null };
      techNameMap[tech.id] = [tech.first_name, tech.last_name].filter(Boolean).join(" ") || "Tech";
    }

    techScoreboard = Object.entries(techJobMap)
      .map(([userId, count]) => ({
        user_id: userId,
        name: techNameMap[userId] || `Tech`,
        jobs_completed: count,
        avg_rating: null,
      }))
      .sort((a, b) => b.jobs_completed - a.jobs_completed)
      .slice(0, 5);
  }

  // Enrich incoming with PM names (simple approach)
  const incoming: IncomingWorkOrder[] = (incomingResult.data ?? []).map((wo: Record<string, unknown>) => ({
    id: wo.id as string,
    property_name: wo.property_name as string | null,
    description: wo.description as string | null,
    trade: wo.trade as string | null,
    priority: wo.priority as string,
    pm_name: null, // Skip N+1 query for now
    created_at: wo.created_at as string,
    vendor_selection_mode: (wo.vendor_selection_mode as string | null) ?? null,
  }));

  return {
    stats: {
      activeJobs: (activeWosResult.data ?? []).length,
      pendingEstimates: (pendingEstResult.data ?? []).length,
      unpaidInvoices: (unpaidInvResult.data ?? []).length,
      monthlyRevenue,
      monthlyProfit,
      completedThisMonth: (completedResult.data ?? []).length,
      avgResponseHours: (() => {
        const rows = (responseTimeResult.data ?? []) as { created_at: string; responded_at: string }[];
        if (rows.length === 0) return 0;
        const totalHours = rows.reduce((sum, r) => {
          const created = new Date(r.created_at).getTime();
          const responded = new Date(r.responded_at).getTime();
          return sum + (responded - created) / 3_600_000;
        }, 0);
        return Math.round((totalHours / rows.length) * 10) / 10;
      })(),
    },
    topSources,
    techScoreboard,
    upcomingJobs: (upcomingResult.data ?? []) as TodayJob[],
    revenueBalance: { outstanding, received, pastDue },
    expensesSummary,
    incoming,
  };
}
// Backward-compatible individual exports

export async function getDashboardStats(): Promise<DashboardStats> {
  const data = await getDashboardData("month");
  return data.stats;
}

export async function getIncomingWorkOrders(): Promise<IncomingWorkOrder[]> {
  const data = await getDashboardData("month");
  return data.incoming;
}

export async function getTodaysJobs(): Promise<TodayJob[]> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();
  const todayStr = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("vendor_work_orders")
    .select("id, property_name, property_address, description, trade, status, priority, scheduled_time_start, scheduled_time_end, scheduled_date")
    .eq("vendor_org_id", vendor_org_id)
    .eq("scheduled_date", todayStr)
    .not("status", "in", '("completed","invoiced","paid","declined")')
    .order("scheduled_time_start", { ascending: true });
  return (data ?? []) as TodayJob[];
}

// ─── Lead Source Breakdown ───

export interface LeadSourceBucket {
  source: string;
  count: number;
}

/**
 * Get breakdown of work orders by lead_source for the vendor org.
 * Returns counts grouped by lead_source, sorted descending.
 */
export async function getLeadSourceBreakdown(): Promise<LeadSourceBucket[]> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  // Fetch all WOs with their lead_source
  const { data } = await supabase
    .from("vendor_work_orders")
    .select("lead_source")
    .eq("vendor_org_id", vendor_org_id);

  if (!data) return [];

  // Group by lead_source in JS (Supabase doesn't support GROUP BY via client)
  const counts = new Map<string, number>();
  for (const row of data) {
    const source = (row.lead_source as string) || "unknown";
    counts.set(source, (counts.get(source) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);
}
