"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePmRole, requireVendorRole } from "@/lib/vendor/role-helpers";
import type { VendorScorecardData, MonthlyTrendBucket } from "@/lib/vendor/scorecard-types";
import type { SupabaseClient } from "@supabase/supabase-js";

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

/** Build 6 monthly buckets ending at current month */
function buildMonthBuckets(): { start: string; month: string; label: string }[] {
  const buckets: { start: string; month: string; label: string }[] = [];
  const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
    buckets.push({
      start: `${monthStr}-01T00:00:00Z`,
      month: monthStr,
      label: MONTH_LABELS[month],
    });
  }
  return buckets;
}

/** Core computation shared across all scorecard access patterns */
async function computeScorecard(
  supabase: SupabaseClient,
  vendorOrgId: string
): Promise<{ data?: VendorScorecardData; error?: string }> {
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

  const totalJobs = totalJobsRes.count ?? 0;

  // On-time completion
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

  // Estimate accuracy
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

  // --- NEW: Dispute rate ---
  // dispute_rate = # homeowner_disputes / # completed WOs (all-time)
  let disputeRate: number | null = null;
  if (totalJobs > 0) {
    const { count: disputeCount } = await supabase
      .from("homeowner_disputes")
      .select("id", { count: "exact", head: true })
      .eq("vendor_org_id", vendorOrgId);
    disputeRate = Math.round(((disputeCount ?? 0) / totalJobs) * 100);
  }

  // --- NEW: Callback rate ---
  // callback_rate = # WOs with dispute filed within 30 days of completion / # completed WOs
  let callbackRate: number | null = null;
  if (totalJobs > 0) {
    // Get completed WOs with their completed_at and check for disputes within 30 days
    const { data: completedWos } = await supabase
      .from("vendor_work_orders")
      .select("id, completed_at")
      .eq("vendor_org_id", vendorOrgId)
      .eq("status", "completed")
      .not("completed_at", "is", null)
      .limit(500);

    if (completedWos && completedWos.length > 0) {
      const woIds = completedWos.map((w) => w.id);
      const { data: disputes } = await supabase
        .from("homeowner_disputes")
        .select("work_order_id, created_at")
        .eq("vendor_org_id", vendorOrgId)
        .in("work_order_id", woIds);

      if (disputes && disputes.length > 0) {
        const completedMap: Record<string, string> = {};
        for (const w of completedWos) {
          completedMap[w.id] = w.completed_at;
        }

        let callbackCount = 0;
        const countedWos = new Set<string>();
        for (const d of disputes) {
          if (d.work_order_id && !countedWos.has(d.work_order_id) && completedMap[d.work_order_id]) {
            const completedAt = new Date(completedMap[d.work_order_id]);
            const disputeAt = new Date(d.created_at);
            const daysDiff = (disputeAt.getTime() - completedAt.getTime()) / (1000 * 60 * 60 * 24);
            if (daysDiff >= 0 && daysDiff <= 30) {
              callbackCount++;
              countedWos.add(d.work_order_id);
            }
          }
        }
        callbackRate = Math.round((callbackCount / totalJobs) * 100);
      } else {
        callbackRate = 0;
      }
    } else {
      callbackRate = 0;
    }
  }

  // --- NEW: Monthly trend (last 6 calendar months incl. current) ---
  const buckets = buildMonthBuckets();
  const sixMonthsAgo = buckets[0].start;

  const { data: recentRatings } = await supabase
    .from("vendor_ratings")
    .select("rating, created_at")
    .eq("vendor_org_id", vendorOrgId)
    .gte("created_at", sixMonthsAgo)
    .order("created_at", { ascending: true })
    .limit(500);

  const monthlyTrend: MonthlyTrendBucket[] = buckets.map((b) => {
    const monthRatings = (recentRatings ?? []).filter((r) => {
      const rMonth = r.created_at.substring(0, 7); // "YYYY-MM"
      return rMonth === b.month;
    });
    const count = monthRatings.length;
    const avg = count > 0
      ? Math.round((monthRatings.reduce((s, r) => s + Number(r.rating), 0) / count) * 10) / 10
      : null;
    return {
      month: b.month,
      label: b.label,
      avg_rating: avg,
      review_count: count,
    };
  });

  return {
    data: {
      vendor_org_id: vendorOrgId,
      vendor_name: org.name ?? "Unknown",
      avg_rating: avgRating,
      total_ratings: totalRatings,
      wilson_score: wilsonScore,
      total_jobs: totalJobs,
      monthly_jobs: monthlyJobsRes.count ?? 0,
      on_time_pct: onTimePct,
      estimate_accuracy_pct: estimateAccuracyPct,
      response_time_label: org.response_time_label ?? null,
      handles_emergency: org.emergency_available ?? false,
      dispute_rate: disputeRate,
      callback_rate: callbackRate,
      monthly_trend: monthlyTrend,
    },
  };
}

/** Scorecard for PM viewing a vendor */
export async function getVendorScorecard(
  vendorOrgId: string
): Promise<{ data?: VendorScorecardData; error?: string }> {
  try {
    await requirePmRole();
    const supabase = await createClient();
    return computeScorecard(supabase, vendorOrgId);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to load scorecard",
    };
  }
}

/** Scorecard for the vendor themselves (dashboard "Your Performance") */
export async function getVendorScorecardSelf(): Promise<{ data?: VendorScorecardData; error?: string }> {
  try {
    const { vendor_org_id } = await requireVendorRole();
    const supabase = await createClient();
    return computeScorecard(supabase, vendor_org_id);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to load scorecard",
    };
  }
}

/** Scorecard for public vendor profile pages + homeowner views (no role requirement) */
export async function getVendorScorecardPublic(
  vendorOrgId: string
): Promise<{ data?: VendorScorecardData; error?: string }> {
  try {
    const supabase = await createClient();
    return computeScorecard(supabase, vendorOrgId);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to load scorecard",
    };
  }
}
