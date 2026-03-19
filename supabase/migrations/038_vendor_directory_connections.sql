-- ============================================
-- Migration 038: Vendor Directory & Connection Requests
-- ============================================
-- 1. Add connection request columns to vendor_pm_relationships
-- 2. Add 'declined' to status CHECK
-- 3. Add org-to-org partial unique index
-- 4. Backfill pm_org_id from existing user_roles
-- ============================================

-- 1. Expand status CHECK to include 'declined'
ALTER TABLE vendor_pm_relationships
  DROP CONSTRAINT IF EXISTS vendor_pm_relationships_status_check;

ALTER TABLE vendor_pm_relationships
  ADD CONSTRAINT vendor_pm_relationships_status_check
  CHECK (status IN ('pending', 'active', 'suspended', 'terminated', 'declined'));

-- 2. Add new columns for connection request flow
ALTER TABLE vendor_pm_relationships
  ADD COLUMN IF NOT EXISTS pm_org_id UUID,
  ADD COLUMN IF NOT EXISTS requested_by UUID,
  ADD COLUMN IF NOT EXISTS request_message TEXT,
  ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS responded_by UUID,
  ADD COLUMN IF NOT EXISTS decline_reason TEXT,
  ADD COLUMN IF NOT EXISTS decline_reason_code TEXT,
  ADD COLUMN IF NOT EXISTS request_origin TEXT DEFAULT 'directory';

-- 3. Backfill pm_org_id from user_roles for existing relationships
UPDATE vendor_pm_relationships vpr
SET pm_org_id = ur.org_id
FROM user_roles ur
WHERE ur.user_id = vpr.pm_user_id
  AND ur.role IN ('pm_admin', 'pm_manager', 'pm_member')
  AND ur.is_active = true
  AND vpr.pm_org_id IS NULL;

-- 4. Org-to-org partial unique index
-- Only one pending or active relationship per PM org + vendor org pair
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_pm_one_active_per_org
  ON vendor_pm_relationships (pm_org_id, vendor_org_id)
  WHERE status IN ('pending', 'active')
  AND pm_org_id IS NOT NULL;

-- 5. Index for vendor-side pending request lookups
CREATE INDEX IF NOT EXISTS idx_vendor_pm_pending_requests
  ON vendor_pm_relationships (vendor_org_id, status)
  WHERE status = 'pending';

-- 6. Index for rate limiting (requests per PM user per day)
CREATE INDEX IF NOT EXISTS idx_vendor_pm_rate_limit
  ON vendor_pm_relationships (requested_by, requested_at)
  WHERE requested_by IS NOT NULL;
