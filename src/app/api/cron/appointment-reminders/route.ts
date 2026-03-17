import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendNotification } from "@/lib/platform/notification-service";
import { getSmsTemplate } from "@/lib/vendor/sms-templates";

/**
 * Appointment Reminder Cron — runs daily at 6 PM
 *
 * Finds work orders scheduled for tomorrow and sends SMS reminders
 * to tenants with phone numbers. Idempotent via notification_delivery_log.
 *
 * Skips: cancelled/completed WOs, WOs without tenant_phone, already-reminded.
 */
export async function GET(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const results = { sent: 0, skipped: 0, errors: 0 };

  try {
    // Calculate tomorrow's date range
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    // Find WOs scheduled for tomorrow with tenant phone numbers
    // Exclude terminal statuses
    const terminalStatuses = [
      "completed",
      "cancelled",
      "paid",
      "declined",
      "draft",
      "done_pending_approval",
    ];

    const { data: scheduledWos, error } = await supabase
      .from("vendor_work_orders")
      .select(
        `id, tenant_phone, tenant_name, property_name,
         scheduled_date, scheduled_start, scheduled_end,
         vendor_org_id, status`
      )
      .is("archived_at", null)
      .gte("scheduled_date", `${tomorrowStr}T00:00:00`)
      .lt("scheduled_date", `${tomorrowStr}T23:59:59`)
      .not("tenant_phone", "is", null);

    if (error) {
      console.error("[appointment-reminders] Query error:", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Filter out terminal statuses in JS (simpler than chaining .not().not())
    const activeWos = (scheduledWos ?? []).filter(
      (wo) => !terminalStatuses.includes(wo.status)
    );

    // Process each WO
    for (const wo of activeWos) {
      if (!wo.tenant_phone) continue;

      try {
        // Get vendor org name for the message
        const { data: vendorOrg } = await supabase
          .from("vendor_organizations")
          .select("name")
          .eq("id", wo.vendor_org_id)
          .single();

        const vendorName = vendorOrg?.name ?? "Your service provider";

        // Format date and time for the message
        const schedDate = new Date(wo.scheduled_date);
        const dateStr = schedDate.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        });

        let timeStr = "";
        if (wo.scheduled_start) {
          // scheduled_start is like "09:00" or "09:00:00"
          const [h, m] = wo.scheduled_start.split(":");
          const hour = parseInt(h, 10);
          const ampm = hour >= 12 ? "PM" : "AM";
          const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
          timeStr = `${displayHour}:${m} ${ampm}`;
        }

        // Build SMS using template
        const message = getSmsTemplate("appointment_reminder", "en", {
          vendor_name: vendorName,
          date: dateStr,
          time: timeStr || "your scheduled time",
          property: wo.property_name || "your property",
        });

        if (!message) {
          results.skipped++;
          continue;
        }

        // Send via notification-service (handles dedup via delivery_key)
        const result = await sendNotification({
          woId: wo.id,
          recipient: wo.tenant_phone,
          channel: "sms",
          type: "appointment_reminder",
          body: message,
        });

        if (result.sent) {
          results.sent++;
        } else if (result.skipped) {
          results.skipped++;
        } else {
          results.errors++;
        }
      } catch (err) {
        console.error(
          `[appointment-reminders] Failed for WO ${wo.id}:`,
          err instanceof Error ? err.message : err
        );
        results.errors++;
      }
    }
  } catch (err) {
    console.error("[appointment-reminders] Fatal error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }

  console.log("[appointment-reminders]", results);
  return NextResponse.json({ ok: true, ...results });
}
