import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isQboConfigured } from "@/lib/integrations/qbo-client";
import { fullSync } from "@/lib/integrations/qbo-sync";
import type { VendorIntegration } from "@/lib/integrations/qbo-types";

/**
 * Cron job: Nightly full sync for all active QBO integrations.
 * Schedule: 0 3 * * * (daily at 3 AM)
 * Auth: CRON_SECRET header
 */
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isQboConfigured()) {
    return NextResponse.json({ message: "QBO not configured, skipping" });
  }

  const supabase = createServiceClient();

  // Fetch all active QBO integrations
  const { data: integrations, error } = await supabase
    .from("vendor_integrations")
    .select("*")
    .eq("provider", "quickbooks")
    .eq("is_active", true);

  if (error) {
    console.error("[Cron] Failed to fetch QBO integrations:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let totalInvoices = 0;
  let totalExpenses = 0;
  let totalErrors = 0;

  for (const integration of (integrations ?? []) as VendorIntegration[]) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await fullSync(supabase as any, integration);
      totalInvoices += result.invoices;
      totalExpenses += result.expenses;
      totalErrors += result.errors;
    } catch (err) {
      console.error(`[Cron] QBO sync error for org ${integration.vendor_org_id}:`, err);
      totalErrors++;

      // Record error on integration
      await supabase
        .from("vendor_integrations")
        .update({
          sync_error: err instanceof Error ? err.message : "Unknown sync error",
          updated_at: new Date().toISOString(),
        })
        .eq("id", integration.id);
    }
  }

  console.log(
    `[Cron] QBO nightly sync: ${integrations?.length ?? 0} integrations, ${totalInvoices} invoices, ${totalExpenses} expenses, ${totalErrors} errors`
  );

  return NextResponse.json({
    integrations: integrations?.length ?? 0,
    invoices: totalInvoices,
    expenses: totalExpenses,
    errors: totalErrors,
  });
}
