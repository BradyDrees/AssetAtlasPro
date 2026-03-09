-- Migration 019: Review cascade tracking + vendor response columns
-- Adds state columns for 3-tier review request cascade on work orders
-- Adds vendor response capability on ratings

-- ─── Review cascade tracking on work orders ───
ALTER TABLE vendor_work_orders
  ADD COLUMN IF NOT EXISTS review_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_reminder_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_last_contact_at TIMESTAMPTZ;

-- ─── Vendor response on ratings ───
ALTER TABLE vendor_ratings
  ADD COLUMN IF NOT EXISTS vendor_response TEXT,
  ADD COLUMN IF NOT EXISTS vendor_responded_at TIMESTAMPTZ;

-- ─── Index for cron query: find review-eligible completed WOs efficiently ───
-- Covers the cron query: status IN (completed, invoiced, paid), homeowner_id IS NOT NULL, count < 3
CREATE INDEX IF NOT EXISTS idx_vendor_wo_review_candidates
  ON vendor_work_orders (status, completed_at, review_last_contact_at)
  WHERE homeowner_id IS NOT NULL
    AND review_reminder_count < 3;

-- ─── RLS: Allow vendor org members to update their own org's rating responses ───
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Vendor org members can respond to reviews' AND tablename = 'vendor_ratings'
  ) THEN
    CREATE POLICY "Vendor org members can respond to reviews"
      ON vendor_ratings FOR UPDATE
      USING (
        vendor_org_id IN (
          SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        vendor_org_id IN (
          SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;
