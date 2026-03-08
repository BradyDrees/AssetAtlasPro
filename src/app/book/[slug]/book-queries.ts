// ============================================
// SSR Read Helpers for Public Booking Pages
// Plain async functions — NOT Server Actions.
// Used by server components for data fetching.
// ============================================

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export interface BookingPageDataSSR {
  org_id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  phone: string | null;
  booking_headline: string | null;
  booking_description: string | null;
  trades: string[];
  city: string | null;
  state: string | null;
  avg_rating: number;
  total_ratings: number;
}

/** Fetch vendor booking page data for SSR (not a Server Action). */
export async function getBookingPageDataSSR(
  slug: string
): Promise<BookingPageDataSSR | null> {
  if (!serviceRoleKey) return null;

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: org, error } = await supabase
    .from("vendor_organizations")
    .select(
      "id, name, logo_url, description, phone, booking_enabled, booking_headline, booking_description, booking_trades, trades, city, state, avg_rating, total_ratings"
    )
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (error || !org || !org.booking_enabled) return null;

  return {
    org_id: org.id,
    name: org.name,
    logo_url: org.logo_url,
    description: org.description,
    phone: org.phone,
    booking_headline: org.booking_headline,
    booking_description: org.booking_description,
    trades: org.booking_trades?.length ? org.booking_trades : org.trades ?? [],
    city: org.city,
    state: org.state,
    avg_rating: org.avg_rating ?? 0,
    total_ratings: org.total_ratings ?? 0,
  };
}
