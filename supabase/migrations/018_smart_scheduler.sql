-- ============================================
-- Migration 018: Smart Scheduler — property_zip column
-- ============================================

-- 1. Add property_zip column to vendor_work_orders
ALTER TABLE vendor_work_orders
  ADD COLUMN IF NOT EXISTS property_zip TEXT;

-- 2. Index for zip-based grouping queries
CREATE INDEX IF NOT EXISTS idx_vwo_property_zip
  ON vendor_work_orders(vendor_org_id, property_zip)
  WHERE property_zip IS NOT NULL;

-- 3. Trigger function: auto-extract 5-digit US zip from property_address
CREATE OR REPLACE FUNCTION fn_extract_property_zip()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.property_address IS NOT NULL AND (NEW.property_zip IS NULL OR TG_OP = 'UPDATE') THEN
    NEW.property_zip := (regexp_match(NEW.property_address, '\m(\d{5})(?:-\d{4})?\M'))[1];
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger: fire on INSERT and UPDATE of property_address
DROP TRIGGER IF EXISTS trg_extract_property_zip ON vendor_work_orders;
CREATE TRIGGER trg_extract_property_zip
  BEFORE INSERT OR UPDATE OF property_address ON vendor_work_orders
  FOR EACH ROW EXECUTE FUNCTION fn_extract_property_zip();

-- 5. Backfill existing rows that have an address but no zip
UPDATE vendor_work_orders
SET property_zip = (regexp_match(property_address, '\m(\d{5})(?:-\d{4})?\M'))[1]
WHERE property_address IS NOT NULL AND property_zip IS NULL;
