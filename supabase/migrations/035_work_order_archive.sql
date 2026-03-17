-- Migration 035: Work Order Archive
-- Adds soft-archive capability to vendor_work_orders

ALTER TABLE vendor_work_orders ADD COLUMN archived_at TIMESTAMPTZ;

-- Partial index — only index rows that ARE archived (for the "Archived" tab query)
CREATE INDEX idx_wo_archived ON vendor_work_orders(archived_at) WHERE archived_at IS NOT NULL;
