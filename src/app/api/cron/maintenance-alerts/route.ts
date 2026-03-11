import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

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

  const supabase = createServiceClient();
  let alertsCreated = 0;
  let propertiesScanned = 0;

  try {
    // Fetch all properties with system age data
    const { data: properties, error: propErr } = await supabase
      .from("homeowner_properties")
      .select("id, hvac_age, water_heater_age, roof_age")
      .not("id", "is", null);

    if (propErr || !properties) {
      return NextResponse.json(
        { error: propErr?.message ?? "Failed to fetch properties" },
        { status: 500 }
      );
    }

    propertiesScanned = properties.length;

    for (const prop of properties) {
      for (const threshold of SYSTEM_THRESHOLDS) {
        const age = (prop as Record<string, unknown>)[threshold.ageColumn] as number | null;
        if (!age || age <= 0) continue;

        const thresholdAge = Math.round(threshold.minLifespan * (threshold.thresholdPercent / 100));
        if (age < thresholdAge) continue;

        // System is at or past threshold — create/upsert alert
        const alertKey = `${prop.id}:${threshold.systemType}`;

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
          await supabase
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

        if (!insertErr) {
          alertsCreated++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      propertiesScanned,
      alertsCreated,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cron failed" },
      { status: 500 }
    );
  }
}
