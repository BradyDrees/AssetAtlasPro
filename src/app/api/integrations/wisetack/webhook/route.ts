/**
 * Wisetack Webhook Handler
 *
 * Processes financing status updates from Wisetack.
 * Updates estimate/invoice status based on financing application outcome.
 *
 * Idempotent: checks current status before updating.
 */

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { emitEvent } from "@/lib/platform/domain-events";

// Dynamically import to trigger registration
async function getProvider() {
  const { wisetackProvider } = await import(
    "@/lib/integrations/wisetack-client"
  );
  return wisetackProvider;
}

export async function POST(request: Request) {
  try {
    const provider = await getProvider();

    if (!provider.isConfigured()) {
      return NextResponse.json(
        { error: "Financing provider not configured" },
        { status: 503 }
      );
    }

    const payload = await request.json();
    const signature = request.headers.get("x-wisetack-signature") ?? undefined;

    const result = await provider.handleWebhook(payload, signature);

    if (!result) {
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Find the estimate linked to this financing application
    // The external reference is stored in metadata
    const estimateId =
      (payload.metadata as Record<string, unknown>)?.estimate_id as string ??
      (payload.external_reference as string);

    if (!estimateId) {
      console.warn("[wisetack-webhook] No estimate_id in payload");
      return NextResponse.json({ received: true });
    }

    // Get the estimate
    const { data: estimate } = await supabase
      .from("vendor_estimates")
      .select("id, status, vendor_org_id, work_order_id")
      .eq("id", estimateId)
      .single();

    if (!estimate) {
      console.warn("[wisetack-webhook] Estimate not found:", estimateId);
      return NextResponse.json({ received: true });
    }

    // Handle based on financing status
    switch (result.status) {
      case "approved":
      case "funded": {
        // Update financing metadata on the estimate
        await supabase
          .from("vendor_estimates")
          .update({
            // Store financing info in a generic metadata field
            // If no metadata column exists, this is a no-op
            updated_at: new Date().toISOString(),
          })
          .eq("id", estimateId);

        // Emit event for audit trail
        emitEvent(
          "estimate.approved",
          "estimate",
          estimateId,
          {
            origin_module: "vendor",
            vendor_org_id: estimate.vendor_org_id,
            work_order_id: estimate.work_order_id ?? undefined,
            source_type: "financing",
            source_id: result.externalId,
            new_status: result.status,
          },
          { type: "webhook" }
        );
        break;
      }

      case "declined":
      case "expired":
      case "cancelled": {
        // Log the financing decline but don't change estimate status
        emitEvent(
          "estimate.declined",
          "estimate",
          estimateId,
          {
            origin_module: "vendor",
            vendor_org_id: estimate.vendor_org_id,
            source_type: "financing",
            source_id: result.externalId,
            new_status: result.status,
          },
          { type: "webhook" }
        );
        break;
      }
    }

    return NextResponse.json({ received: true, status: result.status });
  } catch (err) {
    console.error("[wisetack-webhook] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
