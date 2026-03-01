import "server-only";
import { getStripe } from "./stripe-client";

/**
 * Create a one-off payment intent for work that exceeds the pool balance.
 * Returns { paymentIntentId, clientSecret }.
 */
export async function createPaymentIntent(params: {
  customerId: string;
  amountCents: number;
  description: string;
  metadata?: Record<string, string>;
}): Promise<{
  paymentIntentId: string;
  clientSecret: string | null;
}> {
  const stripe = getStripe();

  const intent = await stripe.paymentIntents.create({
    customer: params.customerId,
    amount: params.amountCents,
    currency: "usd",
    description: params.description,
    metadata: params.metadata ?? {},
    automatic_payment_methods: { enabled: true },
  });

  return {
    paymentIntentId: intent.id,
    clientSecret: intent.client_secret,
  };
}
