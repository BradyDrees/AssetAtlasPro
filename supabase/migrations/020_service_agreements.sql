-- 020: Service Agreements — recurring maintenance contracts
-- Vendors can set up recurring agreements that auto-generate WOs on a schedule.

CREATE TABLE IF NOT EXISTS service_agreements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_org_id UUID NOT NULL REFERENCES vendor_organizations(id) ON DELETE CASCADE,
  pm_user_id    UUID REFERENCES auth.users(id),
  homeowner_id  UUID REFERENCES auth.users(id),
  homeowner_property_id UUID,
  property_name TEXT,
  service_type  TEXT NOT NULL DEFAULT '',
  trade         TEXT NOT NULL DEFAULT '',
  description   TEXT,
  frequency     TEXT NOT NULL DEFAULT 'monthly'
    CHECK (frequency IN ('weekly','biweekly','monthly','quarterly','semi_annual','annual')),
  price         NUMERIC(12,2) DEFAULT 0,
  next_due      DATE,
  last_generated DATE,
  status        TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','paused','cancelled','expired')),
  start_date    DATE,
  end_date      DATE,
  notes         TEXT,
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for cron efficiency — find agreements due today
CREATE INDEX IF NOT EXISTS idx_sa_next_due
  ON service_agreements(next_due)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_sa_vendor_org
  ON service_agreements(vendor_org_id);

-- RLS
ALTER TABLE service_agreements ENABLE ROW LEVEL SECURITY;

-- Vendor org members can manage their agreements
CREATE POLICY "Vendor org members manage agreements"
  ON service_agreements
  FOR ALL
  USING (
    vendor_org_id IN (
      SELECT vendor_org_id FROM vendor_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    vendor_org_id IN (
      SELECT vendor_org_id FROM vendor_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
