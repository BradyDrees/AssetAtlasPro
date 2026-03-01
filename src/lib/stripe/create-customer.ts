import "server-only";
import { getStripe } from "./stripe-client";

/**
 * Create a Stripe customer for a homeowner.
 * Returns the customer ID.
 */
export async function createStripeCustomer(params: {
  email: string;
  name: string;
  userId: string;
}): Promise<string> {
  const stripe = getStripe();

  const customer = await stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: { atlas_user_id: params.userId },
  });

  return customer.id;
}
