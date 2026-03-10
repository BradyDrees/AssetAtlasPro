-- Migration 023: Inventory / Parts Catalog
-- Vendor parts catalog with stock tracking + link to WO materials

CREATE TABLE IF NOT EXISTS vendor_parts_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_org_id UUID NOT NULL REFERENCES vendor_organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT,
  unit_cost NUMERIC(10,2),
  supplier TEXT,
  current_stock INT DEFAULT 0,
  min_stock INT DEFAULT 0,
  unit_of_measure TEXT DEFAULT 'each',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parts_catalog_org ON vendor_parts_catalog(vendor_org_id);

-- RLS
ALTER TABLE vendor_parts_catalog ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'vendor_parts_catalog' AND policyname = 'parts_vendor_access'
  ) THEN
    CREATE POLICY parts_vendor_access ON vendor_parts_catalog
      FOR ALL USING (vendor_org_id IN (
        SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()
      ));
  END IF;
END $$;

-- Link materials to catalog items
ALTER TABLE vendor_wo_materials
  ADD COLUMN IF NOT EXISTS catalog_item_id UUID REFERENCES vendor_parts_catalog(id),
  ADD COLUMN IF NOT EXISTS cost_variance NUMERIC(10,2);
