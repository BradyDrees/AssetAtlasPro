"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePmRole, logActivity } from "@/lib/vendor/role-helpers";
import type { VendorOrgStatus } from "@/lib/vendor/types";

// ============================================
// Types
// ============================================

export interface DirectoryFilters {
  trade?: string;
  city?: string;
  zip?: string;
  minRating?: number;
  responseTime?: string;
  search?: string;
  sortBy?: "rating" | "response_time" | "reviews" | "name";
}

export interface DirectoryVendor {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  service_radius_miles: number;
  trades: string[];
  avg_rating: number;
  total_ratings: number;
  response_time_label: string | null;
  emergency_available: boolean;
  connectionStatus: "none" | "pending" | "active" | "declined";
}

// ============================================
// Search Vendor Directory (PM only)
// ============================================

export async function searchVendorDirectory(
  filters: DirectoryFilters = {}
): Promise<{ data: DirectoryVendor[]; error?: string }> {
  const pmAuth = await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: [], error: "Not authenticated" };

  // Build vendor query — only active vendor orgs
  let query = supabase
    .from("vendor_organizations")
    .select(
      "id, name, logo_url, description, city, state, zip, service_radius_miles, trades, avg_rating, total_ratings, response_time_label, emergency_available, status"
    )
    .eq("status", "active" as VendorOrgStatus);

  // Trade filter — check if vendor's trades array contains the selected trade
  if (filters.trade) {
    query = query.contains("trades", [filters.trade]);
  }

  // City filter
  if (filters.city) {
    query = query.ilike("city", filters.city);
  }

  // Zip filter
  if (filters.zip) {
    query = query.eq("zip", filters.zip);
  }

  // Min rating filter
  if (filters.minRating && filters.minRating > 0) {
    query = query.gte("avg_rating", filters.minRating);
  }

  // Response time filter
  if (filters.responseTime) {
    query = query.eq("response_time_label", filters.responseTime);
  }

  // Search by name
  if (filters.search) {
    query = query.ilike("name", `%${filters.search}%`);
  }

  // Sort
  switch (filters.sortBy) {
    case "rating":
      query = query.order("avg_rating", { ascending: false });
      break;
    case "response_time":
      query = query.order("response_time_label", { ascending: true });
      break;
    case "reviews":
      query = query.order("total_ratings", { ascending: false });
      break;
    case "name":
      query = query.order("name", { ascending: true });
      break;
    default:
      query = query.order("avg_rating", { ascending: false });
  }

  const { data: vendors, error } = await query;

  if (error) {
    console.error("Directory search error:", error);
    return { data: [], error: error.message };
  }

  if (!vendors || vendors.length === 0) {
    return { data: [] };
  }

  // Batch fetch connection statuses for all returned vendors
  const vendorIds = vendors.map((v) => v.id);
  const statuses = await getMyConnectionStatuses(vendorIds, user.id, pmAuth.org_id);

  const results: DirectoryVendor[] = vendors.map((v) => ({
    id: v.id,
    name: v.name,
    logo_url: v.logo_url,
    description: v.description,
    city: v.city,
    state: v.state,
    zip: v.zip,
    service_radius_miles: v.service_radius_miles,
    trades: v.trades ?? [],
    avg_rating: v.avg_rating ?? 0,
    total_ratings: v.total_ratings ?? 0,
    response_time_label: v.response_time_label,
    emergency_available: v.emergency_available ?? false,
    connectionStatus: statuses[v.id] ?? "none",
  }));

  return { data: results };
}

// ============================================
// Get Connection Statuses (batch)
// ============================================

async function getMyConnectionStatuses(
  vendorOrgIds: string[],
  userId: string,
  pmOrgId: string | null
): Promise<Record<string, "none" | "pending" | "active" | "declined">> {
  if (vendorOrgIds.length === 0) return {};

  const supabase = await createClient();

  // Find all relationships for this PM user or PM org with these vendor orgs
  let query = supabase
    .from("vendor_pm_relationships")
    .select("vendor_org_id, status")
    .in("vendor_org_id", vendorOrgIds)
    .in("status", ["pending", "active", "declined"]);

  // Check by pm_org_id if available, otherwise by pm_user_id
  if (pmOrgId) {
    query = query.eq("pm_org_id", pmOrgId);
  } else {
    query = query.eq("pm_user_id", userId);
  }

  const { data: rels } = await query;

  const statusMap: Record<string, "none" | "pending" | "active" | "declined"> = {};

  // Priority: active > pending > declined
  for (const rel of rels ?? []) {
    const current = statusMap[rel.vendor_org_id];
    const newStatus = rel.status as "pending" | "active" | "declined";

    if (!current) {
      statusMap[rel.vendor_org_id] = newStatus;
    } else if (newStatus === "active") {
      statusMap[rel.vendor_org_id] = "active";
    } else if (newStatus === "pending" && current !== "active") {
      statusMap[rel.vendor_org_id] = "pending";
    }
  }

  return statusMap;
}

// ============================================
// Request Vendor Connection (PM only)
// ============================================

const MAX_REQUESTS_PER_DAY = 10;
const DECLINE_COOLDOWN_DAYS = 30;

export async function requestVendorConnection(
  vendorOrgId: string,
  message?: string
): Promise<{ success: boolean; error?: string; errorCode?: string }> {
  const pmAuth = await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated", errorCode: "not_authenticated" };

  // Sanitize message
  const cleanMessage = message?.trim().slice(0, 500) || null;
  if (message && !cleanMessage) {
    return { success: false, error: "Message cannot be empty whitespace", errorCode: "invalid_message" };
  }

  // Rate limit check — max 10 requests per 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await supabase
    .from("vendor_pm_relationships")
    .select("id", { count: "exact", head: true })
    .eq("requested_by", user.id)
    .gte("requested_at", oneDayAgo);

  if ((recentCount ?? 0) >= MAX_REQUESTS_PER_DAY) {
    return { success: false, error: "rate_limit", errorCode: "rate_limit" };
  }

  // Check for existing active/pending relationship (org-to-org)
  const { data: existingActive } = await supabase
    .from("vendor_pm_relationships")
    .select("id, status")
    .eq("vendor_org_id", vendorOrgId)
    .eq("pm_user_id", user.id)
    .in("status", ["pending", "active"])
    .maybeSingle();

  if (existingActive) {
    if (existingActive.status === "active") {
      return { success: false, error: "already_connected", errorCode: "already_connected" };
    }
    return { success: false, error: "already_pending", errorCode: "already_pending" };
  }

  // Check for also by pm_org_id if available
  if (pmAuth.org_id) {
    const { data: orgActive } = await supabase
      .from("vendor_pm_relationships")
      .select("id, status")
      .eq("vendor_org_id", vendorOrgId)
      .eq("pm_org_id", pmAuth.org_id)
      .in("status", ["pending", "active"])
      .maybeSingle();

    if (orgActive) {
      if (orgActive.status === "active") {
        return { success: false, error: "already_connected", errorCode: "already_connected" };
      }
      return { success: false, error: "already_pending", errorCode: "already_pending" };
    }
  }

  // Check cooldown after decline
  const { data: lastDecline } = await supabase
    .from("vendor_pm_relationships")
    .select("responded_at")
    .eq("vendor_org_id", vendorOrgId)
    .eq("pm_user_id", user.id)
    .eq("status", "declined")
    .order("responded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastDecline?.responded_at) {
    const cooldownEnd = new Date(lastDecline.responded_at);
    cooldownEnd.setDate(cooldownEnd.getDate() + DECLINE_COOLDOWN_DAYS);
    if (new Date() < cooldownEnd) {
      return { success: false, error: "cooldown", errorCode: "cooldown" };
    }
  }

  // Create the connection request
  const { error: insertError } = await supabase
    .from("vendor_pm_relationships")
    .insert({
      vendor_org_id: vendorOrgId,
      pm_user_id: user.id,
      pm_org_id: pmAuth.org_id,
      status: "pending",
      invited_by: "pm",
      requested_by: user.id,
      request_message: cleanMessage,
      requested_at: new Date().toISOString(),
      request_origin: "directory",
    });

  if (insertError) {
    // Handle unique constraint violation
    if (insertError.code === "23505") {
      return { success: false, error: "already_pending", errorCode: "already_pending" };
    }
    console.error("Connection request failed:", insertError);
    return { success: false, error: insertError.message, errorCode: "db_error" };
  }

  // Log activity
  await logActivity({
    entityType: "relationship",
    entityId: vendorOrgId,
    action: "connection_requested",
    actorRole: "pm",
    metadata: {
      vendor_org_id: vendorOrgId,
      pm_org_id: pmAuth.org_id,
      has_message: !!cleanMessage,
    },
  });

  // Create notification for vendor (in-app)
  const { data: vendorOwners } = await supabase
    .from("vendor_users")
    .select("user_id")
    .eq("vendor_org_id", vendorOrgId)
    .in("role", ["owner", "admin"])
    .eq("is_active", true);

  if (vendorOwners) {
    // Get PM profile name for notification
    const { data: pmProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .single();

    const pmName = pmProfile
      ? `${pmProfile.first_name ?? ""} ${pmProfile.last_name ?? ""}`.trim() || "A property manager"
      : "A property manager";

    const notifications = vendorOwners.map((vu) => ({
      user_id: vu.user_id,
      type: "connection_request",
      title: "New Connection Request",
      body: `${pmName} wants to connect with your business.`,
      reference_type: "vendor_pm_relationship",
      reference_id: vendorOrgId,
    }));

    if (notifications.length > 0) {
      await supabase.from("vendor_notifications").insert(notifications);
    }
  }

  return { success: true };
}

// ============================================
// Get Available Trades (for filter)
// ============================================

export async function getAvailableTrades(): Promise<string[]> {
  await requirePmRole();
  const supabase = await createClient();

  const { data } = await supabase
    .from("vendor_organizations")
    .select("trades")
    .eq("status", "active" as VendorOrgStatus);

  if (!data) return [];

  // Flatten and deduplicate all trades
  const allTrades = data.flatMap((v) => v.trades ?? []);
  return [...new Set(allTrades)].sort();
}

// ============================================
// Get Available Cities (for filter)
// ============================================

export async function getAvailableCities(): Promise<string[]> {
  await requirePmRole();
  const supabase = await createClient();

  const { data } = await supabase
    .from("vendor_organizations")
    .select("city")
    .eq("status", "active" as VendorOrgStatus)
    .not("city", "is", null);

  if (!data) return [];

  const cities = data.map((v) => v.city as string).filter(Boolean);
  return [...new Set(cities)].sort();
}
