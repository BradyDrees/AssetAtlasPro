-- 019: Invoice Payments — Stripe Checkout support
-- Adds columns to track Stripe payment intent + shareable payment URL

ALTER TABLE vendor_invoices
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_url TEXT;

CREATE INDEX IF NOT EXISTS idx_vi_stripe_pi
  ON vendor_invoices(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
