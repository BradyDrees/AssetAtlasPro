"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole } from "@/lib/vendor/role-helpers";

export interface EstimateVersion {
  id: string;
  estimate_id: string;
  version_number: number;
  snapshot: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

// ─── Get Versions ───────────────────────────────────────────────────────────

export async function getEstimateVersions(
  estimateId: string
): Promise<{ data: EstimateVersion[]; error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  const { data: est } = await supabase
    .from("vendor_estimates")
    .select("id")
    .eq("id", estimateId)
    .eq("vendor_org_id", vendor_org_id)
    .single();

  if (!est) return { data: [], error: "Estimate not found" };

  const { data, error } = await supabase
    .from("vendor_estimate_versions")
    .select("*")
    .eq("estimate_id", estimateId)
    .order("version_number", { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as EstimateVersion[] };
}

// ─── Create Version Snapshot ────────────────────────────────────────────────

export async function createEstimateVersion(
  estimateId: string
): Promise<{ data?: EstimateVersion; error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Fetch full estimate + sections + items for snapshot
  const { data: est } = await supabase
    .from("vendor_estimates")
    .select("*")
    .eq("id", estimateId)
    .eq("vendor_org_id", vendor_org_id)
    .single();

  if (!est) return { error: "Estimate not found" };

  const { data: sections } = await supabase
    .from("vendor_estimate_sections")
    .select("*, vendor_estimate_items(*)")
    .eq("estimate_id", estimateId)
    .order("sort_order", { ascending: true });

  // Get next version number
  const { data: maxVer } = await supabase
    .from("vendor_estimate_versions")
    .select("version_number")
    .eq("estimate_id", estimateId)
    .order("version_number", { ascending: false })
    .limit(1)
    .single();

  const nextVersion = (maxVer?.version_number ?? 0) + 1;

  const snapshot = {
    estimate: est,
    sections: sections ?? [],
    snapshotDate: new Date().toISOString(),
  };

  const { data: version, error } = await supabase
    .from("vendor_estimate_versions")
    .insert({
      estimate_id: estimateId,
      version_number: nextVersion,
      snapshot,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: version as EstimateVersion };
}
