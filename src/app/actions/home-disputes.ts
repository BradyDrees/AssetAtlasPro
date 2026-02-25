"use server";

import { createClient } from "@/lib/supabase/server";

interface CreateDisputeInput {
  work_order_id: string;
  vendor_org_id: string;
  type: "quality_issue" | "warranty_callback";
  description: string;
  evidence_photos?: string[];
}

/**
 * Open a dispute on a completed work order.
 */
export async function openDispute(
  input: CreateDisputeInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not authenticated" };

    // Verify homeowner owns this WO and it's completed
    const { data: wo } = await supabase
      .from("vendor_work_orders")
      .select("id, status, warranty_expires_at")
      .eq("id", input.work_order_id)
      .eq("homeowner_id", user.id)
      .single();

    if (!wo) return { success: false, error: "Work order not found" };

    if (!["completed", "paid", "invoiced"].includes(wo.status)) {
      return { success: false, error: "Work order must be completed to file a dispute" };
    }

    // Check warranty window
    if (wo.warranty_expires_at && new Date(wo.warranty_expires_at) < new Date()) {
      return { success: false, error: "Warranty period has expired" };
    }

    // Check for existing open dispute
    const { data: existing } = await supabase
      .from("homeowner_disputes")
      .select("id")
      .eq("work_order_id", input.work_order_id)
      .eq("homeowner_id", user.id)
      .not("status", "in", '("resolved","fixed")')
      .limit(1);

    if (existing && existing.length > 0) {
      return { success: false, error: "An active dispute already exists for this work order" };
    }

    const { data, error } = await supabase
      .from("homeowner_disputes")
      .insert({
        work_order_id: input.work_order_id,
        homeowner_id: user.id,
        vendor_org_id: input.vendor_org_id,
        type: input.type,
        description: input.description,
        evidence_photos: input.evidence_photos ?? [],
        warranty_window_days: input.type === "warranty_callback" ? 60 : 30,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to open dispute:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong",
    };
  }
}

/**
 * Get dispute status for a work order.
 */
export async function getDisputeForWorkOrder(workOrderId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("homeowner_disputes")
    .select("*")
    .eq("work_order_id", workOrderId)
    .eq("homeowner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return data;
}

/**
 * Get all disputes for the homeowner.
 */
export async function getHomeDisputes() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("homeowner_disputes")
    .select("*")
    .eq("homeowner_id", user.id)
    .order("created_at", { ascending: false });

  return data ?? [];
}
