// ============================================
// Vendor Directory — SSR Read Helpers
// Plain async functions (NOT Server Actions).
// Single qualification filter used everywhere.
// ============================================

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export interface DirectoryVendor {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  phone: string | null;
  trades: string[];
  city: string;
  state: string;
  avg_rating: number;
  total_ratings: number;
  response_time_label: string | null;
  emergency_available: boolean;
  service_radius_miles: number;
  booking_enabled: boolean;
  booking_headline: string | null;
  updated_at: string;
}

export interface VendorReview {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
}

const DIRECTORY_SELECT =
  "id, name, slug, logo_url, description, phone, trades, city, state, avg_rating, total_ratings, response_time_label, emergency_available, service_radius_miles, booking_enabled, booking_headline, updated_at";

function getSupabase() {
  return createClient(supabaseUrl, serviceRoleKey);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyQualificationFilters(query: any) {
  return query
    .eq("status", "active")
    .eq("booking_enabled", true)
    .not("slug", "is", null)
    .not("city", "is", null)
    .not("state", "is", null)
    .not("name", "is", null);
}

/** Get all qualified vendors for directory listing. */
export async function getDirectoryVendors(): Promise<DirectoryVendor[]> {
  if (!serviceRoleKey) return [];
  const supabase = getSupabase();

  const baseQuery = supabase
    .from("vendor_organizations")
    .select(DIRECTORY_SELECT);

  const { data } = await applyQualificationFilters(baseQuery)
    .order("avg_rating", { ascending: false });

  // Filter out vendors with empty trades array in JS (Supabase doesn't support array_length in filters)
  return (data ?? []).filter((v: DirectoryVendor) => v.trades && v.trades.length > 0) as DirectoryVendor[];
}

/** Get a single qualified vendor by slug. */
export async function getVendorBySlug(slug: string): Promise<DirectoryVendor | null> {
  if (!serviceRoleKey) return null;
  const supabase = getSupabase();

  const { data } = await supabase
    .from("vendor_organizations")
    .select(DIRECTORY_SELECT)
    .eq("slug", slug)
    .eq("status", "active")
    .not("city", "is", null)
    .not("state", "is", null)
    .not("name", "is", null)
    .single();

  if (!data || !data.trades?.length) return null;
  return data as DirectoryVendor;
}

/** Get reviews for a vendor (anonymized — no reviewer info). */
export async function getVendorReviews(vendorOrgId: string, limit = 20): Promise<VendorReview[]> {
  if (!serviceRoleKey) return [];
  const supabase = getSupabase();

  const { data } = await supabase
    .from("vendor_ratings")
    .select("id, rating, review, created_at")
    .eq("vendor_org_id", vendorOrgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as VendorReview[];
}

/** Get qualified vendors matching a specific trade + city/state. */
export async function getVendorsByTradeAndCity(
  trade: string,
  city: string,
  state: string
): Promise<DirectoryVendor[]> {
  if (!serviceRoleKey) return [];
  const supabase = getSupabase();

  const baseQuery = supabase
    .from("vendor_organizations")
    .select(DIRECTORY_SELECT);

  const { data } = await applyQualificationFilters(baseQuery)
    .ilike("city", city)
    .ilike("state", state)
    .contains("trades", [trade])
    .order("avg_rating", { ascending: false });

  return (data ?? []).filter((v: DirectoryVendor) => v.trades && v.trades.length > 0) as DirectoryVendor[];
}

/** Get distinct city+trade combos with vendor counts (for sitemap + landing pages). */
export async function getCityTradeCombos(minVendors = 3): Promise<
  { trade: string; city: string; state: string; count: number }[]
> {
  if (!serviceRoleKey) return [];

  const vendors = await getDirectoryVendors();

  // Build combo map
  const comboMap = new Map<string, { trade: string; city: string; state: string; count: number }>();

  for (const v of vendors) {
    for (const trade of v.trades) {
      const key = `${trade}::${v.city.toLowerCase()}::${v.state.toLowerCase()}`;
      const existing = comboMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        comboMap.set(key, { trade, city: v.city, state: v.state, count: 1 });
      }
    }
  }

  return Array.from(comboMap.values()).filter((c) => c.count >= minVendors);
}
