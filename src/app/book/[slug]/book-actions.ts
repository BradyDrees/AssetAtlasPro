"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

// ============================================
// Public Booking Page Data
// ============================================

export interface BookingPageData {
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
}

export async function getBookingPageData(
  slug: string
): Promise<{ data: BookingPageData | null; error?: string }> {
  try {
    const supabase = createServiceClient();

    const { data: org, error } = await supabase
      .from("vendor_organizations")
      .select(
        "id, name, logo_url, description, phone, booking_enabled, booking_headline, booking_description, booking_trades, trades, city, state"
      )
      .eq("slug", slug)
      .eq("status", "active")
      .single();

    if (error || !org) return { data: null };
    if (!org.booking_enabled) return { data: null };

    return {
      data: {
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
      },
    };
  } catch (err) {
    console.error("[getBookingPageData] Error:", err);
    return { data: null, error: "Failed to load booking page" };
  }
}

// ============================================
// Submit Booking Request
// ============================================

export interface BookingInput {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  trade?: string;
  description: string;
  preferred_date?: string;
}

export async function submitBookingRequest(
  slug: string,
  input: BookingInput
): Promise<{ success: boolean; tracking_url?: string; error?: string }> {
  try {
    // Validate required fields
    if (!input.name?.trim()) return { success: false, error: "Name is required" };
    if (!input.phone?.trim()) return { success: false, error: "Phone is required" };
    if (!input.description?.trim()) return { success: false, error: "Description is required" };

    const supabase = createServiceClient();

    // Look up vendor org
    const { data: org } = await supabase
      .from("vendor_organizations")
      .select("id, booking_enabled")
      .eq("slug", slug)
      .eq("status", "active")
      .single();

    if (!org?.booking_enabled) return { success: false, error: "Booking not available" };

    // Rate limit: max 5 WOs from same phone in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("vendor_work_orders")
      .select("id", { count: "exact", head: true })
      .eq("vendor_org_id", org.id)
      .eq("source_type", "website_lead")
      .eq("tenant_phone", input.phone.trim())
      .gte("created_at", oneHourAgo);

    if ((count ?? 0) >= 5) {
      return { success: false, error: "Too many requests. Please try again later." };
    }

    // Create work order
    const { data: wo, error: woError } = await supabase
      .from("vendor_work_orders")
      .insert({
        vendor_org_id: org.id,
        status: "assigned",
        source_type: "website_lead",
        tenant_name: input.name.trim(),
        tenant_phone: input.phone.trim(),
        property_address: input.address?.trim() || null,
        trade: input.trade || null,
        description: input.description.trim(),
        scheduled_date: input.preferred_date || null,
        updated_by: null,
      })
      .select("id, tracking_token")
      .single();

    if (woError || !wo) {
      console.error("[submitBookingRequest] Insert error:", woError);
      return { success: false, error: "Failed to submit request" };
    }

    // Notify vendor org owners
    const { data: owners } = await supabase
      .from("vendor_users")
      .select("user_id")
      .eq("vendor_org_id", org.id)
      .in("role", ["owner", "admin"])
      .eq("is_active", true);

    if (owners?.length) {
      await supabase.from("vendor_notifications").insert(
        owners.map((o) => ({
          user_id: o.user_id,
          type: "new_work_order",
          title: "New online booking request",
          body: `${input.name} — ${input.trade || "General"}: ${input.description.substring(0, 80)}`,
          reference_type: "work_order",
          reference_id: wo.id,
        }))
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.assetatlaspro.com";
    const trackingUrl = wo.tracking_token
      ? `${baseUrl}/track/${wo.tracking_token}`
      : undefined;

    return { success: true, tracking_url: trackingUrl };
  } catch (err) {
    console.error("[submitBookingRequest] Error:", err);
    return { success: false, error: "Failed to submit request" };
  }
}

// ============================================
// API Key-based booking (for external forms)
// ============================================

export async function submitBookingViaApiKey(
  apiKey: string,
  input: BookingInput
): Promise<{ success: boolean; work_order_id?: string; tracking_url?: string; error?: string }> {
  try {
    if (!input.name?.trim()) return { success: false, error: "Name is required" };
    if (!input.phone?.trim()) return { success: false, error: "Phone is required" };
    if (!input.description?.trim()) return { success: false, error: "Description is required" };

    const supabase = createServiceClient();

    // Look up vendor org by API key
    const { data: org } = await supabase
      .from("vendor_organizations")
      .select("id, booking_enabled")
      .eq("api_key", apiKey)
      .eq("status", "active")
      .single();

    if (!org) return { success: false, error: "Invalid API key" };
    if (!org.booking_enabled) return { success: false, error: "Booking not enabled" };

    // Rate limit: 100 WOs per hour per org via API
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("vendor_work_orders")
      .select("id", { count: "exact", head: true })
      .eq("vendor_org_id", org.id)
      .eq("source_type", "website_lead")
      .gte("created_at", oneHourAgo);

    if ((count ?? 0) >= 100) {
      return { success: false, error: "Rate limit exceeded" };
    }

    const { data: wo, error: woError } = await supabase
      .from("vendor_work_orders")
      .insert({
        vendor_org_id: org.id,
        status: "assigned",
        source_type: "website_lead",
        tenant_name: input.name.trim(),
        tenant_phone: input.phone.trim(),
        property_address: input.address?.trim() || null,
        trade: input.trade || null,
        description: input.description.trim(),
        scheduled_date: input.preferred_date || null,
        updated_by: null,
      })
      .select("id, tracking_token")
      .single();

    if (woError || !wo) {
      console.error("[submitBookingViaApiKey] Insert error:", woError);
      return { success: false, error: "Failed to create work order" };
    }

    // Notify owners
    const { data: owners } = await supabase
      .from("vendor_users")
      .select("user_id")
      .eq("vendor_org_id", org.id)
      .in("role", ["owner", "admin"])
      .eq("is_active", true);

    if (owners?.length) {
      await supabase.from("vendor_notifications").insert(
        owners.map((o) => ({
          user_id: o.user_id,
          type: "new_work_order",
          title: "New online booking request",
          body: `${input.name} — ${input.trade || "General"}: ${input.description.substring(0, 80)}`,
          reference_type: "work_order",
          reference_id: wo.id,
        }))
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.assetatlaspro.com";

    return {
      success: true,
      work_order_id: wo.id,
      tracking_url: wo.tracking_token
        ? `${baseUrl}/track/${wo.tracking_token}`
        : undefined,
    };
  } catch (err) {
    console.error("[submitBookingViaApiKey] Error:", err);
    return { success: false, error: "Failed to create work order" };
  }
}
