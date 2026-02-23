"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole } from "@/lib/vendor/role-helpers";

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
}

/** Get real dashboard stats for the vendor org */
export async function getDashboardStats(): Promise<DashboardStats> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Parallel queries
  const [wosResult, estimatesResult, invoicesResult, paidResult, completedResult] =
    await Promise.all([
      supabase
        .from("vendor_work_orders")
        .select("id, status, created_at, accepted_at:updated_at")
        .eq("vendor_org_id", vendor_org_id)
        .in("status", ["assigned", "accepted", "scheduled", "en_route", "on_site", "in_progress"]),
      supabase
        .from("vendor_estimates")
        .select("id")
        .eq("vendor_org_id", vendor_org_id)
        .in("status", ["sent", "pm_reviewing", "with_owner"]),
      supabase
        .from("vendor_invoices")
        .select("id")
        .eq("vendor_org_id", vendor_org_id)
        .in("status", ["submitted", "pm_approved", "processing"]),
      supabase
        .from("vendor_invoices")
        .select("total")
        .eq("vendor_org_id", vendor_org_id)
        .eq("status", "paid")
        .gte("paid_at", monthStart),
      supabase
        .from("vendor_work_orders")
        .select("id")
        .eq("vendor_org_id", vendor_org_id)
        .eq("status", "completed")
        .gte("completed_at", monthStart),
    ]);

  const monthlyRevenue = (paidResult.data ?? []).reduce(
    (sum, inv) => sum + Number(inv.total || 0),
    0
  );

  return {
    activeJobs: (wosResult.data ?? []).length,
    pendingEstimates: (estimatesResult.data ?? []).length,
    unpaidInvoices: (invoicesResult.data ?? []).length,
    monthlyRevenue,
    completedThisMonth: (completedResult.data ?? []).length,
    avgResponseHours: 0, // Would need timestamp tracking for real calculation
  };
}

/** Get incoming (unaccepted) work orders */
export async function getIncomingWorkOrders(): Promise<IncomingWorkOrder[]> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  const { data: wos } = await supabase
    .from("vendor_work_orders")
    .select("id, property_name, description, trade, priority, pm_user_id, created_at")
    .eq("vendor_org_id", vendor_org_id)
    .eq("status", "assigned")
    .order("created_at", { ascending: false })
    .limit(5);

  if (!wos || wos.length === 0) return [];

  // Enrich with PM names
  const result: IncomingWorkOrder[] = [];
  for (const wo of wos) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", wo.pm_user_id)
      .single();

    result.push({
      ...wo,
      pm_name: profile?.full_name ?? null,
    });
  }

  return result;
}

/** Get today's scheduled jobs */
export async function getTodaysJobs(): Promise<TodayJob[]> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  const todayStr = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("vendor_work_orders")
    .select("id, property_name, property_address, description, trade, status, priority, scheduled_time_start, scheduled_time_end")
    .eq("vendor_org_id", vendor_org_id)
    .eq("scheduled_date", todayStr)
    .not("status", "in", '("completed","invoiced","paid","declined")')
    .order("scheduled_time_start", { ascending: true });

  return (data ?? []) as TodayJob[];
}
