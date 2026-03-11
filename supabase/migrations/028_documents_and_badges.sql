-- ============================================
-- Migration 028: Document Vault + Vendor Trust Badges
-- Features: F2 (Document Vault), F3 (Vendor Trust Badges)
-- ============================================

-- ─── Homeowner Documents Table ───────────────────────────
CREATE TABLE IF NOT EXISTS homeowner_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES homeowner_properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  category TEXT NOT NULL CHECK (category IN ('warranty','manual','contract','inspection_report','insurance','permit','receipt','other')),
  name TEXT NOT NULL,
  description TEXT,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT CHECK (file_size >= 0),
  mime_type TEXT,
  system_type TEXT CHECK (system_type IS NULL OR system_type IN ('hvac','water_heater','electrical_panel','roof','plumbing','garage_door','pool','sprinkler','other')),
  expiration_date DATE CHECK (expiration_date IS NULL OR expiration_date >= DATE '2000-01-01'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE homeowner_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_own_documents" ON homeowner_documents
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX idx_homeowner_docs_property ON homeowner_documents(property_id);
CREATE INDEX idx_homeowner_docs_category ON homeowner_documents(property_id, category);
CREATE INDEX idx_homeowner_docs_expiration ON homeowner_documents(property_id, expiration_date);

CREATE TRIGGER set_homeowner_documents_updated_at
  BEFORE UPDATE ON homeowner_documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Vendor Trust Badges View ────────────────────────────
-- Aggregates vendor_credentials per org for homeowner-safe badge display.
-- No service-role needed — derived from existing credentialed data.
CREATE OR REPLACE VIEW homeowner_vendor_badges AS
SELECT
  vendor_org_id,
  BOOL_OR(type = 'insurance_gl' AND status = 'active' AND (expiration_date IS NULL OR expiration_date >= CURRENT_DATE)) AS has_gl,
  BOOL_OR(type = 'insurance_wc' AND status = 'active' AND (expiration_date IS NULL OR expiration_date >= CURRENT_DATE)) AS has_wc,
  BOOL_OR(type = 'license' AND status = 'active' AND (expiration_date IS NULL OR expiration_date >= CURRENT_DATE)) AS licensed,
  BOOL_OR(type = 'bond' AND status = 'active' AND (expiration_date IS NULL OR expiration_date >= CURRENT_DATE)) AS bonded,
  BOOL_OR(type = 'certification' AND status = 'active' AND LOWER(name) LIKE '%background%') AS background_check
FROM vendor_credentials
GROUP BY vendor_org_id;
