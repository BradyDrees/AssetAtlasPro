"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole } from "@/lib/vendor/role-helpers";

export interface PropertyIntel {
  property_address: string | null;
  unit_number: string | null;
  past_work_orders: Array<{
    id: string;
    description: string | null;
    trade: string | null;
    status: string;
    completed_at: string | null;
    created_at: string;
  }>;
  total_past_jobs: number;
  total_invoiced: number;
}

export async function getPropertyIntel(
  workOrderId: string
): Promise<{ data?: PropertyIntel; error?: string }> {
  try {
    await requireVendorRole();
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("get_property_intel", {
      p_work_order_id: workOrderId,
    });

    if (error) {
      // If the RPC doesn't exist yet (migration not run), return gracefully
      if (error.message.includes("does not exist")) {
        return { error: "Migration required" };
      }
      return { error: error.message };
    }

    return { data: data as PropertyIntel };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed" };
  }
}
