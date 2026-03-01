import "server-only";
import { getStripe } from "./stripe-client";

/**
 * Transfer funds to a vendor's connected Stripe account.
 * Returns the transfer ID.
 *
 * Requires the vendor org to have `stripe_account_id` set.
 * If no connected account exists, this is a no-op that returns null
 * (payment is recorded but payout deferred until vendor onboards to Stripe Connect).
 */
export async function transferToVendor(params: {
  stripeAccountId: string | null;
  amountCents: number;
  description: string;
  woId: string;
}): Promise<string | null> {
  if (!params.stripeAccountId) {
    // Vendor hasn't connected Stripe yet — payout deferred
    return null;
  }

  const stripe = getStripe();

  const transfer = await stripe.transfers.create({
    amount: params.amountCents,
    currency: "usd",
    destination: params.stripeAccountId,
    description: params.description,
    metadata: { work_order_id: params.woId },
  });

  return transfer.id;
}
