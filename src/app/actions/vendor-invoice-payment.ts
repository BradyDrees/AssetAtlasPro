"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireVendorRole } from "@/lib/vendor/role-helpers";
import { isStripeConfigured, getStripe } from "@/lib/stripe/stripe-client";

/**
 * Create a Stripe Checkout Session for a vendor invoice.
 * Returns the checkout URL the PM can visit to pay.
 */
export async function createInvoicePaymentSession(
  invoiceId: string
): Promise<{ url?: string; error?: string }> {
  if (!isStripeConfigured()) {
    return { error: "Online payments are not configured yet." };
  }

  const auth = await requireVendorRole();
  const supabase = await createClient();

  // Fetch invoice — must belong to caller's org
  const { data: invoice, error: invErr } = await supabase
    .from("vendor_invoices")
    .select("id, vendor_org_id, invoice_number, total, status, balance_due, amount_paid, pm_user_id, property_name, stripe_payment_intent_id")
    .eq("id", invoiceId)
    .eq("vendor_org_id", auth.vendor_org_id)
    .single();

  if (invErr || !invoice) {
    return { error: "Invoice not found" };
  }

  // Only allow payment for submitted or pm_approved invoices
  if (!["submitted", "pm_approved"].includes(invoice.status)) {
    return { error: "Invoice is not in a payable status" };
  }

  // Determine amount to charge (balance_due if partial payment exists, otherwise total)
  const amountDue = Number(invoice.balance_due ?? invoice.total) || 0;
  if (amountDue <= 0) {
    return { error: "Nothing is due on this invoice" };
  }

  // Stripe amounts are in cents
  const amountCents = Math.round(amountDue * 100);

  // Fetch vendor org name for the checkout description
  const { data: org } = await supabase
    .from("vendor_organizations")
    .select("name")
    .eq("id", auth.vendor_org_id)
    .single();

  const stripe = getStripe();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://assetatlaspro.com";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Invoice ${invoice.invoice_number ?? invoiceId}`,
              description: [
                org?.name ?? "Vendor",
                invoice.property_name ? `– ${invoice.property_name}` : "",
              ]
                .filter(Boolean)
                .join(" "),
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoice_id: invoiceId,
        vendor_org_id: auth.vendor_org_id,
      },
      success_url: `${baseUrl}/vendor/invoices/${invoiceId}?payment=success`,
      cancel_url: `${baseUrl}/vendor/invoices/${invoiceId}?payment=cancelled`,
    });

    // Store payment URL on the invoice
    if (session.url) {
      await supabase
        .from("vendor_invoices")
        .update({ payment_url: session.url, updated_at: new Date().toISOString() })
        .eq("id", invoiceId);
    }

    return { url: session.url ?? undefined };
  } catch (err) {
    console.error("[Stripe] Checkout session error:", err);
    return { error: "Failed to create payment session" };
  }
}

/**
 * Called from webhook when Stripe checkout session completes.
 * Uses service-role client (no user session).
 * Per plan adjustment: verifies invoice isn't already paid before processing.
 */
export async function markInvoicePaidViaStripe(
  invoiceId: string,
  paymentIntentId: string,
  amountPaidCents: number
): Promise<void> {
  // Service-role client for webhook context (bypasses RLS)
  const supabase = createServiceClient();

  // Fetch current invoice state
  const { data: invoice } = await supabase
    .from("vendor_invoices")
    .select("id, status, total, amount_paid, vendor_org_id, pm_user_id, invoice_number")
    .eq("id", invoiceId)
    .single();

  if (!invoice) {
    console.error(`[Stripe Webhook] Invoice ${invoiceId} not found`);
    return;
  }

  // Guard: don't double-process already-paid invoices
  if (invoice.status === "paid") {
    console.warn(`[Stripe Webhook] Invoice ${invoiceId} already paid, skipping`);
    return;
  }

  const amountPaidDollars = amountPaidCents / 100;
  const newAmountPaid = (Number(invoice.amount_paid) || 0) + amountPaidDollars;
  const fullyPaid = newAmountPaid >= Number(invoice.total);

  // Update invoice with payment info
  await supabase
    .from("vendor_invoices")
    .update({
      amount_paid: newAmountPaid,
      stripe_payment_intent_id: paymentIntentId,
      status: fullyPaid ? "paid" : invoice.status,
      paid_at: fullyPaid ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);

  // Activity log
  await supabase.from("vendor_activity_log").insert({
    vendor_org_id: invoice.vendor_org_id,
    entity_type: "invoice",
    entity_id: invoiceId,
    action: "stripe_payment_received",
    new_value: fullyPaid ? "paid" : "partial_payment",
    metadata: {
      amount: amountPaidDollars,
      payment_intent_id: paymentIntentId,
      fully_paid: fullyPaid,
    },
  });

  // Notify vendor that payment was received
  if (invoice.vendor_org_id) {
    // Get all org members to notify
    const { data: members } = await supabase
      .from("vendor_users")
      .select("user_id")
      .eq("vendor_org_id", invoice.vendor_org_id)
      .eq("is_active", true);

    if (members) {
      const notifications = members.map((m: { user_id: string }) => ({
        user_id: m.user_id,
        type: "invoice_paid",
        title: `Payment received for Invoice ${invoice.invoice_number ?? ""}`,
        body: `$${amountPaidDollars.toFixed(2)} payment received via Stripe${fullyPaid ? " — Invoice fully paid" : ""}`,
        reference_type: "invoice",
        reference_id: invoiceId,
      }));

      await supabase.from("vendor_notifications").insert(notifications);
    }
  }
}
