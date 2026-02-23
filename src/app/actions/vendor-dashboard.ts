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
      .select("id, property_name, description, trade, priority, pm_user_id, created_at")
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
  ]);

  const monthlyRevenue = (paidInvResult.data ?? []).reduce((s, i) => s + Number(i.total || 0), 0);
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

  // Enrich incoming with PM names (simple approach)
  const incoming: IncomingWorkOrder[] = (incomingResult.data ?? []).map((wo: Record<string, unknown>) => ({
    id: wo.id as string,
    property_name: wo.property_name as string | null,
    description: wo.description as string | null,
    trade: wo.trade as string | null,
    priority: wo.priority as string,
    pm_name: null, // Skip N+1 query for now
    created_at: wo.created_at as string,
  }));

  return {
    stats: {
      activeJobs: (activeWosResult.data ?? []).length,
      pendingEstimates: (pendingEstResult.data ?? []).length,
      unpaidInvoices: (unpaidInvResult.data ?? []).length,
      monthlyRevenue,
      completedThisMonth: (completedResult.data ?? []).length,
      avgResponseHours: 0,
    },
    topSources: [], // TODO: aggregate from PM relationships
    techScoreboard: [], // TODO: aggregate from team
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
