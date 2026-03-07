"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole } from "@/lib/vendor/role-helpers";

export interface VendorPmClientOption {
  pm_user_id: string;
  pm_name: string;
}

export async function getVendorPmClients(): Promise<VendorPmClientOption[]> {
  const auth = await requireVendorRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_pm_relationships")
    .select(`
      pm_user_id,
      profiles:pm_user_id (
        full_name
      )
    `)
    .eq("vendor_org_id", auth.vendor_org_id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getVendorPmClients error", error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    pm_user_id: row.pm_user_id,
    pm_name: row.profiles?.full_name ?? "Unknown PM",
  }));
}
