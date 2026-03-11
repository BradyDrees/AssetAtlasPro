-- ============================================
-- Migration 031: Emergency SOS
-- Feature: F8 (Emergency SOS)
-- ============================================

-- ─── Emergency Dispatches ────────────────────────────────
-- One row per emergency SOS request. Links to the WO created for it.
CREATE TABLE IF NOT EXISTS emergency_dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES homeowner_properties(id),
  wo_id UUID NOT NULL REFERENCES vendor_work_orders(id),
  emergency_type TEXT NOT NULL CHECK (emergency_type IN ('water','electrical','gas','fire','lockout','other')),
  status TEXT DEFAULT 'dispatching' CHECK (status IN ('dispatching','accepted','expired','cancelled')),
  accepted_by UUID REFERENCES vendor_organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_emergency_dispatches_property
  ON emergency_dispatches(property_id, created_at);

ALTER TABLE emergency_dispatches ENABLE ROW LEVEL SECURITY;

-- Homeowners can read their own dispatches (via property ownership)
CREATE POLICY "homeowner_read_dispatches" ON emergency_dispatches
  FOR SELECT USING (
    property_id IN (
      SELECT id FROM homeowner_properties WHERE user_id = auth.uid()
    )
  );

-- ─── Emergency Dispatch Vendors ──────────────────────────
-- Tracks which vendors were notified per dispatch, in which batch,
-- and their response status. First-accept-wins via optimistic lock.
CREATE TABLE IF NOT EXISTS emergency_dispatch_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id UUID NOT NULL REFERENCES emergency_dispatches(id) ON DELETE CASCADE,
  vendor_org_id UUID NOT NULL REFERENCES vendor_organizations(id),
  batch_number INT NOT NULL,
  notified_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  response_status TEXT DEFAULT 'pending' CHECK (response_status IN ('pending','accepted','declined','expired','cancelled')),
  UNIQUE(dispatch_id, vendor_org_id)
);

CREATE INDEX idx_edv_dispatch
  ON emergency_dispatch_vendors(dispatch_id, response_status);

ALTER TABLE emergency_dispatch_vendors ENABLE ROW LEVEL SECURITY;

-- Vendors can read dispatch rows targeted at their org
CREATE POLICY "vendor_read_dispatch_vendors" ON emergency_dispatch_vendors
  FOR SELECT USING (
    vendor_org_id IN (
      SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()
    )
  );

-- Vendors can update their own response (accept/decline)
CREATE POLICY "vendor_update_dispatch_vendors" ON emergency_dispatch_vendors
  FOR UPDATE USING (
    vendor_org_id IN (
      SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()
    )
  );
