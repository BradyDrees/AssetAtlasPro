"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export interface TrackingData {
  id: string;
  status: string;
  property_name: string | null;
  unit_number: string | null;
  description: string | null;
  trade: string | null;
  scheduled_date: string | null;
  scheduled_time_start: string | null;
  scheduled_time_end: string | null;
  completed_at: string | null;
  vendor_org_name: string | null;
  vendor_org_logo: string | null;
  photos: { signed_url: string; caption: string | null; photo_type: string }[];
}

/**
 * Fetch sanitized tracking data by token.
 * Uses service-role client to bypass RLS (public page, no auth).
 * Exposes ONLY safe fields — no budget, internal notes, tenant info, PM data.
 */
export async function getTrackingData(
  token: string
): Promise<{ data: TrackingData | null; error?: string }> {
  try {
    if (!serviceRoleKey) {
      return { data: null, error: "Service not configured" };
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find WO by tracking token
    const { data: wo, error: woError } = await supabase
      .from("vendor_work_orders")
      .select(
        "id, status, property_name, unit_number, description, trade, scheduled_date, scheduled_time_start, scheduled_time_end, completed_at, vendor_org_id"
      )
      .eq("tracking_token", token)
      .single();

    if (woError || !wo) {
      return { data: null };
    }

    // Fetch vendor org name + logo
    let vendorOrgName: string | null = null;
    let vendorOrgLogo: string | null = null;
    if (wo.vendor_org_id) {
      const { data: org } = await supabase
        .from("vendor_organizations")
        .select("name, logo_url")
        .eq("id", wo.vendor_org_id)
        .single();
      vendorOrgName = org?.name ?? null;
      vendorOrgLogo = org?.logo_url ?? null;
    }

    // Fetch completion photos (after + general types only for public view)
    const { data: photoRows } = await supabase
      .from("work_order_photos")
      .select("storage_path, caption, photo_type")
      .eq("work_order_id", wo.id)
      .in("photo_type", ["after", "general"])
      .order("sort_order", { ascending: true })
      .limit(12);

    // Generate signed URLs for photos
    const photos = await Promise.all(
      (photoRows ?? []).map(async (photo) => {
        const { data: signed } = await supabase.storage
          .from("dd-captures")
          .createSignedUrl(photo.storage_path, 3600);
        return {
          signed_url: signed?.signedUrl ?? "",
          caption: photo.caption,
          photo_type: photo.photo_type,
        };
      })
    );

    return {
      data: {
        id: wo.id,
        status: wo.status,
        property_name: wo.property_name,
        unit_number: wo.unit_number,
        description: wo.description,
        trade: wo.trade,
        scheduled_date: wo.scheduled_date,
        scheduled_time_start: wo.scheduled_time_start,
        scheduled_time_end: wo.scheduled_time_end,
        completed_at: wo.completed_at,
        vendor_org_name: vendorOrgName,
        vendor_org_logo: vendorOrgLogo,
        photos: photos.filter((p) => p.signed_url),
      },
    };
  } catch (err) {
    console.error("[getTrackingData] Error:", err);
    return { data: null, error: "Failed to load tracking data" };
  }
}

/**
 * Send tracking link SMS to tenant.
 * Uses service-role to fetch WO + org data, then sends via Twilio.
 */
export async function sendTrackingLinkSms(
  woId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Import dynamically to avoid bundling Twilio on client
    const { sendSMS, isTwilioConfigured } = await import(
      "@/lib/vendor/twilio-client"
    );
    const config = isTwilioConfigured();
    if (!config) return { success: false, error: "Twilio not configured" };

    if (!serviceRoleKey) {
      return { success: false, error: "Service not configured" };
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: wo } = await supabase
      .from("vendor_work_orders")
      .select(
        "tracking_token, tenant_phone, tenant_language, vendor_org_id"
      )
      .eq("id", woId)
      .single();

    if (!wo?.tenant_phone) {
      return { success: false, error: "No tenant phone" };
    }
    if (!wo.tracking_token) {
      return { success: false, error: "No tracking token" };
    }

    // Get vendor org for phone number + name
    const { data: org } = await supabase
      .from("vendor_organizations")
      .select("name, twilio_phone_number")
      .eq("id", wo.vendor_org_id)
      .single();

    if (!org?.twilio_phone_number) {
      return { success: false, error: "No Twilio number configured" };
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "https://www.assetatlaspro.com";
    const trackingUrl = `${baseUrl}/track/${wo.tracking_token}`;
    const locale = wo.tenant_language === "es" ? "es" : "en";

    const body =
      locale === "es"
        ? `Sigue tu servicio en tiempo real: ${trackingUrl} — ${org.name}`
        : `Track your service in real-time: ${trackingUrl} — ${org.name}`;

    const result = await sendSMS(
      org.twilio_phone_number,
      wo.tenant_phone,
      body
    );

    if (result.error) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "SMS failed";
    console.error("[sendTrackingLinkSms] Error:", message);
    return { success: false, error: message };
  }
}
