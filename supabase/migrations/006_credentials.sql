-- ============================================
-- Migration 006: Vendor Credentials
-- ============================================
-- Credentials vault for vendor organizations:
-- insurance, licenses, W-9, certifications, bonds.
-- Tracks expiration with status auto-update.

-- Credentials table
CREATE TABLE vendor_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_org_id UUID NOT NULL REFERENCES vendor_organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('insurance_gl','insurance_wc','license','w9','certification','bond','other')),
  name TEXT NOT NULL,
  document_number TEXT,
  storage_path TEXT,  -- vendor-uploads/{org_id}/credentials/{cred_id}/filename
  file_name TEXT,     -- original file name for display
  file_size INTEGER,  -- bytes
  issued_date DATE,
  expiration_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','expiring_soon','expired','revoked')),
  notes TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vendor_credentials ENABLE ROW LEVEL SECURITY;

-- RLS: org-membership based read/write for vendor members
CREATE POLICY "cred_vendor_read" ON vendor_credentials FOR SELECT TO authenticated
  USING (vendor_org_id IN (SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()));

CREATE POLICY "cred_vendor_insert" ON vendor_credentials FOR INSERT TO authenticated
  WITH CHECK (vendor_org_id IN (SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()));

CREATE POLICY "cred_vendor_update" ON vendor_credentials FOR UPDATE TO authenticated
  USING (vendor_org_id IN (SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()))
  WITH CHECK (vendor_org_id IN (SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()));

CREATE POLICY "cred_vendor_delete" ON vendor_credentials FOR DELETE TO authenticated
  USING (vendor_org_id IN (SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()));

-- PM can read credentials of their connected vendors (for compliance review)
CREATE POLICY "cred_pm_read" ON vendor_credentials FOR SELECT TO authenticated
  USING (
    vendor_org_id IN (
      SELECT vendor_org_id FROM vendor_pm_relationships
      WHERE pm_user_id = auth.uid() AND status = 'active'
    )
  );

-- Indexes
CREATE INDEX idx_cred_vendor_org ON vendor_credentials(vendor_org_id);
CREATE INDEX idx_cred_type ON vendor_credentials(type);
CREATE INDEX idx_cred_expiration ON vendor_credentials(expiration_date) WHERE expiration_date IS NOT NULL;
CREATE INDEX idx_cred_status ON vendor_credentials(status);

-- Function to auto-update credential status based on expiration
CREATE OR REPLACE FUNCTION update_credential_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expiration_date IS NOT NULL THEN
    IF NEW.expiration_date < CURRENT_DATE THEN
      NEW.status := 'expired';
    ELSIF NEW.expiration_date <= CURRENT_DATE + INTERVAL '30 days' THEN
      NEW.status := 'expiring_soon';
    ELSE
      NEW.status := 'active';
    END IF;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_credential_status_update
  BEFORE INSERT OR UPDATE ON vendor_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_credential_status();

-- Scheduled function hint: Run a cron job daily to update statuses
-- UPDATE vendor_credentials SET status = 'expired' WHERE expiration_date < CURRENT_DATE AND status != 'expired' AND status != 'revoked';
-- UPDATE vendor_credentials SET status = 'expiring_soon' WHERE expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' AND status = 'active';
