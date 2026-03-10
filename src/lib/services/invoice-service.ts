/**
 * Invoice Service
 *
 * Payment orchestration: pool deduction, Stripe sessions, status management.
 * Atomic money flows with idempotency keys.
 */
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { emitEvent } from "@/lib/platform/domain-events";
import { generatePaymentKey } from "@/lib/platform/idempotency";
import { logActivity } from "@/lib/vendor/role-helpers";

// ============================================
// Types
// ============================================

export interface PaymentBreakdown {
  invoiceTotal: number;
  poolAvailable: number;
  poolDeduction: number;
  cardCharge: number;
  fullyPaidByPool: boolean;
}

export interface PaymentResult {
  success: boolean;
  error?: string;
  breakdown?: PaymentBreakdown;
  stripeSessionUrl?: string;
}

// ============================================
// Payment Processing
// ============================================

/**
 * Process invoice payment with pool + Stripe split.
 *
 * Flow:
 * 1. Fetch invoice + property pool balance
 * 2. Compute split (pool covers up to total, remainder to Stripe)
 * 3. Deduct pool (atomic)
 * 4. If remainder > 0: create Stripe session (with idempotency key)
 * 5. If pool covers 100%: mark paid immediately
 * 6. Emit payment events
 */
export async function processInvoicePayment(
  invoiceId: string,
  actorUserId?: string
): Promise<PaymentResult> {
  const supabase = await createClient();

  // 1. Fetch invoice
  const { data: invoice, error: fetchErr } = await supabase
    .from("vendor_invoices")
    .select("id, total, status, work_order_id, vendor_org_id, payment_token")
    .eq("id", invoiceId)
    .single();

  if (fetchErr || !invoice) {
    return { success: false, error: "Invoice not found" };
  }

  const payableStatuses = ["submitted", "pm_approved"];
  if (!payableStatuses.includes(invoice.status)) {
    return { success: false, error: `Cannot pay invoice in status "${invoice.status}"` };
  }

  const total = Number(invoice.total) || 0;

  // 2. Check pool balance (if linked to property via work order)
  let poolBalance = 0;
  let propertyId: string | null = null;

  if (invoice.work_order_id) {
    const { data: wo } = await supabase
      .from("vendor_work_orders")
      .select("homeowner_property_id")
      .eq("id", invoice.work_order_id)
      .single();

    if (wo?.homeowner_property_id) {
      propertyId = wo.homeowner_property_id;
      const { data: sub } = await supabase
        .from("homeowner_subscriptions")
        .select("maintenance_pool_balance")
        .eq("property_id", propertyId)
        .eq("status", "active")
        .single();

      poolBalance = Number(sub?.maintenance_pool_balance) || 0;
    }
  }

  // 3. Compute split
  const poolDeduction = Math.min(poolBalance, total);
  const cardCharge = total - poolDeduction;
  const fullyPaidByPool = cardCharge <= 0;

  const breakdown: PaymentBreakdown = {
    invoiceTotal: total,
    poolAvailable: poolBalance,
    poolDeduction,
    cardCharge: Math.max(0, cardCharge),
    fullyPaidByPool,
  };

  // 4. Deduct pool if applicable
  if (poolDeduction > 0 && propertyId) {
    const { deductFromPool } = await import("./maintenance-pool-service");
    const poolResult = await deductFromPool(
      propertyId,
      poolDeduction,
      invoice.work_order_id
    );
    if (!poolResult.success) {
      return { success: false, error: poolResult.error, breakdown };
    }

    // Emit pool deduction event
    await emitEvent(
      "payment.pool_deducted",
      "invoice",
      invoiceId,
      {
        vendor_org_id: invoice.vendor_org_id,
        work_order_id: invoice.work_order_id,
        origin_module: "home",
        pool_deduction: poolDeduction,
        property_id: propertyId,
      },
      { id: actorUserId, type: "user" }
    ).catch(() => {});
  }

  // 5. If fully paid by pool, mark as paid
  if (fullyPaidByPool) {
    await supabase
      .from("vendor_invoices")
      .update({
        status: "paid",
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);

    await emitEvent(
      "invoice.paid",
      "invoice",
      invoiceId,
      {
        vendor_org_id: invoice.vendor_org_id,
        work_order_id: invoice.work_order_id,
        origin_module: "home",
        payment_method: "pool",
        amount: total,
      },
      { id: actorUserId, type: "user" }
    ).catch(() => {});

    await logActivity({
      entityType: "invoice",
      entityId: invoiceId,
      action: "paid",
      newValue: "paid",
      metadata: { payment_method: "pool", amount: total },
    }).catch(() => {});

    return { success: true, breakdown };
  }

  // 6. Create Stripe session for remainder
  const idempotencyKey = generatePaymentKey("invoice", invoiceId, "payment");

  // Update invoice to payment_pending
  await supabase
    .from("vendor_invoices")
    .update({
      status: "processing",
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);

  // Stripe session creation is best-effort
  try {
    const stripe = await getStripe();
    if (!stripe) {
      return {
        success: true,
        breakdown,
        error: "Stripe not configured — pool deducted, card payment pending manual setup",
      };
    }

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: Math.round(cardCharge * 100),
              product_data: {
                name: `Invoice Payment (after pool credit of $${poolDeduction.toFixed(2)})`,
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/${invoice.payment_token}/success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/${invoice.payment_token}`,
        metadata: {
          invoice_id: invoiceId,
          pool_deduction: String(poolDeduction),
        },
      },
      { idempotencyKey }
    );

    await emitEvent(
      "payment.stripe_session_created",
      "invoice",
      invoiceId,
      {
        vendor_org_id: invoice.vendor_org_id,
        work_order_id: invoice.work_order_id,
        origin_module: "home",
        stripe_session_id: session.id,
        card_charge: cardCharge,
      },
      { id: actorUserId, type: "user" }
    ).catch(() => {});

    return {
      success: true,
      breakdown,
      stripeSessionUrl: session.url ?? undefined,
    };
  } catch (err) {
    return {
      success: false,
      breakdown,
      error: `Stripe session failed: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }
}

/**
 * Get payment breakdown preview (without actually processing).
 */
export async function getPaymentBreakdown(
  invoiceId: string
): Promise<PaymentBreakdown | null> {
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("vendor_invoices")
    .select("id, total, work_order_id")
    .eq("id", invoiceId)
    .single();

  if (!invoice) return null;

  const total = Number(invoice.total) || 0;
  let poolBalance = 0;

  if (invoice.work_order_id) {
    const { data: wo } = await supabase
      .from("vendor_work_orders")
      .select("homeowner_property_id")
      .eq("id", invoice.work_order_id)
      .single();

    if (wo?.homeowner_property_id) {
      const { data: sub } = await supabase
        .from("homeowner_subscriptions")
        .select("maintenance_pool_balance")
        .eq("property_id", wo.homeowner_property_id)
        .eq("status", "active")
        .single();

      poolBalance = Number(sub?.maintenance_pool_balance) || 0;
    }
  }

  const poolDeduction = Math.min(poolBalance, total);
  const cardCharge = total - poolDeduction;

  return {
    invoiceTotal: total,
    poolAvailable: poolBalance,
    poolDeduction,
    cardCharge: Math.max(0, cardCharge),
    fullyPaidByPool: cardCharge <= 0,
  };
}

// ============================================
// Stripe Helper
// ============================================

async function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;

  const { default: Stripe } = await import("stripe");
  return new Stripe(key, { apiVersion: "2026-02-25.clover" });
}
