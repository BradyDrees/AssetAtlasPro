"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole } from "@/lib/vendor/role-helpers";
import { revalidatePath } from "next/cache";

// ─── Types ───

export interface OrgReview {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
  vendor_response: string | null;
  vendor_responded_at: string | null;
  trade: string | null;
  homeowner_name: string | null;
}

export interface ReviewAnalytics {
  // All-time (from vendor_organizations, denormalized)
  avg_rating: number | null;
  total_reviews: number;
  // All-time (computed from vendor_ratings)
  response_rate: number;
  unresponded_count: number;
  // Last 6 months
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  monthly_trend: Array<{ month: string; avg_rating: number; count: number }>;
}

// ─── Queries ───

/** Fetch reviews for the current vendor org with optional filters */
export async function getOrgReviews(filters?: {
  responded?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ data: OrgReview[]; total: number; error?: string }> {
  try {
    const auth = await requireVendorRole();
    const supabase = await createClient();

    let query = supabase
      .from("vendor_ratings")
      .select(
        "id, rating, review, created_at, vendor_response, vendor_responded_at, trade, homeowner_id",
        { count: "exact" }
      )
      .eq("vendor_org_id", auth.vendor_org_id)
      .order("created_at", { ascending: false });

    if (filters?.responded === true) {
      query = query.not("vendor_response", "is", null);
    } else if (filters?.responded === false) {
      query = query.is("vendor_response", null);
    }

    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;
    query = query.range(offset, offset + limit - 1);

    const { data: ratings, count, error } = await query;

    if (error) return { data: [], total: 0, error: error.message };

    // Resolve homeowner names
    const homeownerIds = [...new Set((ratings ?? []).map((r) => r.homeowner_id).filter(Boolean))];
    let nameMap: Record<string, string> = {};

    if (homeownerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", homeownerIds);

      if (profiles) {
        nameMap = Object.fromEntries(
          profiles.map((p) => [p.id, p.full_name || null]).filter(([, v]) => v)
        );
      }
    }

    const reviews: OrgReview[] = (ratings ?? []).map((r) => ({
      id: r.id,
      rating: r.rating,
      review: r.review,
      created_at: r.created_at,
      vendor_response: r.vendor_response,
      vendor_responded_at: r.vendor_responded_at,
      trade: r.trade,
      homeowner_name: r.homeowner_id ? nameMap[r.homeowner_id] ?? null : null,
    }));

    return { data: reviews, total: count ?? 0 };
  } catch (err) {
    return {
      data: [],
      total: 0,
      error: err instanceof Error ? err.message : "Failed to load reviews",
    };
  }
}

/** Respond to a review (owner/admin/office_manager only) */
export async function respondToReview(
  ratingId: string,
  response: string
): Promise<{ error?: string }> {
  try {
    const auth = await requireVendorRole();

    // Only owner, admin, office_manager can respond
    if (!["owner", "admin", "office_manager"].includes(auth.role)) {
      return { error: "Insufficient permissions" };
    }

    const supabase = await createClient();

    // Verify rating belongs to this vendor org
    const { data: rating } = await supabase
      .from("vendor_ratings")
      .select("id, vendor_org_id")
      .eq("id", ratingId)
      .single();

    if (!rating || rating.vendor_org_id !== auth.vendor_org_id) {
      return { error: "Review not found" };
    }

    // Strip HTML tags and trim
    const stripped = response.replace(/<[^>]*>/g, "").trim();

    if (stripped.length === 0) {
      // Blank → clear response
      await supabase
        .from("vendor_ratings")
        .update({ vendor_response: null, vendor_responded_at: null })
        .eq("id", ratingId);
    } else if (stripped.length > 500) {
      return { error: "Response must be 500 characters or less" };
    } else {
      await supabase
        .from("vendor_ratings")
        .update({
          vendor_response: stripped,
          vendor_responded_at: new Date().toISOString(),
        })
        .eq("id", ratingId);
    }

    revalidatePath("/vendor/reviews");
    revalidatePath("/vendors", "layout");

    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to save response",
    };
  }
}

/** Get review analytics for the current vendor org */
export async function getReviewAnalytics(): Promise<{
  data: ReviewAnalytics | null;
  error?: string;
}> {
  try {
    const auth = await requireVendorRole();
    const supabase = await createClient();

    // All-time from vendor_organizations (denormalized)
    const { data: org } = await supabase
      .from("vendor_organizations")
      .select("avg_rating, total_ratings")
      .eq("id", auth.vendor_org_id)
      .single();

    if (!org) return { data: null, error: "Organization not found" };

    // All-time response stats
    const [totalRes, respondedRes] = await Promise.all([
      supabase
        .from("vendor_ratings")
        .select("id", { count: "exact", head: true })
        .eq("vendor_org_id", auth.vendor_org_id),
      supabase
        .from("vendor_ratings")
        .select("id", { count: "exact", head: true })
        .eq("vendor_org_id", auth.vendor_org_id)
        .not("vendor_response", "is", null),
    ]);

    const totalReviews = totalRes.count ?? 0;
    const respondedCount = respondedRes.count ?? 0;
    const unrespondedCount = totalReviews - respondedCount;
    const responseRate = totalReviews > 0 ? Math.round((respondedCount / totalReviews) * 100) : 0;

    // Last 6 months: distribution + monthly trend
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: recentRatings } = await supabase
      .from("vendor_ratings")
      .select("rating, created_at")
      .eq("vendor_org_id", auth.vendor_org_id)
      .gte("created_at", sixMonthsAgo.toISOString())
      .order("created_at", { ascending: true });

    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const monthlyMap: Record<string, { total: number; count: number }> = {};

    for (const r of recentRatings ?? []) {
      const star = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
      distribution[star]++;

      const monthKey = r.created_at.slice(0, 7); // "YYYY-MM"
      if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { total: 0, count: 0 };
      monthlyMap[monthKey].total += r.rating;
      monthlyMap[monthKey].count++;
    }

    const monthly_trend = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { total, count }]) => ({
        month,
        avg_rating: Math.round((total / count) * 10) / 10,
        count,
      }));

    return {
      data: {
        avg_rating: org.avg_rating != null ? Number(org.avg_rating) : null,
        total_reviews: org.total_ratings ?? 0,
        response_rate: responseRate,
        unresponded_count: unrespondedCount,
        distribution,
        monthly_trend,
      },
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to load analytics",
    };
  }
}
