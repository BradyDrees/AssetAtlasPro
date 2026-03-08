-- Migration 024: Public Booking Page + Lead Capture API
-- Adds slug, booking config, and API key to vendor_organizations.
-- Expands source_type constraint on vendor_work_orders.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. VENDOR ORG — booking columns
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE vendor_organizations
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS booking_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS booking_headline TEXT,
  ADD COLUMN IF NOT EXISTS booking_description TEXT,
  ADD COLUMN IF NOT EXISTS booking_trades TEXT[],
  ADD COLUMN IF NOT EXISTS api_key UUID DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_vo_slug
  ON vendor_organizations(slug) WHERE slug IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vo_api_key
  ON vendor_organizations(api_key) WHERE api_key IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. SOURCE TYPE — add 'website_lead' + 'vendor_direct'
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE vendor_work_orders
  DROP CONSTRAINT IF EXISTS vendor_work_orders_source_type_check;

ALTER TABLE vendor_work_orders
  ADD CONSTRAINT vendor_work_orders_source_type_check
  CHECK (source_type IN (
    'pm_routed', 'client_request', 'inspection_finding',
    'unit_turn_task', 'project_trade', 'vendor_direct',
    'website_lead', 'pm'
  ));
