-- Migration 010: Property Intelligence RPC
-- Run this AFTER migration 009 in Supabase SQL Editor.
-- Provides cross-tenant property history for vendors (scoped to active relationships).

CREATE OR REPLACE FUNCTION get_property_intel(p_work_order_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_vendor_org_id UUID;
  v_pm_user_id UUID;
  v_property_address TEXT;
  v_unit_number TEXT;
  v_result JSONB := '{}'::jsonb;
BEGIN
  -- 1. Derive vendor org from the authenticated caller (never trust client-supplied IDs)
  SELECT vendor_org_id INTO v_vendor_org_id
  FROM vendor_users WHERE user_id = auth.uid() LIMIT 1;
  IF v_vendor_org_id IS NULL THEN
    RAISE EXCEPTION 'Caller is not a vendor user';
  END IF;

  -- 2. Get WO details and verify it belongs to caller's org
  SELECT pm_user_id, property_address, unit_number
  INTO v_pm_user_id, v_property_address, v_unit_number
  FROM vendor_work_orders
  WHERE id = p_work_order_id AND vendor_org_id = v_vendor_org_id;
  IF v_pm_user_id IS NULL THEN
    RAISE EXCEPTION 'Work order not found or not authorized';
  END IF;

  -- 3. Verify active PM relationship exists
  IF NOT EXISTS (
    SELECT 1 FROM vendor_pm_relationships
    WHERE vendor_org_id = v_vendor_org_id AND pm_user_id = v_pm_user_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'No active relationship with this PM';
  END IF;

  -- 4. Now safe to query PM's property data, scoped to this property address
  SELECT jsonb_build_object(
    'property_address', v_property_address,
    'unit_number', v_unit_number,
    'past_work_orders', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', wo.id,
        'description', wo.description,
        'trade', wo.trade,
        'status', wo.status,
        'completed_at', wo.completed_at,
        'created_at', wo.created_at
      ) ORDER BY wo.completed_at DESC NULLS LAST)
      FROM vendor_work_orders wo
      WHERE wo.property_address = v_property_address
        AND wo.id != p_work_order_id
        AND wo.vendor_org_id = v_vendor_org_id
      LIMIT 20
    ), '[]'::jsonb),
    'total_past_jobs', (
      SELECT COUNT(*)
      FROM vendor_work_orders wo
      WHERE wo.property_address = v_property_address
        AND wo.id != p_work_order_id
        AND wo.vendor_org_id = v_vendor_org_id
    ),
    'total_invoiced', COALESCE((
      SELECT SUM(vi.total)
      FROM vendor_invoices vi
      JOIN vendor_work_orders wo ON wo.id = vi.work_order_id
      WHERE wo.property_address = v_property_address
        AND wo.vendor_org_id = v_vendor_org_id
        AND vi.status = 'paid'
    ), 0)
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
