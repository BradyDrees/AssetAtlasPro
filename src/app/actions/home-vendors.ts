"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Get marketplace vendors (active vendor organizations).
 */
export async function getMarketplaceVendors(filters?: {
  trade?: string;
  minRating?: number;
  responseTime?: string;
  emergencyOnly?: boolean;
}) {
  const supabase = await createClient();

  let query = supabase
    .from("vendor_organizations")
    .select("id, name, logo_url, description, trades, city, state, service_radius_miles, avg_rating, total_ratings, response_time_label, emergency_available, status")
    .eq("status", "active")
    .order("avg_rating", { ascending: false });

  if (filters?.trade) {
    query = query.contains("trades", [filters.trade]);
  }
  if (filters?.minRating) {
    query = query.gte("avg_rating", filters.minRating);
  }
  if (filters?.responseTime) {
    query = query.eq("response_time_label", filters.responseTime);
  }
  if (filters?.emergencyOnly) {
    query = query.eq("emergency_available", true);
  }

  const { data } = await query;
  return data ?? [];
}

/**
 * Get a single vendor org for profile display.
 */
export async function getVendorProfile(vendorOrgId: string) {
  const supabase = await createClient();

  const { data: vendor } = await supabase
    .from("vendor_organizations")
    .select("*")
    .eq("id", vendorOrgId)
    .eq("status", "active")
    .single();

  if (!vendor) return null;

  // Get ratings
  const { data: ratings } = await supabase
    .from("vendor_ratings")
    .select("id, rating, review, created_at")
    .eq("vendor_org_id", vendorOrgId)
    .order("created_at", { ascending: false })
    .limit(10);

  return { vendor, ratings: ratings ?? [] };
}

/**
 * Save/unsave a vendor.
 */
export async function toggleSaveVendor(
  vendorOrgId: string
): Promise<{ success: boolean; saved: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, saved: false, error: "Not authenticated" };
    }

    // Check if already saved
    const { data: existing } = await supabase
      .from("homeowner_vendor_preferences")
      .select("id")
      .eq("user_id", user.id)
      .eq("vendor_org_id", vendorOrgId)
      .eq("preference_type", "saved")
      .single();

    if (existing) {
      // Unsave
      await supabase
        .from("homeowner_vendor_preferences")
        .delete()
        .eq("id", existing.id);
      return { success: true, saved: false };
    } else {
      // Save
      await supabase.from("homeowner_vendor_preferences").insert({
        user_id: user.id,
        vendor_org_id: vendorOrgId,
        preference_type: "saved",
      });
      return { success: true, saved: true };
    }
  } catch (err) {
    return {
      success: false,
      saved: false,
      error: err instanceof Error ? err.message : "Something went wrong",
    };
  }
}

/**
 * Set/unset a vendor as preferred.
 */
export async function togglePreferredVendor(
  vendorOrgId: string,
  trade?: string
): Promise<{ success: boolean; preferred: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, preferred: false, error: "Not authenticated" };
    }

    const { data: existing } = await supabase
      .from("homeowner_vendor_preferences")
      .select("id")
      .eq("user_id", user.id)
      .eq("vendor_org_id", vendorOrgId)
      .eq("preference_type", "preferred")
      .single();

    if (existing) {
      await supabase
        .from("homeowner_vendor_preferences")
        .delete()
        .eq("id", existing.id);
      return { success: true, preferred: false };
    } else {
      await supabase.from("homeowner_vendor_preferences").insert({
        user_id: user.id,
        vendor_org_id: vendorOrgId,
        trade: trade ?? null,
        preference_type: "preferred",
      });
      return { success: true, preferred: true };
    }
  } catch (err) {
    return {
      success: false,
      preferred: false,
      error: err instanceof Error ? err.message : "Something went wrong",
    };
  }
}

/**
 * Get user's saved vendors.
 */
export async function getSavedVendors() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("homeowner_vendor_preferences")
    .select("id, vendor_org_id, preference_type, trade, created_at")
    .eq("user_id", user.id)
    .eq("preference_type", "saved")
    .order("created_at", { ascending: false });

  return data ?? [];
}

// ─── Vendor Trust Badges ──────────────────────────────────

import type { VendorBadgeData } from "@/lib/home/vendor-badge-types";

/**
 * Get trust badge data for one or more vendor orgs.
 * Queries vendor_credentials directly — no service-role needed.
 * Checks: GL+WC = insured, license, bond, background check.
 * All expiration-aware.
 */
export async function getVendorBadges(
  vendorOrgIds: string[]
): Promise<Record<string, VendorBadgeData>> {
  if (vendorOrgIds.length === 0) return {};

  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: creds } = await supabase
    .from("vendor_credentials")
    .select("vendor_org_id, type, status, expiration_date, name")
    .in("vendor_org_id", vendorOrgIds)
    .eq("status", "active");

  const result: Record<string, VendorBadgeData> = {};

  // Initialize all vendor orgs
  for (const id of vendorOrgIds) {
    result[id] = {
      vendor_org_id: id,
      insured: false,
      licensed: false,
      bonded: false,
      backgroundCheck: false,
    };
  }

  if (!creds) return result;

  // Aggregate per vendor
  const perVendor: Record<string, typeof creds> = {};
  for (const c of creds) {
    (perVendor[c.vendor_org_id] ||= []).push(c);
  }

  for (const [vendorId, vendorCreds] of Object.entries(perVendor)) {
    if (!result[vendorId]) continue;

    const isValid = (c: (typeof creds)[number]) =>
      c.expiration_date === null || c.expiration_date >= today;

    const hasGL = vendorCreds.some(
      (c) => c.type === "insurance_gl" && isValid(c)
    );
    const hasWC = vendorCreds.some(
      (c) => c.type === "insurance_wc" && isValid(c)
    );
    const hasLicense = vendorCreds.some(
      (c) => c.type === "license" && isValid(c)
    );
    const hasBond = vendorCreds.some(
      (c) => c.type === "bond" && isValid(c)
    );
    const hasBackground = vendorCreds.some(
      (c) =>
        c.type === "certification" &&
        isValid(c) &&
        c.name?.toLowerCase().includes("background")
    );

    result[vendorId] = {
      vendor_org_id: vendorId,
      insured: hasGL && hasWC,
      licensed: hasLicense,
      bonded: hasBond,
      backgroundCheck: hasBackground,
    };
  }

  return result;
}
