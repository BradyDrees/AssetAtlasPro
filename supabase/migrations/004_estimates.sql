-- Migration 4: Estimates — sections, line items, photos
-- Run this in Supabase SQL Editor AFTER migration 003

-- ============================================
-- vendor_estimates
-- ============================================
CREATE TABLE vendor_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_org_id UUID REFERENCES vendor_organizations(id),
  created_by UUID REFERENCES vendor_users(id),
  pm_user_id UUID REFERENCES auth.users(id),
  work_order_id UUID REFERENCES vendor_work_orders(id),
  estimate_number TEXT,
  property_name TEXT,
  property_address TEXT,
  unit_info TEXT,
  title TEXT,
  description TEXT,
  tier_mode TEXT DEFAULT 'none' CHECK (tier_mode IN ('none','section','line_item')),
  subtotal DECIMAL(12,2) DEFAULT 0,
  markup_pct DECIMAL(5,2) DEFAULT 0,
  markup_amount DECIMAL(12,2) DEFAULT 0,
  tax_pct DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','pm_reviewing','with_owner','changes_requested','approved','declined','expired')),
  change_request_notes TEXT,
  sent_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  valid_until DATE,
  terms TEXT,
  internal_notes TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- vendor_estimate_sections
-- ============================================
CREATE TABLE vendor_estimate_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES vendor_estimates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  tier TEXT CHECK (tier IN ('good','better','best')),
  subtotal DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- vendor_estimate_items
-- ============================================
CREATE TABLE vendor_estimate_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES vendor_estimate_sections(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  item_type TEXT DEFAULT 'labor' CHECK (item_type IN ('labor','material','equipment','subcontractor','other')),
  quantity DECIMAL(10,2) DEFAULT 1,
  unit TEXT DEFAULT 'each',
  unit_price DECIMAL(10,2) DEFAULT 0,
  markup_pct DECIMAL(5,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  tier TEXT CHECK (tier IN ('good','better','best')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- vendor_estimate_photos
-- ============================================
CREATE TABLE vendor_estimate_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES vendor_estimates(id) ON DELETE CASCADE,
  section_id UUID REFERENCES vendor_estimate_sections(id),
  item_id UUID REFERENCES vendor_estimate_items(id),
  storage_path TEXT NOT NULL,
  caption TEXT,
  annotation_data JSONB,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RLS: vendor_estimates (two-sided)
-- ============================================
ALTER TABLE vendor_estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "estimates_vendor_read" ON vendor_estimates FOR SELECT TO authenticated
  USING (vendor_org_id IN (SELECT get_my_vendor_org_ids()));

CREATE POLICY "estimates_vendor_insert" ON vendor_estimates FOR INSERT TO authenticated
  WITH CHECK (vendor_org_id IN (SELECT get_my_vendor_org_ids()));

CREATE POLICY "estimates_vendor_update" ON vendor_estimates FOR UPDATE TO authenticated
  USING (vendor_org_id IN (SELECT get_my_vendor_org_ids()));

CREATE POLICY "estimates_vendor_delete" ON vendor_estimates FOR DELETE TO authenticated
  USING (vendor_org_id IN (SELECT get_my_vendor_org_ids()) AND status = 'draft');

CREATE POLICY "estimates_pm_read" ON vendor_estimates FOR SELECT TO authenticated
  USING (pm_user_id = auth.uid());

CREATE POLICY "estimates_pm_update" ON vendor_estimates FOR UPDATE TO authenticated
  USING (pm_user_id = auth.uid());

-- ============================================
-- RLS: vendor_estimate_sections (via parent estimate)
-- ============================================
ALTER TABLE vendor_estimate_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "est_sections_vendor" ON vendor_estimate_sections FOR ALL TO authenticated
  USING (estimate_id IN (
    SELECT id FROM vendor_estimates WHERE vendor_org_id IN (SELECT get_my_vendor_org_ids())
  ));

CREATE POLICY "est_sections_pm_read" ON vendor_estimate_sections FOR SELECT TO authenticated
  USING (estimate_id IN (
    SELECT id FROM vendor_estimates WHERE pm_user_id = auth.uid()
  ));

-- ============================================
-- RLS: vendor_estimate_items (via parent section → estimate)
-- ============================================
ALTER TABLE vendor_estimate_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "est_items_vendor" ON vendor_estimate_items FOR ALL TO authenticated
  USING (section_id IN (
    SELECT s.id FROM vendor_estimate_sections s
    JOIN vendor_estimates e ON s.estimate_id = e.id
    WHERE e.vendor_org_id IN (SELECT get_my_vendor_org_ids())
  ));

CREATE POLICY "est_items_pm_read" ON vendor_estimate_items FOR SELECT TO authenticated
  USING (section_id IN (
    SELECT s.id FROM vendor_estimate_sections s
    JOIN vendor_estimates e ON s.estimate_id = e.id
    WHERE e.pm_user_id = auth.uid()
  ));

-- ============================================
-- RLS: vendor_estimate_photos (via parent estimate)
-- ============================================
ALTER TABLE vendor_estimate_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "est_photos_vendor" ON vendor_estimate_photos FOR ALL TO authenticated
  USING (estimate_id IN (
    SELECT id FROM vendor_estimates WHERE vendor_org_id IN (SELECT get_my_vendor_org_ids())
  ));

CREATE POLICY "est_photos_pm_read" ON vendor_estimate_photos FOR SELECT TO authenticated
  USING (estimate_id IN (
    SELECT id FROM vendor_estimates WHERE pm_user_id = auth.uid()
  ));

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_estimates_vendor_org ON vendor_estimates(vendor_org_id);
CREATE INDEX idx_estimates_pm ON vendor_estimates(pm_user_id);
CREATE INDEX idx_estimates_wo ON vendor_estimates(work_order_id);
CREATE INDEX idx_estimates_status ON vendor_estimates(status);
CREATE INDEX idx_est_sections_estimate ON vendor_estimate_sections(estimate_id, sort_order);
CREATE INDEX idx_est_items_section ON vendor_estimate_items(section_id, sort_order);
CREATE INDEX idx_est_photos_estimate ON vendor_estimate_photos(estimate_id);
