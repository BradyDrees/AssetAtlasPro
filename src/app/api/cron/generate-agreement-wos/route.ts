import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { advanceDate } from "@/lib/vendor/agreement-types";
import type { AgreementFrequency } from "@/lib/vendor/agreement-types";

/**
 * Cron job: Auto-generate work orders from active service agreements
 * where next_due <= today.
 *
 * Schedule: 0 7 * * * (daily at 7 AM)
 * Auth: CRON_SECRET header
 */
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const today = new Date().toISOString().split("T")[0];

  // Fetch active agreements where next_due <= today
  const { data: agreements, error } = await supabase
    .from("service_agreements")
    .select("*")
    .eq("status", "active")
    .lte("next_due", today);

  if (error) {
    console.error("[Cron] Failed to fetch agreements:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let generated = 0;
  let expired = 0;
  let errors = 0;

  for (const agreement of agreements ?? []) {
    try {
      // Check if past end_date — auto-expire
      if (agreement.end_date) {
        const endDate = new Date(agreement.end_date + "T23:59:59");
        if (endDate < new Date()) {
          await supabase
            .from("service_agreements")
            .update({ status: "expired", updated_at: new Date().toISOString() })
            .eq("id", agreement.id);
          expired++;
          continue;
        }
      }

      // Create work order
      const { error: woErr } = await supabase
        .from("vendor_work_orders")
        .insert({
          vendor_org_id: agreement.vendor_org_id,
          pm_user_id: agreement.pm_user_id,
          homeowner_id: agreement.homeowner_id,
          homeowner_property_id: agreement.homeowner_property_id,
          property_name: agreement.property_name ?? "Service Agreement",
          description: `[Auto] ${agreement.service_type}: ${agreement.description ?? agreement.trade}`,
          trade: agreement.trade,
          priority: "normal",
          status: "assigned",
          budget_type: "nte",
          budget_amount: agreement.price,
          scheduled_date: agreement.next_due,
          source: "agreement",
        });

      if (woErr) {
        console.error(`[Cron] Failed to create WO for agreement ${agreement.id}:`, woErr);
        errors++;
        continue;
      }

      // Advance next_due
      const currentDue = agreement.next_due
        ? new Date(agreement.next_due + "T00:00:00")
        : new Date();
      const nextDue = advanceDate(currentDue, agreement.frequency as AgreementFrequency);

      await supabase
        .from("service_agreements")
        .update({
          next_due: nextDue.toISOString().split("T")[0],
          last_generated: today,
          updated_at: new Date().toISOString(),
        })
        .eq("id", agreement.id);

      generated++;
    } catch (err) {
      console.error(`[Cron] Error processing agreement ${agreement.id}:`, err);
      errors++;
    }
  }

  console.log(`[Cron] Agreements: ${generated} WOs generated, ${expired} expired, ${errors} errors`);

  return NextResponse.json({
    processed: (agreements ?? []).length,
    generated,
    expired,
    errors,
  });
}
