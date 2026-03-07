-- Migration 022: Allow vendors to INSERT their own work orders
-- Fixes: "new row violates row-level security policy" when vendor creates a job

-- Vendor org members (owner/admin/office_manager) can create work orders for their org
CREATE POLICY "wo_vendor_insert" ON vendor_work_orders
  FOR INSERT TO authenticated
  WITH CHECK (
    vendor_org_id IN (SELECT get_my_vendor_org_ids())
  );

-- Also allow vendors to INSERT with status 'done_pending_approval' (added in later migrations)
-- The CHECK constraint on status column may need updating if 'vendor_direct' source_type is new
-- No schema change needed — source_type is a TEXT column with no CHECK constraint
