"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole, logActivity } from "@/lib/vendor/role-helpers";
import type { VendorPmRelationship } from "@/lib/vendor/types";

// ============================================
// Client (PM relationship) queries
// ============================================

export interface ClientWithStats extends VendorPmRelationship {
  pm_email: string | null;
  pm_name: string | null;
  total_jobs: number;
  active_jobs: number;
  total_revenue: number;
}

/** Get all PM clients for the current vendor org with stats */
export async function getVendorClients(): Promise<{
  data: ClientWithStats[];
  error?: string;
}> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  // Get relationships
  const { data: rels, error: relError } = await supabase
    .from("vendor_pm_relationships")
    .select("*")
    .eq("vendor_org_id", vendor_org_id)
    .in("status", ["active", "pending"])
    .order("created_at", { ascending: false });

  if (relError) {
    return { data: [], error: relError.message };
  }

  if (!rels || rels.length === 0) {
    return { data: [] };
  }

  // Enrich with stats
  const enriched: ClientWithStats[] = [];
  for (const rel of rels) {
    // Get PM profile info
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", rel.pm_user_id)
      .single();

    // Get work order stats
    const { data: wos } = await supabase
      .from("vendor_work_orders")
      .select("status, total:budget_amount")
      .eq("vendor_org_id", vendor_org_id)
      .eq("pm_user_id", rel.pm_user_id);

    const jobs = wos ?? [];
    const activeStatuses = ["assigned", "accepted", "scheduled", "en_route", "on_site", "in_progress"];
    const paidJobs = jobs.filter((j) => j.status === "paid");

    // Get invoice revenue
    const { data: invoices } = await supabase
      .from("vendor_invoices")
      .select("total, status")
      .eq("vendor_org_id", vendor_org_id)
      .eq("pm_user_id", rel.pm_user_id)
      .eq("status", "paid");

    const revenue = (invoices ?? []).reduce(
      (sum, inv) => sum + Number(inv.total || 0),
      0
    );

    enriched.push({
      ...rel,
      pm_email: profile?.email ?? null,
      pm_name: profile?.full_name ?? null,
      total_jobs: jobs.length,
      active_jobs: jobs.filter((j) => activeStatuses.includes(j.status)).length,
      total_revenue: revenue,
    });
  }

  return { data: enriched };
}

/** Get detail for a single PM client */
export async function getClientDetail(pmUserId: string): Promise<{
  client: ClientWithStats | null;
  jobs: Array<{
    id: string;
    description: string | null;
    property_name: string | null;
    status: string;
    trade: string | null;
    completed_at: string | null;
    created_at: string;
  }>;
  error?: string;
}> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  const { data: rel, error: relError } = await supabase
    .from("vendor_pm_relationships")
    .select("*")
    .eq("vendor_org_id", vendor_org_id)
    .eq("pm_user_id", pmUserId)
    .single();

  if (relError || !rel) {
    return { client: null, jobs: [], error: relError?.message ?? "Not found" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", pmUserId)
    .single();

  const { data: wos } = await supabase
    .from("vendor_work_orders")
    .select("id, description, property_name, status, trade, completed_at, created_at")
    .eq("vendor_org_id", vendor_org_id)
    .eq("pm_user_id", pmUserId)
    .order("created_at", { ascending: false })
    .limit(50);

  const jobs = wos ?? [];
  const activeStatuses = ["assigned", "accepted", "scheduled", "en_route", "on_site", "in_progress"];

  const { data: invoices } = await supabase
    .from("vendor_invoices")
    .select("total")
    .eq("vendor_org_id", vendor_org_id)
    .eq("pm_user_id", pmUserId)
    .eq("status", "paid");

  const revenue = (invoices ?? []).reduce(
    (sum, inv) => sum + Number(inv.total || 0),
    0
  );

  return {
    client: {
      ...rel,
      pm_email: profile?.email ?? null,
      pm_name: profile?.full_name ?? null,
      total_jobs: jobs.length,
      active_jobs: jobs.filter((j) => activeStatuses.includes(j.status)).length,
      total_revenue: revenue,
    },
    jobs,
  };
}

/** Update notes on a PM relationship */
export async function updateClientNotes(
  pmUserId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  const { error } = await supabase
    .from("vendor_pm_relationships")
    .update({ notes })
    .eq("vendor_org_id", vendor_org_id)
    .eq("pm_user_id", pmUserId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
