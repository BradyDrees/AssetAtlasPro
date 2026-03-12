import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withTimeout, CRON_TIMEOUT_MS } from "@/lib/server-utils";

/**
 * Weekly cron: scan homeowner properties for aging systems
 * and upsert maintenance alerts.
 *
 * Lifespan thresholds (alert at 80% of minimum):
 *   HVAC:         15–20yr → alert at 12yr
 *   Water Heater:  8–12yr → alert at 6yr
 *   Roof:         20–30yr → alert at 16yr
 *   Electrical:   25–40yr → alert at 20yr
 *
 * Schedule: Weekly Monday 10 AM (0 10 * * 1)
 * Idempotent via alert_key UNIQUE constraint.
 */

interface SystemThreshold {
  systemType: string;
  ageColumn: string;
  minLifespan: number;
  thresholdPercent: number;
}

const SYSTEM_THRESHOLDS: SystemThreshold[] = [
  { systemType: "hvac", ageColumn: "hvac_age", minLifespan: 15, thresholdPercent: 80 },
  { systemType: "water_heater", ageColumn: "water_heater_age", minLifespan: 8, thresholdPercent: 75 },
  { systemType: "roof", ageColumn: "roof_age", minLifespan: 20, thresholdPercent: 80 },
];

export async function GET(req: NextRequest) {
  // Auth check
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return await withTimeout(() => handleMaintenanceAlerts(), CRON_TIMEOUT_MS);
  } catch (err) {
    console.error("[maintenance-alerts] Timeout or fatal error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

async function handleMaintenanceAlerts() {
  const supabase = createServiceClient();
  let alertsCreated = 0;
  let processed = 0;
  let errors = 0;

  try {
    // Cursor-based pagination: oldest-checked (or never-checked) first, 500 per run
    const { data: properties, error: propErr } = await supabase
      .from("homeowner_properties")
      .select("id, hvac_age, water_heater_age, roof_age")
      .order("last_alert_checked_at", { ascending: true, nullsFirst: true })
      .limit(500);

    if (propErr || !properties) {
      return NextResponse.json(
        { error: propErr?.message ?? "Failed to fetch properties" },
        { status: 500 }
      );
    }

    for (const prop of properties) {
      let propHadError = false;

      for (const threshold of SYSTEM_THRESHOLDS) {
        const age = (prop as Record<string, unknown>)[threshold.ageColumn] as number | null;
        if (!age || age <= 0) continue;

        const thresholdAge = Math.round(threshold.minLifespan * (threshold.thresholdPercent / 100));
        if (age < thresholdAge) continue;

        // System is at or past threshold — create/upsert alert
        const alertKey = `${prop.id}:${threshold.systemType}`;

        try {
          // Check if active alert already exists (skip if already active)
          const { data: existing } = await supabase
            .from("property_maintenance_alerts")
            .select("id, status")
            .eq("alert_key", alertKey)
            .maybeSingle();

          if (existing?.status === "active") {
            // Already active — skip
            continue;
          }

          if (existing?.status === "dismissed") {
            // Check if dismissed within 90 days
            const { data: dismissedAlert } = await supabase
              .from("property_maintenance_alerts")
              .select("dismissed_at")
              .eq("id", existing.id)
              .single();

            if (dismissedAlert?.dismissed_at) {
              const dismissedDate = new Date(dismissedAlert.dismissed_at);
              const daysSinceDismiss = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
              if (daysSinceDismiss < 90) continue; // Still within cooldown
            }

            // Re-activate the alert
            const { error: updateErr } = await supabase
              .from("property_maintenance_alerts")
              .update({
                status: "active",
                threshold_percent: Math.round((age / threshold.minLifespan) * 100),
                source_snapshot: {
                  age,
                  minLifespan: threshold.minLifespan,
                  thresholdAge,
                  scannedAt: new Date().toISOString(),
                },
                dismissed_at: null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existing.id);

            if (updateErr) {
              propHadError = true;
              continue;
            }

            alertsCreated++;
            continue;
          }

          // Insert new alert
          const { error: insertErr } = await supabase
            .from("property_maintenance_alerts")
            .upsert(
              {
                property_id: prop.id,
                system_type: threshold.systemType,
                alert_key: alertKey,
                threshold_percent: Math.round((age / threshold.minLifespan) * 100),
                status: "active",
                source_snapshot: {
                  age,
                  minLifespan: threshold.minLifespan,
                  thresholdAge,
                  scannedAt: new Date().toISOString(),
                },
              },
              { onConflict: "alert_key" }
            );

          if (insertErr) {
            propHadError = true;
          } else {
            alertsCreated++;
          }
        } catch {
          propHadError = true;
        }
      }

      if (propHadError) {
        // Don't update cursor — property will be retried next run
        errors++;
      } else {
        // Mark property as successfully checked so it moves to the back of the queue
        await supabase
          .from("homeowner_properties")
          .update({ last_alert_checked_at: new Date().toISOString() })
          .eq("id", prop.id);

        processed++;
      }
    }

    console.log("[maintenance-alerts]", { processed, alerts_created: alertsCreated, errors });

    return NextResponse.json({
      success: true,
      processed,
      alerts_created: alertsCreated,
      errors,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cron failed" },
      { status: 500 }
    );
  }
}
