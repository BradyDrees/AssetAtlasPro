-- Migration 025: Job Checklists
-- Run in Supabase SQL Editor BEFORE deploying Batch 3 features

-- ============================================
-- Checklist Templates (per vendor org)
-- ============================================

CREATE TABLE IF NOT EXISTS vendor_checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_org_id UUID NOT NULL REFERENCES vendor_organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trade TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  schema_version INT DEFAULT 1,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for templates
ALTER TABLE vendor_checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendor_checklist_templates_select"
  ON vendor_checklist_templates FOR SELECT
  TO authenticated
  USING (
    vendor_org_id IN (
      SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "vendor_checklist_templates_insert"
  ON vendor_checklist_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    vendor_org_id IN (
      SELECT vendor_org_id FROM vendor_users
      WHERE user_id = auth.uid() AND org_role IN ('owner', 'admin')
    )
  );

CREATE POLICY "vendor_checklist_templates_update"
  ON vendor_checklist_templates FOR UPDATE
  TO authenticated
  USING (
    vendor_org_id IN (
      SELECT vendor_org_id FROM vendor_users
      WHERE user_id = auth.uid() AND org_role IN ('owner', 'admin')
    )
  );

CREATE POLICY "vendor_checklist_templates_delete"
  ON vendor_checklist_templates FOR DELETE
  TO authenticated
  USING (
    vendor_org_id IN (
      SELECT vendor_org_id FROM vendor_users
      WHERE user_id = auth.uid() AND org_role IN ('owner', 'admin')
    )
  );

-- ============================================
-- WO Checklists (per work order)
-- ============================================

CREATE TABLE IF NOT EXISTS vendor_wo_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES vendor_work_orders(id) ON DELETE CASCADE,
  template_id UUID REFERENCES vendor_checklist_templates(id),
  template_version INT DEFAULT 1,
  items JSONB NOT NULL DEFAULT '[]',
  completed_count INT DEFAULT 0,
  total_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one checklist per WO
CREATE UNIQUE INDEX IF NOT EXISTS idx_wo_checklists_wo ON vendor_wo_checklists(work_order_id);

-- RLS for WO checklists
ALTER TABLE vendor_wo_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendor_wo_checklists_select"
  ON vendor_wo_checklists FOR SELECT
  TO authenticated
  USING (
    work_order_id IN (
      SELECT vwo.id FROM vendor_work_orders vwo
      JOIN vendor_users vu ON vu.vendor_org_id = vwo.vendor_org_id
      WHERE vu.user_id = auth.uid()
    )
    OR
    work_order_id IN (
      SELECT id FROM vendor_work_orders
      WHERE pm_user_id = auth.uid() OR homeowner_id = auth.uid()
    )
  );

CREATE POLICY "vendor_wo_checklists_insert"
  ON vendor_wo_checklists FOR INSERT
  TO authenticated
  WITH CHECK (
    work_order_id IN (
      SELECT vwo.id FROM vendor_work_orders vwo
      JOIN vendor_users vu ON vu.vendor_org_id = vwo.vendor_org_id
      WHERE vu.user_id = auth.uid()
    )
  );

CREATE POLICY "vendor_wo_checklists_update"
  ON vendor_wo_checklists FOR UPDATE
  TO authenticated
  USING (
    work_order_id IN (
      SELECT vwo.id FROM vendor_work_orders vwo
      JOIN vendor_users vu ON vu.vendor_org_id = vwo.vendor_org_id
      WHERE vu.user_id = auth.uid()
    )
  );

CREATE POLICY "vendor_wo_checklists_delete"
  ON vendor_wo_checklists FOR DELETE
  TO authenticated
  USING (
    work_order_id IN (
      SELECT vwo.id FROM vendor_work_orders vwo
      JOIN vendor_users vu ON vu.vendor_org_id = vwo.vendor_org_id
      WHERE vu.user_id = auth.uid() AND vu.org_role IN ('owner', 'admin')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checklist_templates_org ON vendor_checklist_templates(vendor_org_id);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_trade ON vendor_checklist_templates(vendor_org_id, trade);
