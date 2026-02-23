-- Migration 007: Advanced Estimating — pricebook, templates, versions, comments
-- Run this AFTER migration 006 in Supabase SQL Editor.

-- ============================================
-- Pricebook Items
-- ============================================
CREATE TABLE vendor_pricebook_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_org_id UUID NOT NULL REFERENCES vendor_organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  item_type TEXT DEFAULT 'labor' CHECK (item_type IN ('labor','material','equipment','subcontractor','other')),
  unit TEXT DEFAULT 'each',
  unit_price DECIMAL(10,2) DEFAULT 0,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vendor_pricebook_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricebook_vendor_read" ON vendor_pricebook_items FOR SELECT TO authenticated
  USING (vendor_org_id IN (SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()));

CREATE POLICY "pricebook_vendor_write" ON vendor_pricebook_items FOR ALL TO authenticated
  USING (vendor_org_id IN (SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid() AND role IN ('owner','admin','office_manager')));

CREATE INDEX idx_pricebook_org ON vendor_pricebook_items(vendor_org_id);

-- ============================================
-- Estimate Templates
-- ============================================
CREATE TABLE vendor_estimate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_org_id UUID NOT NULL REFERENCES vendor_organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trade TEXT,
  sections JSONB DEFAULT '[]',  -- Array of { name, items: [{ description, item_type, unit, unit_price, quantity }] }
  markup_pct DECIMAL(5,2) DEFAULT 0,
  tax_pct DECIMAL(5,2) DEFAULT 0,
  terms TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vendor_estimate_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_vendor_read" ON vendor_estimate_templates FOR SELECT TO authenticated
  USING (vendor_org_id IN (SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()));

CREATE POLICY "templates_vendor_write" ON vendor_estimate_templates FOR ALL TO authenticated
  USING (vendor_org_id IN (SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid() AND role IN ('owner','admin','office_manager')));

CREATE INDEX idx_templates_org ON vendor_estimate_templates(vendor_org_id);

-- ============================================
-- Estimate Versions (for revision history)
-- ============================================
CREATE TABLE vendor_estimate_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES vendor_estimates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  snapshot JSONB NOT NULL,  -- Full estimate data at time of version
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vendor_estimate_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "versions_vendor_read" ON vendor_estimate_versions FOR SELECT TO authenticated
  USING (estimate_id IN (
    SELECT id FROM vendor_estimates WHERE vendor_org_id IN (
      SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "versions_vendor_write" ON vendor_estimate_versions FOR INSERT TO authenticated
  WITH CHECK (estimate_id IN (
    SELECT id FROM vendor_estimates WHERE vendor_org_id IN (
      SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "versions_pm_read" ON vendor_estimate_versions FOR SELECT TO authenticated
  USING (estimate_id IN (
    SELECT id FROM vendor_estimates WHERE pm_user_id = auth.uid()
  ));

-- ============================================
-- Estimate Comments (PM ↔ Vendor discussion thread)
-- ============================================
CREATE TABLE vendor_estimate_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES vendor_estimates(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  author_role TEXT NOT NULL CHECK (author_role IN ('pm','vendor')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vendor_estimate_comments ENABLE ROW LEVEL SECURITY;

-- Both vendor org members and PM can read/write comments on their estimates
CREATE POLICY "comments_vendor" ON vendor_estimate_comments FOR ALL TO authenticated
  USING (estimate_id IN (
    SELECT id FROM vendor_estimates WHERE vendor_org_id IN (
      SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "comments_pm" ON vendor_estimate_comments FOR ALL TO authenticated
  USING (estimate_id IN (
    SELECT id FROM vendor_estimates WHERE pm_user_id = auth.uid()
  ));

CREATE INDEX idx_comments_estimate ON vendor_estimate_comments(estimate_id, created_at);
