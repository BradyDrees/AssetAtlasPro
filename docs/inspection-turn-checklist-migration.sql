-- ============================================
-- Inspection Unit → Unit Turn Checklist Link
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add turn_unit_id to inspection_units
--    Links to unit_turn_batch_units so we reuse the same checklist infra
ALTER TABLE inspection_units
  ADD COLUMN turn_unit_id UUID DEFAULT NULL
  REFERENCES unit_turn_batch_units(id) ON DELETE SET NULL;

-- 2. Create a Postgres function that provisions a turn checklist for an inspection unit.
--    It creates a hidden internal batch (one per inspection project) if needed,
--    then creates a unit_turn_batch_unit + all unit_turn_unit_items,
--    and writes the turn_unit_id back to the inspection unit.
CREATE OR REPLACE FUNCTION provision_inspection_turn_checklist(
  p_inspection_unit_id UUID,
  p_project_id UUID,
  p_owner_id UUID,
  p_building TEXT,
  p_unit_number TEXT
) RETURNS UUID AS $$
DECLARE
  v_batch_id UUID;
  v_turn_unit_id UUID;
  v_batch_name TEXT;
BEGIN
  -- Check if this unit already has a turn checklist
  SELECT turn_unit_id INTO v_turn_unit_id
  FROM inspection_units
  WHERE id = p_inspection_unit_id;

  IF v_turn_unit_id IS NOT NULL THEN
    RETURN v_turn_unit_id;
  END IF;

  -- Find or create a hidden internal batch for this project
  v_batch_name := '__inspection__' || p_project_id::TEXT;

  SELECT id INTO v_batch_id
  FROM unit_turn_batches
  WHERE name = v_batch_name AND owner_id = p_owner_id
  LIMIT 1;

  IF v_batch_id IS NULL THEN
    INSERT INTO unit_turn_batches (owner_id, name, status)
    VALUES (p_owner_id, v_batch_name, 'OPEN')
    RETURNING id INTO v_batch_id;
  END IF;

  -- Create the unit_turn_batch_unit via the existing create_unit_with_items function
  SELECT create_unit_with_items(
    v_batch_id,
    p_owner_id,
    'Inspection',
    p_building || ' - ' || p_unit_number
  ) INTO v_turn_unit_id;

  -- Link back to the inspection unit
  UPDATE inspection_units
  SET turn_unit_id = v_turn_unit_id
  WHERE id = p_inspection_unit_id;

  RETURN v_turn_unit_id;
END;
$$ LANGUAGE plpgsql;
