-- ============================================
-- Migration 040: Operate Unit Tracker
-- ============================================
-- 4 new tables + WO linkage + cost automation trigger
-- ============================================

-- 1. Units (master unit record)
CREATE TABLE IF NOT EXISTS operate_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pm_user_id UUID NOT NULL REFERENCES auth.users(id),
  property_name TEXT NOT NULL,
  property_address TEXT,
  unit_number TEXT NOT NULL,
  unit_type TEXT DEFAULT 'other' CHECK (unit_type IN ('studio','1br','2br','3br','4br','other')),
  status TEXT NOT NULL DEFAULT 'vacant' CHECK (status IN ('occupied','vacant','turn_in_progress','ready_to_lease')),
  tenant_name TEXT,
  tenant_email TEXT,
  tenant_phone TEXT,
  lease_start DATE,
  lease_end DATE,
  beds INT,
  baths NUMERIC(3,1),
  sqft INT,
  floor INT,
  notes TEXT,
  last_inspection_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Cost Ledger (running financial record per unit)
CREATE TABLE IF NOT EXISTS operate_unit_cost_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES operate_units(id) ON DELETE CASCADE,
  wo_id UUID REFERENCES vendor_work_orders(id),
  description TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN (
    'general','plumbing','electrical','hvac','appliance','paint',
    'flooring','cleaning','pest_control','landscaping','roofing',
    'turn','capital','other'
  )),
  labor_cost NUMERIC(12,2) DEFAULT 0,
  parts_cost NUMERIC(12,2) DEFAULT 0,
  total_cost NUMERIC(12,2) GENERATED ALWAYS AS (labor_cost + parts_cost) STORED,
  vendor_name TEXT,
  tech_name TEXT,
  posted_at TIMESTAMPTZ DEFAULT NOW(),
  posted_by UUID REFERENCES auth.users(id),
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual','work_order','turn')),
  turn_id UUID REFERENCES operate_projects(id),
  fiscal_year INT GENERATED ALWAYS AS (EXTRACT(YEAR FROM posted_at)::INT) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Unit Inspections
CREATE TABLE IF NOT EXISTS operate_unit_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES operate_units(id) ON DELETE CASCADE,
  inspection_type TEXT NOT NULL CHECK (inspection_type IN ('move_in','move_out','routine','annual')),
  conducted_by UUID REFERENCES auth.users(id),
  conducted_by_name TEXT,
  conducted_at TIMESTAMPTZ DEFAULT NOW(),
  condition_rating INT CHECK (condition_rating BETWEEN 1 AND 5),
  notes TEXT,
  photos JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Unit Documents
CREATE TABLE IF NOT EXISTS operate_unit_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES operate_units(id) ON DELETE CASCADE,
  document_type TEXT DEFAULT 'other' CHECK (document_type IN ('lease','warranty','permit','invoice','other')),
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size INT,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Add unit_id to vendor_work_orders for direct unit linkage
ALTER TABLE vendor_work_orders
  ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES operate_units(id);

CREATE INDEX IF NOT EXISTS idx_wo_unit ON vendor_work_orders (unit_id) WHERE unit_id IS NOT NULL;

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_units_pm ON operate_units (pm_user_id);
CREATE INDEX IF NOT EXISTS idx_units_pm_status ON operate_units (pm_user_id, status);
CREATE INDEX IF NOT EXISTS idx_units_property ON operate_units (property_name);
CREATE INDEX IF NOT EXISTS idx_units_lease_end ON operate_units (lease_end);
CREATE INDEX IF NOT EXISTS idx_ledger_unit ON operate_unit_cost_ledger (unit_id, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_year ON operate_unit_cost_ledger (unit_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_ledger_wo ON operate_unit_cost_ledger (wo_id) WHERE wo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inspections_unit ON operate_unit_inspections (unit_id, conducted_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_unit ON operate_unit_documents (unit_id);

-- ============================================
-- RLS
-- ============================================
ALTER TABLE operate_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE operate_unit_cost_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE operate_unit_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE operate_unit_documents ENABLE ROW LEVEL SECURITY;

-- Units: PM CRUDs own
CREATE POLICY units_select ON operate_units FOR SELECT
  USING (pm_user_id = auth.uid());
CREATE POLICY units_insert ON operate_units FOR INSERT
  WITH CHECK (pm_user_id = auth.uid());
CREATE POLICY units_update ON operate_units FOR UPDATE
  USING (pm_user_id = auth.uid());
CREATE POLICY units_delete ON operate_units FOR DELETE
  USING (pm_user_id = auth.uid());

-- Child tables: access via unit ownership
CREATE POLICY ledger_select ON operate_unit_cost_ledger FOR SELECT
  USING (unit_id IN (SELECT id FROM operate_units WHERE pm_user_id = auth.uid()));
CREATE POLICY ledger_insert ON operate_unit_cost_ledger FOR INSERT
  WITH CHECK (unit_id IN (SELECT id FROM operate_units WHERE pm_user_id = auth.uid()));
CREATE POLICY ledger_delete ON operate_unit_cost_ledger FOR DELETE
  USING (unit_id IN (SELECT id FROM operate_units WHERE pm_user_id = auth.uid()));

CREATE POLICY inspections_select ON operate_unit_inspections FOR SELECT
  USING (unit_id IN (SELECT id FROM operate_units WHERE pm_user_id = auth.uid()));
CREATE POLICY inspections_insert ON operate_unit_inspections FOR INSERT
  WITH CHECK (unit_id IN (SELECT id FROM operate_units WHERE pm_user_id = auth.uid()));
CREATE POLICY inspections_delete ON operate_unit_inspections FOR DELETE
  USING (unit_id IN (SELECT id FROM operate_units WHERE pm_user_id = auth.uid()));

CREATE POLICY documents_select ON operate_unit_documents FOR SELECT
  USING (unit_id IN (SELECT id FROM operate_units WHERE pm_user_id = auth.uid()));
CREATE POLICY documents_insert ON operate_unit_documents FOR INSERT
  WITH CHECK (unit_id IN (SELECT id FROM operate_units WHERE pm_user_id = auth.uid()));
CREATE POLICY documents_delete ON operate_unit_documents FOR DELETE
  USING (unit_id IN (SELECT id FROM operate_units WHERE pm_user_id = auth.uid()));

-- ============================================
-- Cost Automation Trigger
-- ============================================
-- When a WO with unit_id is marked 'completed', auto-post to cost ledger.
-- SECURITY DEFINER so it can insert into ledger regardless of caller's RLS.

CREATE OR REPLACE FUNCTION post_wo_cost_to_unit_ledger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_labor NUMERIC(12,2);
  v_parts NUMERIC(12,2);
  v_vendor TEXT;
  v_tech TEXT;
  v_desc TEXT;
  v_category TEXT;
BEGIN
  -- Only fire when status changes TO 'completed' and unit_id is set
  IF NEW.unit_id IS NOT NULL
     AND NEW.status = 'completed'
     AND (OLD.status IS DISTINCT FROM 'completed')
  THEN
    -- Prevent duplicate posts: check if ledger entry already exists for this WO
    IF EXISTS (
      SELECT 1 FROM operate_unit_cost_ledger WHERE wo_id = NEW.id
    ) THEN
      RETURN NEW;
    END IF;

    -- Calculate costs from WO materials/time logs
    SELECT COALESCE(SUM(
      CASE WHEN type = 'labor' THEN total ELSE 0 END
    ), 0),
    COALESCE(SUM(
      CASE WHEN type != 'labor' THEN total ELSE 0 END
    ), 0)
    INTO v_labor, v_parts
    FROM vendor_wo_materials
    WHERE work_order_id = NEW.id;

    -- If no materials entries, use budget_amount as fallback
    IF v_labor = 0 AND v_parts = 0 AND NEW.budget_amount IS NOT NULL THEN
      v_labor := NEW.budget_amount;
    END IF;

    -- Get vendor/tech names
    SELECT vo.name INTO v_vendor
    FROM vendor_organizations vo
    WHERE vo.id = NEW.vendor_org_id;

    SELECT CONCAT(vu.first_name, ' ', vu.last_name) INTO v_tech
    FROM vendor_users vu
    WHERE vu.user_id = NEW.assigned_to
    AND vu.is_active = true
    LIMIT 1;

    -- Build description
    v_desc := COALESCE(NEW.description, 'Work Order #' || LEFT(NEW.id::TEXT, 8));

    -- Map trade to category
    v_category := CASE LOWER(COALESCE(NEW.trade, ''))
      WHEN 'plumbing' THEN 'plumbing'
      WHEN 'electrical' THEN 'electrical'
      WHEN 'hvac' THEN 'hvac'
      WHEN 'appliance' THEN 'appliance'
      WHEN 'painting' THEN 'paint'
      WHEN 'paint' THEN 'paint'
      WHEN 'flooring' THEN 'flooring'
      WHEN 'cleaning' THEN 'cleaning'
      WHEN 'pest control' THEN 'pest_control'
      WHEN 'landscaping' THEN 'landscaping'
      WHEN 'roofing' THEN 'roofing'
      ELSE 'general'
    END;

    -- Insert ledger entry
    INSERT INTO operate_unit_cost_ledger (
      unit_id, wo_id, description, category,
      labor_cost, parts_cost, vendor_name, tech_name,
      posted_at, source
    ) VALUES (
      NEW.unit_id, NEW.id, v_desc, v_category,
      v_labor, v_parts, v_vendor, v_tech,
      NOW(), 'work_order'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to vendor_work_orders
DROP TRIGGER IF EXISTS trg_wo_cost_to_unit ON vendor_work_orders;
CREATE TRIGGER trg_wo_cost_to_unit
  AFTER UPDATE OF status ON vendor_work_orders
  FOR EACH ROW
  EXECUTE FUNCTION post_wo_cost_to_unit_ledger();
