-- =============================================
-- Migration 026: Project Bid Invitations
-- Multi-vendor bidding for homeowner projects
-- =============================================

-- Bid invitations table
CREATE TABLE IF NOT EXISTS project_bid_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  work_order_id UUID NOT NULL REFERENCES vendor_work_orders(id) ON DELETE CASCADE,
  vendor_org_id UUID NOT NULL REFERENCES vendor_organizations(id) ON DELETE CASCADE,
  estimate_id UUID REFERENCES vendor_estimates(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'invited' CHECK (status IN ('invited','bid_submitted','accepted','declined','expired')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bid_invitations_project ON project_bid_invitations(project_id, status);
CREATE INDEX IF NOT EXISTS idx_bid_invitations_wo ON project_bid_invitations(work_order_id, status);
CREATE INDEX IF NOT EXISTS idx_bid_invitations_vendor ON project_bid_invitations(vendor_org_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bid_invitations_unique ON project_bid_invitations(work_order_id, vendor_org_id);

-- RLS
ALTER TABLE project_bid_invitations ENABLE ROW LEVEL SECURITY;

-- Homeowners can read invitations for their own projects' WOs
CREATE POLICY "homeowners_read_own_bids" ON project_bid_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM vendor_work_orders wo
      WHERE wo.id = project_bid_invitations.work_order_id
        AND wo.homeowner_id = auth.uid()
    )
  );

-- Homeowners can insert invitations for their own WOs
CREATE POLICY "homeowners_insert_bids" ON project_bid_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM vendor_work_orders wo
      WHERE wo.id = project_bid_invitations.work_order_id
        AND wo.homeowner_id = auth.uid()
    )
  );

-- Homeowners can update invitations for their own WOs (accept/decline)
CREATE POLICY "homeowners_update_bids" ON project_bid_invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM vendor_work_orders wo
      WHERE wo.id = project_bid_invitations.work_order_id
        AND wo.homeowner_id = auth.uid()
    )
  );

-- Vendors can read invitations sent to their org
CREATE POLICY "vendors_read_own_invitations" ON project_bid_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM vendor_users vu
      WHERE vu.user_id = auth.uid()
        AND vu.vendor_org_id = project_bid_invitations.vendor_org_id
    )
  );

-- Vendors can update their own invitations (submit bid / decline)
CREATE POLICY "vendors_update_own_invitations" ON project_bid_invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM vendor_users vu
      WHERE vu.user_id = auth.uid()
        AND vu.vendor_org_id = project_bid_invitations.vendor_org_id
    )
  );

-- Service role has full access (for server actions)
CREATE POLICY "service_role_full_access_bids" ON project_bid_invitations
  FOR ALL USING (auth.role() = 'service_role');
