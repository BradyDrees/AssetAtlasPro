-- ============================================
-- Migration 033: Vendor Response Time Tracking
-- ============================================

-- 1. Add responded_at column
ALTER TABLE public.vendor_work_orders
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

COMMENT ON COLUMN public.vendor_work_orders.responded_at IS
  'First timestamp when vendor responded to an assigned work order by moving it out of assigned status.';

-- 2. Indexes for response time queries
CREATE INDEX IF NOT EXISTS idx_vendor_work_orders_responded_at
  ON public.vendor_work_orders (responded_at);

CREATE INDEX IF NOT EXISTS idx_vendor_work_orders_status_responded_at
  ON public.vendor_work_orders (status, responded_at);

-- 3. Backfill: for WOs already past assigned, use updated_at as best approximation
UPDATE public.vendor_work_orders
SET responded_at = updated_at
WHERE responded_at IS NULL
  AND status IN ('accepted', 'scheduled', 'en_route', 'on_site', 'in_progress',
                 'completed', 'done_pending_approval', 'invoiced', 'paid', 'declined');
