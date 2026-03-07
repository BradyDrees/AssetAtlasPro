"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole } from "@/lib/vendor/role-helpers";
import { isQboConfigured } from "@/lib/integrations/qbo-client";
import type { VendorIntegration, SyncLogEntry } from "@/lib/integrations/qbo-types";

/**
 * Get all integrations for the current vendor org.
 */
export async function getIntegrations(): Promise<{
  data: VendorIntegration[];
  qboConfigured: boolean;
  error?: string;
}> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_integrations")
    .select("*")
    .eq("vendor_org_id", vendor_org_id)
    .order("created_at", { ascending: false });

  if (error) return { data: [], qboConfigured: isQboConfigured(), error: error.message };
  return { data: (data ?? []) as VendorIntegration[], qboConfigured: isQboConfigured() };
}

/**
 * Trigger a manual full sync for an integration.
 */
export async function triggerSync(integrationId: string): Promise<{
  invoices?: number;
  expenses?: number;
  errors?: number;
  error?: string;
}> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  // Verify ownership
  const { data: integration } = await supabase
    .from("vendor_integrations")
    .select("*")
    .eq("id", integrationId)
    .eq("vendor_org_id", vendor_org_id)
    .eq("is_active", true)
    .single();

  if (!integration) return { error: "Integration not found" };

  // Dynamic import to avoid loading QBO code when not needed
  const { fullSync } = await import("@/lib/integrations/qbo-sync");
  const result = await fullSync(supabase as Parameters<typeof fullSync>[0], integration as VendorIntegration);
  return result;
}

/**
 * Get recent sync log entries for an integration.
 */
export async function getSyncLog(
  integrationId: string,
  limit = 50
): Promise<{ data: SyncLogEntry[]; error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  // Verify ownership via join
  const { data: integration } = await supabase
    .from("vendor_integrations")
    .select("id")
    .eq("id", integrationId)
    .eq("vendor_org_id", vendor_org_id)
    .maybeSingle();

  if (!integration) return { data: [], error: "Integration not found" };

  const { data, error } = await supabase
    .from("vendor_integration_sync_log")
    .select("*")
    .eq("integration_id", integrationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as SyncLogEntry[] };
}
