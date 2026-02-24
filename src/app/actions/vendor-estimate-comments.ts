"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole } from "@/lib/vendor/role-helpers";

export interface EstimateComment {
  id: string;
  estimate_id: string;
  author_id: string;
  author_role: "pm" | "vendor";
  body: string;
  created_at: string;
}

// ─── Get Comments ───────────────────────────────────────────────────────────

export async function getEstimateComments(
  estimateId: string
): Promise<{ data: EstimateComment[]; error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  // Verify estimate belongs to vendor org
  const { data: est } = await supabase
    .from("vendor_estimates")
    .select("id")
    .eq("id", estimateId)
    .eq("vendor_org_id", vendor_org_id)
    .single();

  if (!est) return { data: [], error: "Estimate not found" };

  const { data, error } = await supabase
    .from("vendor_estimate_comments")
    .select("*")
    .eq("estimate_id", estimateId)
    .order("created_at", { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as EstimateComment[] };
}

// ─── Add Comment ────────────────────────────────────────────────────────────

export async function addEstimateComment(
  estimateId: string,
  body: string
): Promise<{ data?: EstimateComment; error?: string }> {
  const ctx = await requireVendorRole();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify estimate belongs to vendor org
  const { data: est } = await supabase
    .from("vendor_estimates")
    .select("id")
    .eq("id", estimateId)
    .eq("vendor_org_id", ctx.vendor_org_id)
    .single();

  if (!est) return { error: "Estimate not found" };

  const trimmed = body.trim();
  if (!trimmed || trimmed.length > 2000) return { error: "Invalid comment" };

  const { data, error } = await supabase
    .from("vendor_estimate_comments")
    .insert({
      estimate_id: estimateId,
      author_id: user.id,
      author_role: "vendor",
      body: trimmed,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as EstimateComment };
}

// ─── PM Add Comment (called from PM side) ───────────────────────────────────

export async function addPmEstimateComment(
  estimateId: string,
  body: string
): Promise<{ data?: EstimateComment; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify PM owns this estimate
  const { data: est } = await supabase
    .from("vendor_estimates")
    .select("id")
    .eq("id", estimateId)
    .eq("pm_user_id", user.id)
    .single();

  if (!est) return { error: "Estimate not found" };

  const trimmed = body.trim();
  if (!trimmed || trimmed.length > 2000) return { error: "Invalid comment" };

  const { data, error } = await supabase
    .from("vendor_estimate_comments")
    .insert({
      estimate_id: estimateId,
      author_id: user.id,
      author_role: "pm",
      body: trimmed,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as EstimateComment };
}

// ─── PM Get Comments ────────────────────────────────────────────────────────

export async function getPmEstimateComments(
  estimateId: string
): Promise<{ data: EstimateComment[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  const { data: est } = await supabase
    .from("vendor_estimates")
    .select("id")
    .eq("id", estimateId)
    .eq("pm_user_id", user.id)
    .single();

  if (!est) return { data: [], error: "Estimate not found" };

  const { data, error } = await supabase
    .from("vendor_estimate_comments")
    .select("*")
    .eq("estimate_id", estimateId)
    .order("created_at", { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as EstimateComment[] };
}
