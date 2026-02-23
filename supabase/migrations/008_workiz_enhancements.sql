-- ============================================
-- Migration 008: Workiz Feature Enhancements
-- Adds: job tags/type/sub_status, estimate deposits,
-- invoice discounts/payments/balance trigger, org settings,
-- normalized skills, direct clients, document templates, expenses
-- ============================================

-- ============================================
-- PHASE 2: Job enhancements
-- ============================================
ALTER TABLE vendor_work_orders ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE vendor_work_orders ADD COLUMN IF NOT EXISTS sub_status TEXT;
ALTER TABLE vendor_work_orders ADD COLUMN IF NOT EXISTS job_type TEXT;
ALTER TABLE vendor_work_orders ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

-- Tags: normalize + GIN index for filter performance
CREATE INDEX IF NOT EXISTS idx_wo_tags_gin ON vendor_work_orders USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_wo_custom_fields_gin ON vendor_work_orders USING GIN (custom_fields);

-- Tag normalization trigger (lowercase, trimmed, max 50 chars, max 20 tags)
CREATE OR REPLACE FUNCTION normalize_wo_tags() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tags IS NOT NULL THEN
    NEW.tags := (
      SELECT ARRAY(
        SELECT DISTINCT lower(trim(t))
        FROM unnest(NEW.tags) AS t
        WHERE length(trim(t)) > 0 AND length(trim(t)) <= 50
        LIMIT 20
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalize_wo_tags ON vendor_work_orders;
CREATE TRIGGER trg_normalize_wo_tags
  BEFORE INSERT OR UPDATE ON vendor_work_orders
  FOR EACH ROW EXECUTE FUNCTION normalize_wo_tags();

-- Update status CHECK to include 'done_pending_approval'
ALTER TABLE vendor_work_orders DROP CONSTRAINT IF EXISTS vendor_work_orders_status_check;
ALTER TABLE vendor_work_orders ADD CONSTRAINT vendor_work_orders_status_check
  CHECK (status IN ('assigned','accepted','scheduled','en_route','on_site','in_progress',
    'completed','done_pending_approval','invoiced','paid','declined','on_hold'));

-- ============================================
-- PHASE 3: Estimate deposit + approval
-- ============================================
ALTER TABLE vendor_estimates ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT false;
ALTER TABLE vendor_estimates ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 0
  CHECK (deposit_amount >= 0);
ALTER TABLE vendor_estimates ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';
ALTER TABLE vendor_estimates ADD COLUMN IF NOT EXISTS approval_required BOOLEAN DEFAULT false;
ALTER TABLE vendor_estimates ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_est_custom_fields_gin ON vendor_estimates USING GIN (custom_fields);

-- ============================================
-- PHASE 4: Invoice discount + partial payments + balance trigger
-- NOTE: In v3, consider migrating invoice payments to a separate
-- `vendor_invoice_payments` table for long-term accounting scalability
-- (payment date, method, reference, partial amounts, refunds).
-- ============================================
ALTER TABLE vendor_invoices ADD COLUMN IF NOT EXISTS discount_type TEXT
  CHECK (discount_type IN ('percentage','flat'));
ALTER TABLE vendor_invoices ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0
  CHECK (discount_amount >= 0);
ALTER TABLE vendor_invoices ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0
  CHECK (amount_paid >= 0);
ALTER TABLE vendor_invoices ADD COLUMN IF NOT EXISTS balance_due NUMERIC(12,2) NOT NULL DEFAULT 0
  CHECK (balance_due >= 0);
ALTER TABLE vendor_invoices ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_inv_custom_fields_gin ON vendor_invoices USING GIN (custom_fields);

-- TRIGGER: auto-compute balance_due = total - amount_paid - computed_discount
-- Enforces financial integrity on every write
CREATE OR REPLACE FUNCTION compute_invoice_balance() RETURNS TRIGGER AS $$
DECLARE
  computed_discount NUMERIC(12,2);
BEGIN
  -- Compute discount
  IF NEW.discount_type = 'percentage' THEN
    -- Enforce 0-100 range for percentage
    IF NEW.discount_amount < 0 OR NEW.discount_amount > 100 THEN
      RAISE EXCEPTION 'Percentage discount must be between 0 and 100';
    END IF;
    computed_discount := NEW.total * (NEW.discount_amount / 100);
  ELSIF NEW.discount_type = 'flat' THEN
    computed_discount := LEAST(NEW.discount_amount, NEW.total);
  ELSE
    computed_discount := 0;
  END IF;

  NEW.balance_due := GREATEST(NEW.total - NEW.amount_paid - computed_discount, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_compute_invoice_balance ON vendor_invoices;
CREATE TRIGGER trg_compute_invoice_balance
  BEFORE INSERT OR UPDATE ON vendor_invoices
  FOR EACH ROW EXECUTE FUNCTION compute_invoice_balance();

-- ============================================
-- PHASE 5: Org settings with version + defaults
-- ============================================
ALTER TABLE vendor_organizations ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{
  "settings_version": 1,
  "numbering": {"estimate_prefix": "EST", "invoice_prefix": "INV", "next_estimate": 1, "next_invoice": 1},
  "tax_rates": [],
  "job_types": ["service","repair","emergency","maintenance","inspection","turn","estimate_visit"],
  "sub_statuses": ["pending_parts","waiting_approval","done_pending_payment"],
  "working_hours": {"start": "08:00", "end": "17:00", "days": [1,2,3,4,5]},
  "auto_show_estimate": false,
  "custom_field_schemas": {"work_orders": [], "estimates": [], "invoices": []}
}';

-- ============================================
-- PHASE 5: Normalized skills tables (not JSON)
-- ============================================
CREATE TABLE IF NOT EXISTS vendor_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_org_id UUID NOT NULL REFERENCES vendor_organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_org_id, name)
);

CREATE TABLE IF NOT EXISTS vendor_user_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_user_id UUID NOT NULL REFERENCES vendor_users(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES vendor_skills(id) ON DELETE CASCADE,
  proficiency TEXT DEFAULT 'competent' CHECK (proficiency IN ('learning','competent','expert')),
  certified_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_user_id, skill_id)
);

ALTER TABLE vendor_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_user_skills ENABLE ROW LEVEL SECURITY;

-- Skills RLS policies (wrapped in DO blocks for idempotency)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'skills_vendor_read' AND tablename = 'vendor_skills') THEN
    CREATE POLICY "skills_vendor_read" ON vendor_skills FOR SELECT TO authenticated
      USING (vendor_org_id IN (SELECT get_my_vendor_org_ids()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'skills_vendor_write' AND tablename = 'vendor_skills') THEN
    CREATE POLICY "skills_vendor_write" ON vendor_skills FOR ALL TO authenticated
      USING (vendor_org_id IN (SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid() AND role IN ('owner','admin','office_manager')));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_skills_vendor_read' AND tablename = 'vendor_user_skills') THEN
    CREATE POLICY "user_skills_vendor_read" ON vendor_user_skills FOR SELECT TO authenticated
      USING (vendor_user_id IN (SELECT id FROM vendor_users WHERE vendor_org_id IN (SELECT get_my_vendor_org_ids())));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_skills_vendor_write' AND tablename = 'vendor_user_skills') THEN
    CREATE POLICY "user_skills_vendor_write" ON vendor_user_skills FOR ALL TO authenticated
      USING (vendor_user_id IN (SELECT id FROM vendor_users WHERE vendor_org_id IN (SELECT get_my_vendor_org_ids())));
  END IF;
END $$;

-- ============================================
-- PHASE 6: Direct vendor clients (fully defined)
-- ============================================
CREATE TABLE IF NOT EXISTS vendor_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_org_id UUID NOT NULL REFERENCES vendor_organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  client_type TEXT DEFAULT 'direct' CHECK (client_type IN ('direct','homeowner','business','other')),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vendor_clients ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'clients_vendor_read' AND tablename = 'vendor_clients') THEN
    CREATE POLICY "clients_vendor_read" ON vendor_clients FOR SELECT TO authenticated
      USING (vendor_org_id IN (SELECT get_my_vendor_org_ids()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'clients_vendor_write' AND tablename = 'vendor_clients') THEN
    CREATE POLICY "clients_vendor_write" ON vendor_clients FOR ALL TO authenticated
      USING (vendor_org_id IN (SELECT get_my_vendor_org_ids()));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_vendor_clients_org ON vendor_clients(vendor_org_id);

-- ============================================
-- PHASE 8: Pricebook brand/model + document templates
-- ============================================
ALTER TABLE vendor_pricebook_items ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE vendor_pricebook_items ADD COLUMN IF NOT EXISTS model_number TEXT;

CREATE TABLE IF NOT EXISTS vendor_document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_org_id UUID NOT NULL REFERENCES vendor_organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('terms','contract','warranty','scope','cover','other')),
  content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vendor_document_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'doc_templates_vendor_read' AND tablename = 'vendor_document_templates') THEN
    CREATE POLICY "doc_templates_vendor_read" ON vendor_document_templates FOR SELECT TO authenticated
      USING (vendor_org_id IN (SELECT get_my_vendor_org_ids()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'doc_templates_vendor_write' AND tablename = 'vendor_document_templates') THEN
    CREATE POLICY "doc_templates_vendor_write" ON vendor_document_templates FOR ALL TO authenticated
      USING (vendor_org_id IN (SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid() AND role IN ('owner','admin','office_manager')));
  END IF;
END $$;

-- UNIQUE partial index: only one default template per type per org
CREATE UNIQUE INDEX IF NOT EXISTS idx_doc_templates_one_default_per_type
  ON vendor_document_templates (vendor_org_id, type) WHERE is_default = true;

-- ============================================
-- PHASE 11: Expenses (fully defined)
-- ============================================
CREATE TABLE IF NOT EXISTS vendor_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_org_id UUID NOT NULL REFERENCES vendor_organizations(id) ON DELETE CASCADE,
  work_order_id UUID REFERENCES vendor_work_orders(id),
  category TEXT NOT NULL CHECK (category IN ('fuel','tools','supplies','materials','subcontractor','permits','insurance','office','vehicle','travel','meals','other')),
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_path TEXT,
  receipt_file_name TEXT,
  receipt_file_size INTEGER,
  notes TEXT,
  is_reimbursable BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vendor_expenses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'expenses_vendor_read' AND tablename = 'vendor_expenses') THEN
    CREATE POLICY "expenses_vendor_read" ON vendor_expenses FOR SELECT TO authenticated
      USING (vendor_org_id IN (SELECT get_my_vendor_org_ids()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'expenses_vendor_write' AND tablename = 'vendor_expenses') THEN
    CREATE POLICY "expenses_vendor_write" ON vendor_expenses FOR ALL TO authenticated
      USING (vendor_org_id IN (SELECT get_my_vendor_org_ids()));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_expenses_org ON vendor_expenses(vendor_org_id);
CREATE INDEX IF NOT EXISTS idx_expenses_wo ON vendor_expenses(work_order_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON vendor_expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON vendor_expenses(category);

-- ============================================
-- AUTO-UPDATE updated_at TRIGGERS
-- Applies to all new tables that have updated_at but no automatic update
-- ============================================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vendor_clients_updated_at ON vendor_clients;
CREATE TRIGGER trg_vendor_clients_updated_at
  BEFORE UPDATE ON vendor_clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_vendor_document_templates_updated_at ON vendor_document_templates;
CREATE TRIGGER trg_vendor_document_templates_updated_at
  BEFORE UPDATE ON vendor_document_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_vendor_expenses_updated_at ON vendor_expenses;
CREATE TRIGGER trg_vendor_expenses_updated_at
  BEFORE UPDATE ON vendor_expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
