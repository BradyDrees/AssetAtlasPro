-- =============================================
-- Migration 027: Subcontractor Management
-- Adds contractor_type to vendor_users and sub assignment tracking
-- =============================================

-- Add contractor type to vendor_users
ALTER TABLE vendor_users
  ADD COLUMN IF NOT EXISTS contractor_type TEXT DEFAULT 'employee'
    CHECK (contractor_type IN ('employee', 'subcontractor'));

-- Sub-contractor assignments table
CREATE TABLE IF NOT EXISTS vendor_sub_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES vendor_work_orders(id) ON DELETE CASCADE,
  sub_vendor_org_id UUID REFERENCES vendor_organizations(id) ON DELETE SET NULL,
  sub_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  hourly_rate NUMERIC(10,2),
  flat_rate NUMERIC(10,2),
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned','accepted','declined','completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sub_assignments_wo ON vendor_sub_assignments(work_order_id, status);
CREATE INDEX IF NOT EXISTS idx_sub_assignments_user ON vendor_sub_assignments(sub_user_id, status);
CREATE INDEX IF NOT EXISTS idx_sub_assignments_org ON vendor_sub_assignments(sub_vendor_org_id, status);

-- RLS
ALTER TABLE vendor_sub_assignments ENABLE ROW LEVEL SECURITY;

-- Vendor org members can read sub assignments for their org's WOs
CREATE POLICY "vendor_read_sub_assignments" ON vendor_sub_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM vendor_work_orders wo
      JOIN vendor_users vu ON vu.vendor_org_id = wo.vendor_org_id
      WHERE wo.id = vendor_sub_assignments.work_order_id
        AND vu.user_id = auth.uid()
    )
  );

-- Vendor admins can insert sub assignments
CREATE POLICY "vendor_insert_sub_assignments" ON vendor_sub_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM vendor_work_orders wo
      JOIN vendor_users vu ON vu.vendor_org_id = wo.vendor_org_id
      WHERE wo.id = vendor_sub_assignments.work_order_id
        AND vu.user_id = auth.uid()
        AND vu.role IN ('owner', 'admin', 'manager')
    )
  );

-- Vendor admins can update sub assignments
CREATE POLICY "vendor_update_sub_assignments" ON vendor_sub_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM vendor_work_orders wo
      JOIN vendor_users vu ON vu.vendor_org_id = wo.vendor_org_id
      WHERE wo.id = vendor_sub_assignments.work_order_id
        AND vu.user_id = auth.uid()
        AND vu.role IN ('owner', 'admin', 'manager')
    )
  );

-- Vendor admins can delete sub assignments
CREATE POLICY "vendor_delete_sub_assignments" ON vendor_sub_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM vendor_work_orders wo
      JOIN vendor_users vu ON vu.vendor_org_id = wo.vendor_org_id
      WHERE wo.id = vendor_sub_assignments.work_order_id
        AND vu.user_id = auth.uid()
        AND vu.role IN ('owner', 'admin', 'manager')
    )
  );

-- Subs can read their own assignments
CREATE POLICY "sub_read_own_assignments" ON vendor_sub_assignments
  FOR SELECT USING (sub_user_id = auth.uid());

-- Subs can update their own assignments (accept/decline)
CREATE POLICY "sub_update_own_assignments" ON vendor_sub_assignments
  FOR UPDATE USING (sub_user_id = auth.uid());

-- Service role full access
CREATE POLICY "service_role_sub_assignments" ON vendor_sub_assignments
  FOR ALL USING (auth.role() = 'service_role');
