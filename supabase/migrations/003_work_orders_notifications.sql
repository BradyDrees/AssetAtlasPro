-- Migration 3: Work Orders + Materials + Time Entries + Notifications + RPCs
-- Run this in Supabase SQL Editor AFTER migration 002

-- ============================================
-- vendor_work_orders
-- ============================================
CREATE TABLE vendor_work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_org_id UUID REFERENCES vendor_organizations(id),
  assigned_to UUID REFERENCES vendor_users(id),
  pm_user_id UUID REFERENCES auth.users(id),
  property_name TEXT,
  property_address TEXT,
  unit_number TEXT,
  description TEXT,
  pm_notes TEXT,
  access_notes TEXT,
  tenant_name TEXT,
  tenant_phone TEXT,
  tenant_language TEXT,
  trade TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal','urgent','emergency')),
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned','accepted','scheduled','en_route','on_site','in_progress','completed','invoiced','paid','declined','on_hold')),
  budget_type TEXT CHECK (budget_type IN ('nte','approved','estimate_required')),
  budget_amount DECIMAL(10,2),
  scheduled_date DATE,
  scheduled_time_start TIME,
  scheduled_time_end TIME,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  decline_reason TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- vendor_wo_materials
-- ============================================
CREATE TABLE vendor_wo_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES vendor_work_orders(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_cost DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- vendor_wo_time_entries
-- ============================================
CREATE TABLE vendor_wo_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES vendor_work_orders(id) ON DELETE CASCADE,
  vendor_user_id UUID REFERENCES vendor_users(id),
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  duration_minutes INTEGER,
  hourly_rate DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- vendor_notifications
-- ============================================
CREATE TABLE vendor_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  reference_type TEXT,
  reference_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RLS: vendor_work_orders (TWO-SIDED visibility)
-- ============================================
ALTER TABLE vendor_work_orders ENABLE ROW LEVEL SECURITY;

-- Vendor org members can read WOs assigned to their org
CREATE POLICY "wo_vendor_read" ON vendor_work_orders FOR SELECT TO authenticated
  USING (vendor_org_id IN (SELECT get_my_vendor_org_ids()));

-- Vendor org members can update WOs assigned to their org
CREATE POLICY "wo_vendor_update" ON vendor_work_orders FOR UPDATE TO authenticated
  USING (vendor_org_id IN (SELECT get_my_vendor_org_ids()));

-- PM creator can read their own WOs
CREATE POLICY "wo_pm_read" ON vendor_work_orders FOR SELECT TO authenticated
  USING (pm_user_id = auth.uid());

-- PM creator can insert WOs
CREATE POLICY "wo_pm_insert" ON vendor_work_orders FOR INSERT TO authenticated
  WITH CHECK (pm_user_id = auth.uid());

-- PM creator can update their own WOs (for schedule/budget edits via RPC)
CREATE POLICY "wo_pm_update" ON vendor_work_orders FOR UPDATE TO authenticated
  USING (pm_user_id = auth.uid());

-- ============================================
-- RLS: vendor_wo_materials (two-sided)
-- ============================================
ALTER TABLE vendor_wo_materials ENABLE ROW LEVEL SECURITY;

-- Vendor org members can CRUD materials on their WOs
CREATE POLICY "wo_materials_vendor" ON vendor_wo_materials FOR ALL TO authenticated
  USING (work_order_id IN (
    SELECT id FROM vendor_work_orders
    WHERE vendor_org_id IN (SELECT get_my_vendor_org_ids())
  ));

-- PM can read materials on their WOs
CREATE POLICY "wo_materials_pm_read" ON vendor_wo_materials FOR SELECT TO authenticated
  USING (work_order_id IN (
    SELECT id FROM vendor_work_orders WHERE pm_user_id = auth.uid()
  ));

-- ============================================
-- RLS: vendor_wo_time_entries (two-sided)
-- ============================================
ALTER TABLE vendor_wo_time_entries ENABLE ROW LEVEL SECURITY;

-- Vendor org members can CRUD time entries on their WOs
CREATE POLICY "wo_time_vendor" ON vendor_wo_time_entries FOR ALL TO authenticated
  USING (work_order_id IN (
    SELECT id FROM vendor_work_orders
    WHERE vendor_org_id IN (SELECT get_my_vendor_org_ids())
  ));

-- PM can read time entries on their WOs
CREATE POLICY "wo_time_pm_read" ON vendor_wo_time_entries FOR SELECT TO authenticated
  USING (work_order_id IN (
    SELECT id FROM vendor_work_orders WHERE pm_user_id = auth.uid()
  ));

-- ============================================
-- RLS: vendor_notifications (own only)
-- ============================================
ALTER TABLE vendor_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_own" ON vendor_notifications FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_wo_vendor_org ON vendor_work_orders(vendor_org_id);
CREATE INDEX idx_wo_pm ON vendor_work_orders(pm_user_id);
CREATE INDEX idx_wo_assigned ON vendor_work_orders(assigned_to);
CREATE INDEX idx_wo_status ON vendor_work_orders(status);
CREATE INDEX idx_wo_scheduled ON vendor_work_orders(scheduled_date);
CREATE INDEX idx_wo_materials_wo ON vendor_wo_materials(work_order_id);
CREATE INDEX idx_wo_time_wo ON vendor_wo_time_entries(work_order_id);
CREATE INDEX idx_notifications_user ON vendor_notifications(user_id, is_read, created_at DESC);

-- ============================================
-- SECURITY DEFINER RPC: pm_update_work_order
-- PM can only edit schedule/budget/notes/priority — never status/completion/vendor fields
-- (Correction 3)
-- ============================================
CREATE OR REPLACE FUNCTION pm_update_work_order(
  p_wo_id UUID,
  p_scheduled_date DATE DEFAULT NULL,
  p_scheduled_time_start TIME DEFAULT NULL,
  p_scheduled_time_end TIME DEFAULT NULL,
  p_budget_type TEXT DEFAULT NULL,
  p_budget_amount DECIMAL DEFAULT NULL,
  p_pm_notes TEXT DEFAULT NULL,
  p_access_notes TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Verify caller is the PM on this work order
  IF NOT EXISTS (
    SELECT 1 FROM public.vendor_work_orders WHERE id = p_wo_id AND pm_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: not the PM on this work order';
  END IF;

  IF p_priority IS NOT NULL AND p_priority NOT IN ('normal', 'urgent', 'emergency') THEN
    RAISE EXCEPTION 'Invalid priority value';
  END IF;

  IF p_budget_type IS NOT NULL AND p_budget_type NOT IN ('nte', 'approved', 'estimate_required') THEN
    RAISE EXCEPTION 'Invalid budget_type value';
  END IF;

  UPDATE public.vendor_work_orders SET
    scheduled_date = COALESCE(p_scheduled_date, scheduled_date),
    scheduled_time_start = COALESCE(p_scheduled_time_start, scheduled_time_start),
    scheduled_time_end = COALESCE(p_scheduled_time_end, scheduled_time_end),
    budget_type = COALESCE(p_budget_type, budget_type),
    budget_amount = COALESCE(p_budget_amount, budget_amount),
    pm_notes = COALESCE(p_pm_notes, pm_notes),
    access_notes = COALESCE(p_access_notes, access_notes),
    priority = COALESCE(p_priority, priority),
    updated_by = auth.uid(),
    updated_at = NOW()
  WHERE id = p_wo_id;

  -- Log the activity
  INSERT INTO public.vendor_activity_log (actor_id, actor_role, entity_type, entity_id, action, metadata)
  VALUES (auth.uid(), 'pm', 'work_order', p_wo_id, 'pm_updated', jsonb_build_object(
    'fields_updated', array_remove(ARRAY[
      CASE WHEN p_scheduled_date IS NOT NULL THEN 'scheduled_date' END,
      CASE WHEN p_budget_amount IS NOT NULL THEN 'budget_amount' END,
      CASE WHEN p_pm_notes IS NOT NULL THEN 'pm_notes' END,
      CASE WHEN p_priority IS NOT NULL THEN 'priority' END,
      CASE WHEN p_access_notes IS NOT NULL THEN 'access_notes' END,
      CASE WHEN p_budget_type IS NOT NULL THEN 'budget_type' END,
      CASE WHEN p_scheduled_time_start IS NOT NULL THEN 'scheduled_time_start' END,
      CASE WHEN p_scheduled_time_end IS NOT NULL THEN 'scheduled_time_end' END
    ], NULL)
  ));
END;
$$;

-- ============================================
-- SECURITY DEFINER RPC: get_activity_log
-- Cross-party activity log reads — checks authorization by entity type
-- ============================================
CREATE OR REPLACE FUNCTION get_activity_log(p_entity_type TEXT, p_entity_id UUID)
RETURNS SETOF public.vendor_activity_log
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_authorized BOOLEAN := false;
  v_vendor_org_id UUID;
BEGIN
  SELECT vendor_org_id INTO v_vendor_org_id
  FROM public.vendor_users WHERE user_id = auth.uid() LIMIT 1;

  CASE p_entity_type
    WHEN 'work_order' THEN
      v_authorized := EXISTS (
        SELECT 1 FROM public.vendor_work_orders WHERE id = p_entity_id
        AND ((vendor_org_id = v_vendor_org_id) OR (pm_user_id = auth.uid()))
      );
    WHEN 'vendor_user' THEN
      -- Allow users to see their own activity
      v_authorized := (p_entity_id = auth.uid());
    WHEN 'vendor_org' THEN
      v_authorized := (v_vendor_org_id = p_entity_id);
    WHEN 'relationship' THEN
      v_authorized := EXISTS (
        SELECT 1 FROM public.vendor_pm_relationships WHERE id = p_entity_id
        AND ((vendor_org_id = v_vendor_org_id) OR (pm_user_id = auth.uid()))
      );
    ELSE
      v_authorized := false;
  END CASE;

  IF NOT v_authorized THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT * FROM public.vendor_activity_log
  WHERE entity_type = p_entity_type AND entity_id = p_entity_id
  ORDER BY created_at DESC;
END;
$$;
