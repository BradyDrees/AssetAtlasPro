"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole, logActivity } from "@/lib/vendor/role-helpers";

// ─── Types ───

export interface TechRating {
  id: string;
  vendor_org_id: string;
  tech_user_id: string;
  wo_id: string;
  trade: string;
  rating: number;
  notes: string | null;
  rated_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Terminal WO statuses that allow rating ───

const RATABLE_STATUSES = ["completed", "done_pending_approval", "invoiced", "paid"];

// ─── Rate a tech's performance on a work order ───

export async function rateTechPerformance(input: {
  wo_id: string;
  rating: number;
  notes?: string;
}): Promise<{ success: boolean; created?: boolean; error?: string }> {
  try {
    // 1. Authenticate and get org context
    const vendorAuth = await requireVendorRole();
    const { vendor_org_id, role } = vendorAuth;

    // 2. Gate: must be owner/admin/office_manager
    if (!["owner", "admin", "office_manager"].includes(role)) {
      return { success: false, error: "Not authorized to rate technicians" };
    }

    // 3. Validate rating
    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
      return { success: false, error: "Rating must be an integer between 1 and 5" };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // 4. Fetch the WO and validate
    const { data: wo, error: woError } = await supabase
      .from("vendor_work_orders")
      .select("id, vendor_org_id, status, assigned_to, trade")
      .eq("id", input.wo_id)
      .single();

    if (woError || !wo) {
      return { success: false, error: "Work order not found" };
    }

    // 4a. WO belongs to caller's org
    if (wo.vendor_org_id !== vendor_org_id) {
      return { success: false, error: "Work order does not belong to your organization" };
    }

    // 4b. WO is in a terminal status
    if (!RATABLE_STATUSES.includes(wo.status)) {
      return { success: false, error: "Work order must be completed before rating" };
    }

    // 4c. WO has an assigned tech
    if (!wo.assigned_to) {
      return { success: false, error: "No technician assigned to this work order" };
    }

    // 4d. WO has a trade
    if (!wo.trade) {
      return { success: false, error: "Work order has no trade assigned" };
    }

    // 5. Validate the assigned tech belongs to same org and is active
    const { data: techUser, error: techError } = await supabase
      .from("vendor_users")
      .select("id, vendor_org_id, is_active, role")
      .eq("id", wo.assigned_to)
      .single();

    if (techError || !techUser) {
      return { success: false, error: "Assigned technician not found" };
    }

    if (techUser.vendor_org_id !== vendor_org_id) {
      return { success: false, error: "Technician does not belong to your organization" };
    }

    if (!techUser.is_active) {
      return { success: false, error: "Technician is no longer active" };
    }

    // 6. Derive trade and tech_user_id server-side
    const trade = wo.trade;
    const tech_user_id = wo.assigned_to;

    // 7. Check if rating already exists for this WO
    const { data: existing } = await supabase
      .from("tech_ratings")
      .select("id")
      .eq("wo_id", input.wo_id)
      .maybeSingle();

    const isCreate = !existing;

    if (isCreate) {
      // INSERT
      const { error: insertError } = await supabase
        .from("tech_ratings")
        .insert({
          vendor_org_id,
          tech_user_id,
          wo_id: input.wo_id,
          trade,
          rating: input.rating,
          notes: input.notes || null,
          rated_by: user.id,
        });

      if (insertError) {
        console.error("[rateTechPerformance] Insert error:", insertError);
        return { success: false, error: "Failed to save rating" };
      }
    } else {
      // UPDATE — overwrite with current snapshot
      const { error: updateError } = await supabase
        .from("tech_ratings")
        .update({
          tech_user_id,
          trade,
          rating: input.rating,
          notes: input.notes || null,
          rated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("wo_id", input.wo_id);

      if (updateError) {
        console.error("[rateTechPerformance] Update error:", updateError);
        return { success: false, error: "Failed to update rating" };
      }
    }

    // 8. Log activity with metadata
    await logActivity({
      entityType: "tech_rating",
      entityId: input.wo_id,
      action: isCreate ? "tech_rating_created" : "tech_rating_updated",
      newValue: String(input.rating),
      metadata: {
        wo_id: input.wo_id,
        tech_user_id,
        trade,
        rating: input.rating,
        created: isCreate,
      },
    });

    return { success: true, created: isCreate };
  } catch (err) {
    console.error("[rateTechPerformance] Error:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// ─── Fetch existing tech rating for a work order ───

export async function getTechRating(
  woId: string
): Promise<{ data: TechRating | null; error?: string }> {
  try {
    await requireVendorRole();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("tech_ratings")
      .select("*")
      .eq("wo_id", woId)
      .maybeSingle();

    if (error) {
      console.error("[getTechRating] Error:", error);
      return { data: null, error: "Failed to fetch rating" };
    }

    return { data: data as TechRating | null };
  } catch (err) {
    console.error("[getTechRating] Error:", err);
    return { data: null, error: "An unexpected error occurred" };
  }
}
