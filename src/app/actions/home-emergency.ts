"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { emitEvent } from "@/lib/platform/domain-events";

// ─── Types ────────────────────────────────────────────────

const EMERGENCY_TYPES = [
  "water",
  "electrical",
  "gas",
  "fire",
  "lockout",
  "other",
] as const;

type EmergencyType = (typeof EMERGENCY_TYPES)[number];

const EMERGENCY_TRADE_MAP: Record<EmergencyType, string> = {
  water: "plumbing",
  electrical: "electrical",
  gas: "plumbing",
  fire: "general",
  lockout: "general",
  other: "general",
};

// ─── Create Emergency SOS ────────────────────────────────

export async function createEmergencySOS(input: {
  emergencyType: string;
  description: string;
}): Promise<{
  success: boolean;
  woId?: string;
  error?: string;
  errorCode?: "duplicate" | "rate_limit" | "no_property";
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Validate emergency type
    const emergencyType = input.emergencyType as EmergencyType;
    if (!EMERGENCY_TYPES.includes(emergencyType)) {
      return { success: false, error: "Invalid emergency type" };
    }

    // Get user's property
    const { data: property } = await supabase
      .from("homeowner_properties")
      .select("id, address, city, state, zip")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!property) {
      return { success: false, error: "No property found", errorCode: "no_property" };
    }

    const serviceClient = createServiceClient();

    // ── Dedupe: block duplicate emergencies for same property + type within 10 min ──
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recentDispatch } = await serviceClient
      .from("emergency_dispatches")
      .select("id")
      .eq("property_id", property.id)
      .eq("emergency_type", emergencyType)
      .gte("created_at", tenMinutesAgo)
      .in("status", ["dispatching", "accepted"])
      .limit(1)
      .maybeSingle();

    if (recentDispatch) {
      return { success: false, error: "Duplicate emergency", errorCode: "duplicate" };
    }

    // ── Rate limit: max 3 emergency requests per user per hour ──
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await serviceClient
      .from("emergency_dispatches")
      .select("id", { count: "exact", head: true })
      .eq("property_id", property.id)
      .gte("created_at", oneHourAgo);

    if ((recentCount ?? 0) >= 3) {
      return { success: false, error: "Rate limited", errorCode: "rate_limit" };
    }

    // ── Create emergency WO ──
    const trade = EMERGENCY_TRADE_MAP[emergencyType];
    const propertyName = [property.address, property.city, property.state]
      .filter(Boolean)
      .join(", ");

    const { data: wo, error: woError } = await serviceClient
      .from("vendor_work_orders")
      .insert({
        homeowner_id: user.id,
        property_id: property.id,
        property_name: propertyName,
        trade,
        description: `[EMERGENCY - ${emergencyType.toUpperCase()}] ${input.description}`,
        urgency: "emergency",
        priority: "emergency",
        status: "open",
      })
      .select("id")
      .single();

    if (woError || !wo) {
      return { success: false, error: woError?.message ?? "Failed to create work order" };
    }

    // ── Create emergency dispatch record ──
    const { data: dispatch, error: dispatchError } = await serviceClient
      .from("emergency_dispatches")
      .insert({
        property_id: property.id,
        wo_id: wo.id,
        emergency_type: emergencyType,
        status: "dispatching",
      })
      .select("id")
      .single();

    if (dispatchError || !dispatch) {
      return { success: false, error: dispatchError?.message ?? "Failed to create dispatch" };
    }

    // ── Find emergency vendors ──
    // Ranked by: emergency_available (30) + wilson_rating (40) + response_time bonus (20) + saved vendor (10)
    const { data: savedVendors } = await supabase
      .from("homeowner_saved_vendors")
      .select("vendor_org_id")
      .eq("user_id", user.id);

    const savedVendorIds = new Set((savedVendors ?? []).map((sv) => sv.vendor_org_id));

    // Query vendors that serve this trade
    const { data: vendors } = await serviceClient
      .from("vendor_organizations")
      .select("id, name, emergency_available, wilson_score, avg_response_time_hours")
      .eq("status", "active")
      .or(`primary_trade.eq.${trade},secondary_trades.cs.{${trade}}`);

    if (!vendors || vendors.length === 0) {
      // Zero-vendor path: WO still created, user notified, match-timeouts cron picks up
      emitEvent(
        "emergency_sos.created",
        "emergency_dispatch",
        dispatch.id,
        {
          origin_module: "home",
          work_order_id: wo.id,
          property_id: property.id,
          emergency_type: emergencyType,
          vendor_count: 0,
        },
        { id: user.id, type: "user" }
      );

      return { success: true, woId: wo.id };
    }

    // Score and rank vendors
    const rankedVendors = vendors
      .map((v) => {
        let score = 0;
        if (v.emergency_available) score += 30;
        score += (v.wilson_score ?? 0) * 40;
        // Response time score: faster = higher (inverse, max 20)
        const avgHours = v.avg_response_time_hours ?? 24;
        const responseScore = Math.max(0, 20 - avgHours);
        score += responseScore;
        if (savedVendorIds.has(v.id)) score += 10;
        return { ...v, rankScore: score };
      })
      .sort((a, b) => b.rankScore - a.rankScore);

    // Batch 1: top 3 vendors (notified immediately)
    const batch1 = rankedVendors.slice(0, 3);
    const batch2 = rankedVendors.slice(3, 6);

    // Insert dispatch vendor rows
    const dispatchVendorRows = [
      ...batch1.map((v) => ({
        dispatch_id: dispatch.id,
        vendor_org_id: v.id,
        batch_number: 1,
        notified_at: new Date().toISOString(),
        response_status: "pending" as const,
      })),
      ...batch2.map((v) => ({
        dispatch_id: dispatch.id,
        vendor_org_id: v.id,
        batch_number: 2,
        response_status: "pending" as const,
      })),
    ];

    if (dispatchVendorRows.length > 0) {
      await serviceClient
        .from("emergency_dispatch_vendors")
        .insert(dispatchVendorRows);
    }

    // Emit domain events
    emitEvent(
      "emergency_sos.created",
      "emergency_dispatch",
      dispatch.id,
      {
        origin_module: "home",
        work_order_id: wo.id,
        property_id: property.id,
        emergency_type: emergencyType,
        vendor_count: rankedVendors.length,
      },
      { id: user.id, type: "user" }
    );

    // Emit vendor notification events (batch 1 only — batch 2 handled by cron)
    for (const v of batch1) {
      emitEvent(
        "emergency_sos.vendor_notified",
        "emergency_dispatch",
        dispatch.id,
        {
          origin_module: "home",
          vendor_org_id: v.id,
          work_order_id: wo.id,
          batch_number: 1,
        },
        { id: user.id, type: "user" }
      );
    }

    return { success: true, woId: wo.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong",
    };
  }
}
