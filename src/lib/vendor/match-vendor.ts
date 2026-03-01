import "server-only";
import { createClient } from "@/lib/supabase/server";

type Urgency = "emergency" | "urgent" | "routine" | "flexible";
type SelectionMode = "preferred_vendor" | "auto_match" | "homeowner_choice";

export type { Urgency, SelectionMode };

export function responseDeadlineHours(urgency: Urgency): number {
  switch (urgency) {
    case "emergency":
      return 0.25; // 15 min
    case "urgent":
      return 0.5; // 30 min
    case "routine":
      return 4;
    case "flexible":
      return 24;
  }
}

function wilsonLowerBound(
  positive: number,
  total: number,
  z = 1.96
): number {
  if (total <= 0) return 0;
  const phat = positive / total;
  const denom = 1 + (z * z) / total;
  const centre = phat + (z * z) / (2 * total);
  const adj =
    z *
    Math.sqrt(
      (phat * (1 - phat) + (z * z) / (4 * total)) / total
    );
  return (centre - adj) / denom;
}

function scoreRating(
  avgRating: number | null,
  totalRatings: number | null
): number {
  const r = avgRating ?? 0;
  const n = totalRatings ?? 0;
  if (n <= 0) return 40; // default for unrated vendors
  const positive = Math.max(0, Math.min(n, Math.round((r / 5) * n)));
  return Math.max(
    0,
    Math.min(100, Math.round(wilsonLowerBound(positive, n) * 100))
  );
}

function scoreResponse(label: string | null): number {
  switch (label) {
    case "same_day":
      return 90;
    case "next_day":
      return 60;
    case "within_48hrs":
      return 30;
    default:
      return 50;
  }
}

function scoreEmergency(
  urgency: Urgency,
  available: boolean | null
): number {
  if (urgency !== "emergency") return 0;
  return available ? 100 : 0;
}

export async function matchVendor(params: {
  woId: string;
  trade: string;
  urgency: Urgency;
  selectionMode: SelectionMode;
  homeownerId: string;
}): Promise<{ vendorOrgId: string | null }> {
  const supabase = await createClient();
  const { woId, trade, urgency, selectionMode, homeownerId } = params;

  if (selectionMode === "homeowner_choice") {
    return { vendorOrgId: null };
  }

  if (selectionMode === "preferred_vendor") {
    const { data: pref } = await supabase
      .from("homeowner_vendor_preferences")
      .select("vendor_org_id")
      .eq("user_id", homeownerId)
      .eq("preference_type", "preferred")
      .eq("trade", trade)
      .maybeSingle();

    if (pref?.vendor_org_id) return { vendorOrgId: pref.vendor_org_id };
    // Fall through to auto_match if no preferred vendor found
  }

  return runAutoMatch({ woId, trade, urgency });
}

async function runAutoMatch(params: {
  woId: string;
  trade: string;
  urgency: Urgency;
}): Promise<{ vendorOrgId: string | null }> {
  const supabase = await createClient();
  const { woId, trade, urgency } = params;

  // trades is TEXT[] — .contains() uses @> operator
  const { data: vendors, error } = await supabase
    .from("vendor_organizations")
    .select(
      "id, avg_rating, total_ratings, response_time_label, emergency_available"
    )
    .eq("status", "active")
    .contains("trades", [trade]);

  if (error) throw error;
  if (!vendors || vendors.length === 0) return { vendorOrgId: null };

  const isEmergency = urgency === "emergency";
  const wRating = isEmergency ? 0.4 : 0.6;
  const wResponse = isEmergency ? 0.3 : 0.4;
  const wEmergency = isEmergency ? 0.3 : 0.0;

  const scored = vendors.map((v) => {
    const rating = scoreRating(v.avg_rating, v.total_ratings);
    const response = scoreResponse(v.response_time_label);
    const emergency = scoreEmergency(urgency, v.emergency_available);
    const total =
      Math.round(
        (rating * wRating + response * wResponse + emergency * wEmergency) *
          100
      ) / 100;

    return {
      vendor_org_id: v.id,
      score: total,
      breakdown: { rating, response, emergency },
    };
  });

  // Deterministic sort: score descending, then vendor_org_id for tie-breaking
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.vendor_org_id.localeCompare(b.vendor_org_id);
  });
  const top = scored.slice(0, 5);

  const now = new Date();
  const deadline = new Date(
    now.getTime() + responseDeadlineHours(urgency) * 3600000
  ).toISOString();

  const rows = top.map((m, idx) => ({
    work_order_id: woId,
    vendor_org_id: m.vendor_org_id,
    rank: idx + 1,
    score: m.score,
    score_breakdown: m.breakdown,
    status: idx === 0 ? ("notified" as const) : ("pending" as const),
    notified_at: idx === 0 ? now.toISOString() : null,
    response_deadline: idx === 0 ? deadline : null,
  }));

  const { error: insErr } = await supabase
    .from("vendor_match_attempts")
    .insert(rows);
  if (insErr) throw insErr;

  return { vendorOrgId: top[0]?.vendor_org_id ?? null };
}

export async function cascadeNextMatch(
  woId: string,
  urgency: Urgency
): Promise<{ advanced: boolean; vendorOrgId?: string }> {
  const supabase = await createClient();

  const { data: next } = await supabase
    .from("vendor_match_attempts")
    .select("id, vendor_org_id, rank")
    .eq("work_order_id", woId)
    .eq("status", "pending")
    .order("rank", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!next) {
    await supabase
      .from("vendor_work_orders")
      .update({ status: "no_match" })
      .eq("id", woId);
    return { advanced: false };
  }

  const now = new Date();
  const deadline = new Date(
    now.getTime() + responseDeadlineHours(urgency) * 3600000
  ).toISOString();

  await supabase
    .from("vendor_match_attempts")
    .update({
      status: "notified",
      notified_at: now.toISOString(),
      response_deadline: deadline,
    })
    .eq("id", next.id);

  await supabase
    .from("vendor_work_orders")
    .update({ vendor_org_id: next.vendor_org_id })
    .eq("id", woId);

  return { advanced: true, vendorOrgId: next.vendor_org_id };
}
