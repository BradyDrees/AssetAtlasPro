import "server-only";
import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to .env.local to enable payments."
    );
  }

  _stripe = new Stripe(key);
  return _stripe;
}

/**
 * Returns true when the Stripe secret key is configured.
 * Use this to gate payment flows so they degrade gracefully.
 */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
