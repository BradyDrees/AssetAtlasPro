-- Migration 023: Elite Features (Job Photos, Customer Tracking, Auto Follow-Ups, Recurring Invoices)
-- Single migration covering all four Tier 1 features.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. JOB PHOTOS — add photo_type + vendor INSERT/DELETE policies
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE work_order_photos
  ADD COLUMN IF NOT EXISTS photo_type TEXT DEFAULT 'general'
    CHECK (photo_type IN ('before','during','after','general'));

-- Vendor INSERT: vendor org members can upload photos to their WOs
CREATE POLICY "wo_photos_vendor_insert" ON work_order_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND work_order_id IN (
      SELECT id FROM vendor_work_orders
      WHERE vendor_org_id IN (SELECT get_my_vendor_org_ids())
    )
  );

-- Vendor DELETE: can only delete their own uploads on their org's WOs
CREATE POLICY "wo_photos_vendor_delete" ON work_order_photos
  FOR DELETE TO authenticated
  USING (
    uploaded_by = auth.uid()
    AND work_order_id IN (
      SELECT id FROM vendor_work_orders
      WHERE vendor_org_id IN (SELECT get_my_vendor_org_ids())
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. CUSTOMER TRACKING — add tracking_token to work orders
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE vendor_work_orders
  ADD COLUMN IF NOT EXISTS tracking_token UUID DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_vwo_tracking_token
  ON vendor_work_orders(tracking_token) WHERE tracking_token IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. AUTOMATED FOLLOW-UPS — add reminder tracking to invoices + estimates
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE vendor_invoices
  ADD COLUMN IF NOT EXISTS last_reminded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_count INT DEFAULT 0;

ALTER TABLE vendor_estimates
  ADD COLUMN IF NOT EXISTS last_reminded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_count INT DEFAULT 0;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. RECURRING INVOICES — new template table
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS recurring_invoice_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_org_id UUID NOT NULL REFERENCES vendor_organizations(id) ON DELETE CASCADE,
  pm_user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  property_name TEXT,
  unit_info TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_pct DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly','biweekly','monthly','quarterly','annual')),
  next_due DATE NOT NULL,
  last_generated DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE recurring_invoice_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rit_vendor_all" ON recurring_invoice_templates
  FOR ALL TO authenticated
  USING (vendor_org_id IN (SELECT get_my_vendor_org_ids()))
  WITH CHECK (vendor_org_id IN (SELECT get_my_vendor_org_ids()));

CREATE INDEX IF NOT EXISTS idx_rit_next_due
  ON recurring_invoice_templates(next_due) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_rit_vendor_org
  ON recurring_invoice_templates(vendor_org_id);
