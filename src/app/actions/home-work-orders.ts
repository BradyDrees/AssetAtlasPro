"use server";

import { createClient } from "@/lib/supabase/server";
import { matchVendor } from "@/lib/vendor/match-vendor";
import type { Urgency, SelectionMode } from "@/lib/vendor/match-vendor";
import {
  notifyVendorNewWO,
  notifyHomeownerSubmission,
} from "./home-wo-notifications";

interface CreateWOInput {
  trade: string;
  description: string;
  urgency: "emergency" | "urgent" | "routine" | "whenever";
  vendor_selection_mode: "auto_match" | "homeowner_choice" | "preferred_vendor";
  homeowner_property_id: string;
  request_estimate?: boolean;
}

/**
 * Create a homeowner work order with matching + notifications.
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

    // ── Mandatory gate: Access & Instructions ──
    const { data: prop, error: propErr } = await supabase
      .from("homeowner_properties")
      .select("id, gate_code, lockbox_code, alarm_code, parking_instructions")
      .eq("id", input.homeowner_property_id)
      .single();

    if (propErr) {
      return { success: false, error: propErr.message };
    }

    const hasAccess =
      Boolean(prop.gate_code?.trim()) ||
      Boolean(prop.lockbox_code?.trim()) ||
      Boolean(prop.alarm_code?.trim()) ||
      Boolean(prop.parking_instructions?.trim());

    if (!hasAccess) {
      return { success: false, error: "access_required" };
    }

    // Map "whenever" → "flexible" for DB consistency
    const dbUrgency: Urgency =
      input.urgency === "whenever" ? "flexible" : input.urgency;

    // Initial status depends on selection mode
    const initialStatus =
      input.vendor_selection_mode === "homeowner_choice" ? "open" : "matching";

    const { data, error } = await supabase
      .from("vendor_work_orders")
      .insert({
        homeowner_id: user.id,
        homeowner_property_id: input.homeowner_property_id,
        source_type: "client_request",
        trade: input.trade,
        description: input.description,
        urgency: dbUrgency,
        vendor_selection_mode: input.vendor_selection_mode,
        request_estimate: input.request_estimate ?? false,
        status: initialStatus,
        priority:
          dbUrgency === "emergency"
            ? "emergency"
            : dbUrgency === "urgent"
              ? "urgent"
              : "normal",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create WO:", error);
      return { success: false, error: error.message };
    }

    const woId = data.id;
    let vendorAssigned = false;

    // Run matching for auto_match / preferred_vendor
    if (input.vendor_selection_mode !== "homeowner_choice") {
      try {
        const { vendorOrgId } = await matchVendor({
          woId,
          trade: input.trade,
          urgency: dbUrgency,
          selectionMode: input.vendor_selection_mode as SelectionMode,
          homeownerId: user.id,
        });

        if (vendorOrgId) {
          await supabase
            .from("vendor_work_orders")
            .update({ vendor_org_id: vendorOrgId, status: "assigned" })
            .eq("id", woId);

          vendorAssigned = true;

          // Notify vendor org members
          await notifyVendorNewWO({
            woId,
            vendorOrgId,
            trade: input.trade,
            description: input.description,
            urgency: dbUrgency,
          });
        } else {
          // No vendors matched — set to open for homeowner to browse
          await supabase
            .from("vendor_work_orders")
            .update({ status: "open" })
            .eq("id", woId);
        }
      } catch (matchErr) {
        console.error("Matching engine error:", matchErr);
        // Fallback: leave as open so homeowner can pick manually
        await supabase
          .from("vendor_work_orders")
          .update({ status: "open" })
          .eq("id", woId);
      }
    }

    // Notify homeowner
    await notifyHomeownerSubmission({
      homeownerId: user.id,
      woId,
      trade: input.trade,
      vendorAssigned,
    });

    return { success: true, id: woId };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong",
    };
  }
}

/**
 * Assign a vendor to a WO (homeowner_choice mode).
 */
export async function assignVendorToWo(
  woId: string,
  vendorOrgId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not authenticated" };

    // Verify homeowner owns this WO and it's in a valid state
    const { data: wo } = await supabase
      .from("vendor_work_orders")
      .select("id, trade, description, urgency, status")
      .eq("id", woId)
      .eq("homeowner_id", user.id)
      .single();

    if (!wo) return { success: false, error: "Work order not found" };
    if (!["open", "no_match"].includes(wo.status)) {
      return { success: false, error: "Work order already has a vendor" };
    }

    const { error } = await supabase
      .from("vendor_work_orders")
      .update({ vendor_org_id: vendorOrgId, status: "assigned" })
      .eq("id", woId);

    if (error) return { success: false, error: error.message };

    // Notify the chosen vendor
    await notifyVendorNewWO({
      woId,
      vendorOrgId,
      trade: wo.trade ?? "",
      description: wo.description ?? "",
      urgency: wo.urgency ?? "routine",
    });

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong",
    };
  }
}

type MatchPreset = "balanced" | "best_price" | "best_vendor" | "fastest" | "custom";

const PRESET_WEIGHTS: Record<Exclude<MatchPreset, "custom">, [number, number, number, number, number]> = {
  balanced:    [20, 20, 20, 20, 20],
  best_price:  [15, 20, 10, 5, 50],
  best_vendor: [10, 45, 10, 20, 15],
  fastest:     [15, 10, 40, 30, 5],
};

/**
 * Update homeowner's match weight preferences.
 */
export async function updateMatchWeights(input: {
  preset: MatchPreset;
  custom?: {
    proximity: number;
    rating: number;
    availability: number;
    response: number;
    price: number;
  };
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    let weights: [number, number, number, number, number];

    if (input.preset === "custom" && input.custom) {
      const { proximity, rating, availability, response, price } = input.custom;
      if (proximity + rating + availability + response + price !== 100) {
        return { success: false, error: "Weights must sum to 100" };
      }
      weights = [proximity, rating, availability, response, price];
    } else if (input.preset !== "custom") {
      weights = PRESET_WEIGHTS[input.preset];
    } else {
      return { success: false, error: "Custom weights required for custom preset" };
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        match_preset: input.preset,
        match_weight_proximity: weights[0],
        match_weight_rating: weights[1],
        match_weight_availability: weights[2],
        match_weight_response: weights[3],
        match_weight_price: weights[4],
      })
      .eq("id", user.id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong",
    };
  }
}

/**
 * Upload photos for a work order.
 */
export async function uploadWorkOrderPhotos(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const workOrderId = formData.get("work_order_id") as string;
    if (!workOrderId) {
      return { success: false, error: "Missing work order ID" };
    }

    // Verify user owns this work order
    const { data: wo } = await supabase
      .from("vendor_work_orders")
      .select("id")
      .eq("id", workOrderId)
      .eq("homeowner_id", user.id)
      .single();

    if (!wo) {
      return { success: false, error: "Work order not found" };
    }

    let sortOrder = 0;
    for (const [key, value] of formData.entries()) {
      if (!key.startsWith("photo_") || !(value instanceof File)) continue;

      const file = value;
      const ext = file.name.split(".").pop() || "jpg";
      const timestamp = Date.now();
      const rand = Math.random().toString(36).slice(2, 8);
      const path = `${user.id}/work-orders/${workOrderId}/${timestamp}-${rand}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("dd-captures")
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        console.error("Photo upload failed:", uploadError);
        continue;
      }

      await supabase.from("work_order_photos").insert({
        work_order_id: workOrderId,
        uploaded_by: user.id,
        storage_path: path,
        sort_order: sortOrder++,
      });
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Upload failed",
    };
  }
}

/**
 * Get photos for a work order.
 */
export async function getWorkOrderPhotos(workOrderId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("work_order_photos")
    .select("*")
    .eq("work_order_id", workOrderId)
    .order("sort_order", { ascending: true });

  if (!data) return [];

  // Generate signed URLs for each photo
  return Promise.all(
    data.map(async (photo) => {
      const { data: urlData } = await supabase.storage
        .from("dd-captures")
        .createSignedUrl(photo.storage_path, 3600);

      return {
        ...photo,
        url: urlData?.signedUrl ?? null,
      };
    })
  );
}

/**
 * Delete a work order photo.
 */
export async function deleteWorkOrderPhoto(
  photoId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get photo to find storage path
    const { data: photo } = await supabase
      .from("work_order_photos")
      .select("id, storage_path")
      .eq("id", photoId)
      .eq("uploaded_by", user.id)
      .single();

    if (!photo) {
      return { success: false, error: "Photo not found" };
    }

    // Delete from storage
    await supabase.storage.from("dd-captures").remove([photo.storage_path]);

    // Delete from database
    await supabase.from("work_order_photos").delete().eq("id", photoId);

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Delete failed",
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
 * Approve an estimate for a work order.
 * Deducts from maintenance pool first, remainder charged to card.
 */
export async function approveEstimate(input: {
  woId: string;
  estimateId: string;
}): Promise<{
  success: boolean;
  clientSecret?: string | null;
  poolUsed?: number;
  cardCharged?: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Get the WO to verify ownership and get property
    const { data: wo } = await supabase
      .from("vendor_work_orders")
      .select("id, homeowner_property_id, vendor_org_id, platform_fee_pct")
      .eq("id", input.woId)
      .eq("homeowner_id", user.id)
      .single();

    if (!wo) return { success: false, error: "Work order not found" };

    // Get the estimate total
    const { data: estimate } = await supabase
      .from("vendor_estimates")
      .select("id, total, status")
      .eq("id", input.estimateId)
      .single();

    if (!estimate) return { success: false, error: "Estimate not found" };
    if (estimate.status === "approved")
      return { success: false, error: "Estimate already approved" };

    const totalAmount = Number(estimate.total) || 0;
    const feePct = Number(wo.platform_fee_pct) || 5;
    const platformFee = Math.round(totalAmount * (feePct / 100) * 100) / 100;

    // Check pool balance
    let poolUsed = 0;
    let cardCharged = 0;
    let clientSecret: string | null = null;

    if (wo.homeowner_property_id) {
      const { data: pool } = await supabase
        .from("maintenance_pools")
        .select("id, balance")
        .eq("user_id", user.id)
        .eq("property_id", wo.homeowner_property_id)
        .maybeSingle();

      if (pool && pool.balance > 0) {
        poolUsed = Math.min(pool.balance, totalAmount);
        cardCharged = totalAmount - poolUsed;

        // Deduct from pool
        await supabase
          .from("maintenance_pools")
          .update({
            balance: pool.balance - poolUsed,
            total_spent: pool.balance - poolUsed >= 0 ? poolUsed : 0,
            updated_at: new Date().toISOString(),
          })
          .eq("id", pool.id);

        // Log pool transaction
        await supabase.from("pool_transactions").insert({
          pool_id: pool.id,
          type: "withdrawal",
          amount: poolUsed,
          description: `Estimate approved — WO payment`,
          reference_type: "work_order",
          reference_id: wo.id,
        });
      } else {
        cardCharged = totalAmount;
      }
    } else {
      cardCharged = totalAmount;
    }

    // If card needs to be charged, create payment intent
    if (cardCharged > 0) {
      const { isStripeConfigured } = await import(
        "@/lib/stripe/stripe-client"
      );
      if (isStripeConfigured()) {
        // Get customer ID from subscription
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("stripe_customer_id")
          .eq("user_id", user.id)
          .eq("property_id", wo.homeowner_property_id)
          .eq("status", "active")
          .maybeSingle();

        if (sub?.stripe_customer_id) {
          const { createPaymentIntent } = await import(
            "@/lib/stripe/create-payment-intent"
          );
          const result = await createPaymentIntent({
            customerId: sub.stripe_customer_id,
            amountCents: Math.round(cardCharged * 100),
            description: `Work order payment (estimate #${input.estimateId})`,
            metadata: {
              wo_id: wo.id,
              estimate_id: input.estimateId,
            },
          });
          clientSecret = result.clientSecret;
        }
      }
    }

    // Approve the estimate
    await supabase
      .from("vendor_estimates")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", input.estimateId);

    // Update WO with financial details
    await supabase
      .from("vendor_work_orders")
      .update({
        platform_fee_amount: platformFee,
        pool_amount_used: poolUsed,
        card_amount_charged: cardCharged,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wo.id);

    return { success: true, clientSecret, poolUsed, cardCharged };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong",
    };
  }
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
