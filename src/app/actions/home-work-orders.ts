"use server";

import { createClient } from "@/lib/supabase/server";

interface CreateWOInput {
  trade: string;
  description: string;
  urgency: "emergency" | "urgent" | "routine" | "whenever";
  vendor_selection_mode: "auto_match" | "homeowner_choice" | "preferred_vendor";
  homeowner_property_id: string;
}

/**
 * Create a homeowner work order.
 */
export async function createHomeWorkOrder(
  input: CreateWOInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("vendor_work_orders")
      .insert({
        homeowner_id: user.id,
        homeowner_property_id: input.homeowner_property_id,
        source_type: "client_request",
        trade: input.trade,
        description: input.description,
        urgency: input.urgency,
        vendor_selection_mode: input.vendor_selection_mode,
        status: "assigned",
        priority: input.urgency === "emergency" ? "emergency" : input.urgency === "urgent" ? "urgent" : "normal",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create WO:", error);
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
 * Get the homeowner's work orders.
 */
export async function getHomeWorkOrders(status?: "active" | "history") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  let query = supabase
    .from("vendor_work_orders")
    .select("*")
    .eq("homeowner_id", user.id)
    .order("created_at", { ascending: false });

  if (status === "active") {
    query = query.not("status", "in", '("completed","paid","declined")');
  } else if (status === "history") {
    query = query.in("status", ["completed", "paid", "declined"]);
  }

  const { data } = await query;
  return data ?? [];
}

/**
 * Get a single work order by ID.
 */
export async function getHomeWorkOrder(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("vendor_work_orders")
    .select("*")
    .eq("id", id)
    .eq("homeowner_id", user.id)
    .single();

  return data;
}

/**
 * Rate a completed work order.
 */
export async function rateWorkOrder(input: {
  work_order_id: string;
  vendor_org_id: string;
  rating: number;
  review?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase.from("vendor_ratings").insert({
      work_order_id: input.work_order_id,
      homeowner_id: user.id,
      vendor_org_id: input.vendor_org_id,
      rating: input.rating,
      review: input.review ?? null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong",
    };
  }
}
