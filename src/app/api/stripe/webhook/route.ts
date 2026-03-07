import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service-role client for webhook (no user session)
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getServiceClient();

  try {
    switch (event.type) {
      case "invoice.paid": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any;
        // Extract subscription ID — may be string or object depending on expand
        const sub_ = invoice.subscription ?? invoice.parent?.subscription_details?.subscription;
        const subId = typeof sub_ === "string" ? sub_ : sub_?.id ?? null;
        if (!subId) break;

        // Find the subscription in our DB
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("id, user_id, property_id, pool_deposit_amount")
          .eq("stripe_subscription_id", subId)
          .single();

        if (!sub) break;

        // Update period
        await supabase
          .from("subscriptions")
          .update({
            current_period_start: invoice.period_start
              ? new Date(invoice.period_start * 1000).toISOString()
              : undefined,
            current_period_end: invoice.period_end
              ? new Date(invoice.period_end * 1000).toISOString()
              : undefined,
            updated_at: new Date().toISOString(),
          })
          .eq("id", sub.id);

        // Deposit into maintenance pool
        const { data: pool } = await supabase
          .from("maintenance_pools")
          .select("id, balance, total_deposited")
          .eq("user_id", sub.user_id)
          .eq("property_id", sub.property_id)
          .single();

        if (pool) {
          const depositAmount = sub.pool_deposit_amount ?? 0;
          await supabase
            .from("maintenance_pools")
            .update({
              balance: (pool.balance ?? 0) + depositAmount,
              total_deposited: (pool.total_deposited ?? 0) + depositAmount,
              updated_at: new Date().toISOString(),
            })
            .eq("id", pool.id);

          // Log transaction
          await supabase.from("pool_transactions").insert({
            pool_id: pool.id,
            type: "deposit",
            amount: depositAmount,
            description: "Monthly subscription deposit",
            reference_type: "subscription",
            reference_id: sub.id,
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const status = subscription.status;

        // Map Stripe status to our status
        let dbStatus: string;
        switch (status) {
          case "active":
            dbStatus = "active";
            break;
          case "past_due":
            dbStatus = "past_due";
            break;
          case "canceled":
            dbStatus = "cancelled";
            break;
          case "paused":
            dbStatus = "paused";
            break;
          default:
            dbStatus = "active";
        }

        await supabase
          .from("subscriptions")
          .update({ status: dbStatus, updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await supabase
          .from("subscriptions")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      case "checkout.session.completed": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const session = event.data.object as any;
        const invoiceId = session.metadata?.invoice_id;
        if (invoiceId) {
          // This is a vendor invoice payment
          const { markInvoicePaidViaStripe } = await import(
            "@/app/actions/vendor-invoice-payment"
          );
          await markInvoicePaidViaStripe(
            invoiceId,
            session.payment_intent ?? session.id,
            session.amount_total ?? 0
          );
        }
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler error" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
