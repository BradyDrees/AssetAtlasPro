-- ============================================
-- Migration 032: Scalability Foundations
-- Stripe idempotency, invoice numbering, alert cursors
-- ============================================

-- -------------------------------------------
-- 1. Stripe webhook idempotency table
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_swe_stripe_event_id
  ON stripe_webhook_events(stripe_event_id);

CREATE INDEX IF NOT EXISTS idx_swe_created_at
  ON stripe_webhook_events(created_at);

-- Enable RLS (service-role only — no user access)
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------
-- 2. Defense-in-depth: stripe_event_id on pool_transactions
-- -------------------------------------------
ALTER TABLE pool_transactions
  ADD COLUMN IF NOT EXISTS stripe_event_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pool_tx_stripe_event
  ON pool_transactions(stripe_event_id)
  WHERE stripe_event_id IS NOT NULL;

-- -------------------------------------------
-- 3. Atomic invoice numbering
-- -------------------------------------------
ALTER TABLE vendor_organizations
  ADD COLUMN IF NOT EXISTS invoice_number_seq INT DEFAULT 0;

-- Unique constraint: no duplicate invoice numbers per org
-- (defense even if code bypasses the RPC)
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_invoices_org_number
  ON vendor_invoices(vendor_org_id, invoice_number)
  WHERE invoice_number IS NOT NULL;

-- Atomic increment function (SECURITY DEFINER so RLS users can call it)
CREATE OR REPLACE FUNCTION increment_invoice_seq(org_id UUID)
RETURNS TABLE(new_seq INT) AS $$
  UPDATE vendor_organizations
  SET invoice_number_seq = invoice_number_seq + 1
  WHERE id = org_id
  RETURNING invoice_number_seq AS new_seq;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Backfill: set invoice_number_seq to max existing invoice count per org
-- (safe: only updates if current seq is 0/default)
UPDATE vendor_organizations vo
SET invoice_number_seq = sub.max_count
FROM (
  SELECT vendor_org_id, COUNT(*)::INT AS max_count
  FROM vendor_invoices
  GROUP BY vendor_org_id
) sub
WHERE vo.id = sub.vendor_org_id
  AND vo.invoice_number_seq = 0;

-- -------------------------------------------
-- 4. Maintenance alerts cursor column
-- -------------------------------------------
ALTER TABLE homeowner_properties
  ADD COLUMN IF NOT EXISTS last_alert_checked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_hp_alert_check
  ON homeowner_properties(last_alert_checked_at ASC NULLS FIRST);
