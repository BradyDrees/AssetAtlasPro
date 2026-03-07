"use server";

import { createClient } from "@/lib/supabase/server";
import { sendSMS, isTwilioConfigured } from "@/lib/vendor/twilio-client";
import { getSmsTemplate, SMS_CAPABLE_STATUSES } from "@/lib/vendor/sms-templates";

/**
 * Fire-and-forget SMS notification to tenant on WO status change.
 * Non-blocking — never throws, logs errors internally.
 */
export async function sendWoStatusSms(
  woId: string,
  newStatus: string
): Promise<void> {
  try {
    // Quick guard: only send for supported statuses
    if (!SMS_CAPABLE_STATUSES.includes(newStatus)) return;
    if (!isTwilioConfigured()) return;

    const supabase = await createClient();

    // Fetch WO with tenant info + org settings
    const { data: wo } = await supabase
      .from("vendor_work_orders")
      .select(
        "tenant_phone, tenant_name, tenant_language, property_name, vendor_org_id, scheduled_date, scheduled_time_start"
      )
      .eq("id", woId)
      .single();

    if (!wo?.tenant_phone) return;

    // Fetch org to check SMS settings + get from number
    const { data: org } = await supabase
      .from("vendor_organizations")
      .select("name, twilio_phone_number, settings")
      .eq("id", wo.vendor_org_id)
      .single();

    if (!org?.twilio_phone_number) return;

    // Check if this status is enabled in org settings
    const settings = (org.settings ?? {}) as Record<string, unknown>;
    const enabledStatuses = (settings.sms_notification_statuses as string[]) ?? SMS_CAPABLE_STATUSES;
    if (!enabledStatuses.includes(newStatus)) return;

    // Build SMS body
    const locale = (wo.tenant_language === "es" ? "es" : "en") as "en" | "es";
    const body = getSmsTemplate(newStatus, locale, {
      vendor_name: org.name ?? "Your vendor",
      date: wo.scheduled_date
        ? new Date(wo.scheduled_date + "T00:00:00").toLocaleDateString(
            locale === "es" ? "es-US" : "en-US",
            { weekday: "short", month: "short", day: "numeric" }
          )
        : "",
      time: wo.scheduled_time_start ?? "",
      property: wo.property_name ?? "",
    });

    if (!body) return;

    // Send SMS (non-blocking — log result but never throw)
    const result = await sendSMS(org.twilio_phone_number, wo.tenant_phone, body);

    if (result.error) {
      console.error(`[SMS] Failed to send to ${wo.tenant_phone} for WO ${woId}: ${result.error}`);
    }

    // Log the SMS in activity log
    await supabase.from("vendor_activity_log").insert({
      vendor_org_id: wo.vendor_org_id,
      entity_type: "work_order",
      entity_id: woId,
      action: "sms_sent",
      new_value: newStatus,
      metadata: {
        to: wo.tenant_phone,
        status: result.error ? "failed" : "sent",
        sid: result.sid || null,
      },
    });  // fire-and-forget — ignore result
  } catch (err) {
    // Never throw — this is fire-and-forget
    console.error(`[SMS] Unexpected error for WO ${woId}:`, err);
  }
}
