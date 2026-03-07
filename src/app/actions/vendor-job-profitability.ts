"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole } from "@/lib/vendor/role-helpers";

export interface JobProfitability {
  revenue: number;
  material_cost: number;
  labor_cost: number;
  expense_cost: number;
  total_cost: number;
  profit: number;
  margin_pct: number | null;
}

export async function getJobProfitability(
  woId: string
): Promise<{ data?: JobProfitability; error?: string }> {
  try {
    await requireVendorRole();
    const supabase = await createClient();

    // Parallel fetch: paid invoices, materials, time entries, expenses
    const [invRes, matRes, timeRes, expRes] = await Promise.all([
      supabase
        .from("vendor_invoices")
        .select("total")
        .eq("work_order_id", woId)
        .eq("status", "paid"),
      supabase
        .from("vendor_wo_materials")
        .select("total_cost")
        .eq("work_order_id", woId),
      supabase
        .from("vendor_wo_time_entries")
        .select("clock_in, clock_out, hourly_rate")
        .eq("work_order_id", woId),
      supabase
        .from("vendor_expenses")
        .select("amount")
        .eq("work_order_id", woId),
    ]);

    const revenue = (invRes.data ?? []).reduce(
      (s, i) => s + (Number(i.total) || 0),
      0
    );
    const material_cost = (matRes.data ?? []).reduce(
      (s, m) => s + (Number(m.total_cost) || 0),
      0
    );

    let labor_cost = 0;
    for (const te of timeRes.data ?? []) {
      if (!te.clock_in || !te.clock_out) continue;
      const hours = Math.max(
        0,
        (new Date(te.clock_out).getTime() - new Date(te.clock_in).getTime()) /
          3600000
      );
      labor_cost += hours * (Number(te.hourly_rate) || 0);
    }

    const expense_cost = (expRes.data ?? []).reduce(
      (s, e) => s + (Number(e.amount) || 0),
      0
    );

    const total_cost = material_cost + labor_cost + expense_cost;
    const profit = revenue - total_cost;
    const margin_pct =
      revenue > 0
        ? Math.round((profit / revenue) * 10000) / 100
        : null;

    return {
      data: {
        revenue,
        material_cost,
        labor_cost,
        expense_cost,
        total_cost,
        profit,
        margin_pct,
      },
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to load profitability",
    };
  }
}
