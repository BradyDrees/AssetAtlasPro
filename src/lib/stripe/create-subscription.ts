import "server-only";
import { getStripe } from "./stripe-client";
import {
  SUBSCRIPTION_PLANS,
  type SubscriptionPlanKey,
} from "@/lib/subscription-plans";

/**
 * Create a Stripe subscription for a given customer + plan.
 * Creates a product first, then a subscription with inline price_data.
 * Returns { subscriptionId, clientSecret } — clientSecret for confirming first payment.
 */
export async function createStripeSubscription(params: {
  customerId: string;
  plan: SubscriptionPlanKey;
  propertyId: string;
}): Promise<{
  subscriptionId: string;
  clientSecret: string | null;
}> {
  const stripe = getStripe();
  const planConfig = SUBSCRIPTION_PLANS[params.plan];

  // Create or retrieve a product for this plan
  const productName = `Atlas Home ${planConfig.name}`;
  const products = await stripe.products.search({
    query: `name:"${productName}" AND active:"true"`,
  });

  let productId: string;
  if (products.data.length > 0) {
    productId = products.data[0].id;
  } else {
    const product = await stripe.products.create({
      name: productName,
      metadata: { plan: params.plan },
    });
    productId = product.id;
  }

  const subscription = await stripe.subscriptions.create({
    customer: params.customerId,
    items: [
      {
        price_data: {
          currency: "usd",
          product: productId,
          unit_amount: Math.round(planConfig.monthly_amount * 100),
          recurring: { interval: "month" },
        },
      },
    ],
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
    expand: ["latest_invoice.payment_intent"],
    metadata: {
      atlas_plan: params.plan,
      atlas_property_id: params.propertyId,
    },
  });

  // Extract client secret for confirming first payment on frontend
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invoice = subscription.latest_invoice as any;
  let clientSecret: string | null = null;

  if (invoice && typeof invoice !== "string") {
    const pi = invoice.payment_intent;
    if (pi && typeof pi !== "string") {
      clientSecret = pi.client_secret ?? null;
    }
  }

  return {
    subscriptionId: subscription.id,
    clientSecret,
  };
}
