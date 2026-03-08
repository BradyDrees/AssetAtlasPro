"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePmRole } from "@/lib/vendor/role-helpers";
import type { VendorScorecardData } from "@/lib/vendor/scorecard-types";

/** Wilson lower-bound confidence score (same algorithm as match-vendor.ts) */
function wilsonLowerBound(positive: number, total: number, z = 1.96): number {
  if (total <= 0) return 0;
  const phat = positive / total;
  const denom = 1 + (z * z) / total;
  const centre = phat + (z * z) / (2 * total);
  const adj =
    z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * total)) / total);
  return (centre - adj) / denom;
}

export async function getVendorScorecard(
  vendorOrgId: string
): Promise<{ data?: VendorScorecardData; error?: string }> {
  try {
    await requirePmRole();
    const supabase = await createClient();

    // Fetch org basics
    const { data: org } = await supabase
      .from("vendor_organizations")
      .select("name, avg_rating, total_ratings, response_time_label, emergency_available")
      .eq("id", vendorOrgId)
      .single();

    if (!org) return { error: "Vendor not found" };

    const avgRating = org.avg_rating != null ? Number(org.avg_rating) : null;
    const totalRatings = org.total_ratings ?? 0;

    // Wilson score
    const positive =
      avgRating != null && totalRatings > 0
        ? Math.max(0, Math.min(totalRatings, Math.round((avgRating / 5) * totalRatings)))
        : 0;
    const wilsonScore =
      totalRatings > 0
        ? Math.round(wilsonLowerBound(positive, totalRatings) * 100)
        : 0;

    // Job counts
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [totalJobsRes, monthlyJobsRes] = await Promise.all([
      supabase
        .from("vendor_work_orders")
        .select("id", { count: "exact", head: true })
        .eq("vendor_org_id", vendorOrgId)
        .eq("status", "completed"),
      supabase
        .from("vendor_work_orders")
        .select("id", { count: "exact", head: true })
        .eq("vendor_org_id", vendorOrgId)
        .eq("status", "completed")
        .gte("completed_at", monthStart.toISOString()),
    ]);

    // On-time completion: completed WOs that had a scheduled_date and completed_at <= scheduled_date + 1 day
    const { data: scheduledWos } = await supabase
      .from("vendor_work_orders")
      .select("scheduled_date, completed_at")
      .eq("vendor_org_id", vendorOrgId)
      .eq("status", "completed")
      .not("scheduled_date", "is", null)
      .not("completed_at", "is", null)
      .limit(200);

    let onTimePct: number | null = null;
    if (scheduledWos && scheduledWos.length > 0) {
      const onTime = scheduledWos.filter((w) => {
        const sched = new Date(w.scheduled_date + "T23:59:59Z");
        const comp = new Date(w.completed_at);
        return comp <= sched;
      }).length;
      onTimePct = Math.round((onTime / scheduledWos.length) * 100);
    }

    // Estimate accuracy: compare estimate totals to invoice totals for matched pairs
    const { data: estimates } = await supabase
      .from("vendor_estimates")
      .select("id, total, work_order_id")
      .eq("vendor_org_id", vendorOrgId)
      .not("work_order_id", "is", null)
      .limit(100);

    let estimateAccuracyPct: number | null = null;
    if (estimates && estimates.length > 0) {
      const woIds = estimates.map((e) => e.work_order_id).filter(Boolean) as string[];
      const { data: invoices } = await supabase
        .from("vendor_invoices")
        .select("work_order_id, total")
        .eq("vendor_org_id", vendorOrgId)
        .eq("status", "paid")
        .in("work_order_id", woIds);

      if (invoices && invoices.length > 0) {
        const invoiceMap: Record<string, number> = {};
        for (const inv of invoices) {
          if (inv.work_order_id) {
            invoiceMap[inv.work_order_id] =
              (invoiceMap[inv.work_order_id] || 0) + Number(inv.total || 0);
          }
        }

        let totalDiff = 0;
        let matchCount = 0;
        for (const est of estimates) {
          if (est.work_order_id && invoiceMap[est.work_order_id] != null) {
            const estTotal = Number(est.total || 0);
            const invTotal = invoiceMap[est.work_order_id];
            if (estTotal > 0) {
              totalDiff += Math.abs(invTotal - estTotal) / estTotal;
              matchCount++;
            }
          }
        }

        if (matchCount > 0) {
          const avgDiff = totalDiff / matchCount;
          estimateAccuracyPct = Math.round(Math.max(0, (1 - avgDiff)) * 100);
        }
      }
    }

    return {
      data: {
        vendor_org_id: vendorOrgId,
        vendor_name: org.name ?? "Unknown",
        avg_rating: avgRating,
        total_ratings: totalRatings,
        wilson_score: wilsonScore,
        total_jobs: totalJobsRes.count ?? 0,
        monthly_jobs: monthlyJobsRes.count ?? 0,
        on_time_pct: onTimePct,
        estimate_accuracy_pct: estimateAccuracyPct,
        response_time_label: org.response_time_label ?? null,
        handles_emergency: org.emergency_available ?? false,
      },
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to load scorecard",
    };
  }
}
