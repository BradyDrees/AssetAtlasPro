-- ============================================
-- Asset Atlas Pro — Security Fix: RLS Policies
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. RE-ENABLE RLS on inspection_projects
--    (was disabled to debug, needs to be back on)
-- ============================================

ALTER TABLE inspection_projects ENABLE ROW LEVEL SECURITY;

-- Verify the policies still exist (they should from the migration).
-- If they got dropped, recreate them:
DO $$
BEGIN
  -- Owner: full access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'inspection_projects' AND policyname = 'inspection_projects_owner_all'
  ) THEN
    EXECUTE 'CREATE POLICY "inspection_projects_owner_all" ON inspection_projects
      FOR ALL TO authenticated USING (owner_id = auth.uid())';
  END IF;

  -- Shared users: read only
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'inspection_projects' AND policyname = 'inspection_projects_shared_read'
  ) THEN
    EXECUTE 'CREATE POLICY "inspection_projects_shared_read" ON inspection_projects
      FOR SELECT TO authenticated
      USING (id IN (SELECT project_id FROM inspection_project_shares WHERE shared_with_user_id = auth.uid()))';
  END IF;
END $$;


-- ============================================
-- 2. DD Tables — Enable RLS + Add Policies
--    (these never had RLS before)
-- ============================================

-- dd_projects
ALTER TABLE dd_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dd_projects_owner" ON dd_projects
  FOR ALL TO authenticated
  USING (owner_id = auth.uid());

-- dd_sections (master template — readable by all authenticated)
ALTER TABLE dd_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dd_sections_read" ON dd_sections
  FOR SELECT TO authenticated USING (true);

-- dd_project_sections (owner via project)
ALTER TABLE dd_project_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dd_project_sections_owner" ON dd_project_sections
  FOR ALL TO authenticated
  USING (project_id IN (SELECT id FROM dd_projects WHERE owner_id = auth.uid()));

-- dd_section_items (master template — readable by all authenticated)
-- Only add if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dd_section_items') THEN
    EXECUTE 'ALTER TABLE dd_section_items ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'dd_section_items' AND policyname = 'dd_section_items_read'
    ) THEN
      EXECUTE 'CREATE POLICY "dd_section_items_read" ON dd_section_items
        FOR SELECT TO authenticated USING (true)';
    END IF;
  END IF;
END $$;

-- dd_captures (owner via project section → project)
ALTER TABLE dd_captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dd_captures_owner" ON dd_captures
  FOR ALL TO authenticated
  USING (project_section_id IN (
    SELECT ps.id FROM dd_project_sections ps
    JOIN dd_projects p ON p.id = ps.project_id
    WHERE p.owner_id = auth.uid()
  ));

-- dd_units (if exists, owner via project)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dd_units') THEN
    EXECUTE 'ALTER TABLE dd_units ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'dd_units' AND policyname = 'dd_units_owner'
    ) THEN
      EXECUTE 'CREATE POLICY "dd_units_owner" ON dd_units
        FOR ALL TO authenticated
        USING (project_id IN (SELECT id FROM dd_projects WHERE owner_id = auth.uid()))';
    END IF;
  END IF;
END $$;


-- ============================================
-- 3. Unit Turn Tables — Enable RLS + Add Policies
-- ============================================

-- Batches: owner only
ALTER TABLE unit_turn_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ut_batches_owner" ON unit_turn_batches
  FOR ALL TO authenticated
  USING (owner_id = auth.uid());

-- Batch units: owner only (via owner_id on the row itself)
ALTER TABLE unit_turn_batch_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ut_batch_units_owner" ON unit_turn_batch_units
  FOR ALL TO authenticated
  USING (owner_id = auth.uid());

-- Categories: master template, readable by all
ALTER TABLE unit_turn_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ut_categories_read" ON unit_turn_categories
  FOR SELECT TO authenticated USING (true);

-- Template items: master template, readable by all
ALTER TABLE unit_turn_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ut_template_items_read" ON unit_turn_template_items
  FOR SELECT TO authenticated USING (true);

-- Unit items: owner via batch unit
ALTER TABLE unit_turn_unit_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ut_unit_items_owner" ON unit_turn_unit_items
  FOR ALL TO authenticated
  USING (unit_id IN (
    SELECT id FROM unit_turn_batch_units WHERE owner_id = auth.uid()
  ));

-- Notes: owner via batch unit
ALTER TABLE unit_turn_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ut_notes_owner" ON unit_turn_notes
  FOR ALL TO authenticated
  USING (unit_id IN (
    SELECT id FROM unit_turn_batch_units WHERE owner_id = auth.uid()
  ));

-- Note photos: owner via note → batch unit
ALTER TABLE unit_turn_note_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ut_note_photos_owner" ON unit_turn_note_photos
  FOR ALL TO authenticated
  USING (note_id IN (
    SELECT n.id FROM unit_turn_notes n
    JOIN unit_turn_batch_units bu ON bu.id = n.unit_id
    WHERE bu.owner_id = auth.uid()
  ));


-- ============================================
-- 4. Performance indexes for RLS subqueries
-- ============================================

CREATE INDEX IF NOT EXISTS idx_dd_projects_owner ON dd_projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_dd_project_sections_project ON dd_project_sections(project_id);
CREATE INDEX IF NOT EXISTS idx_dd_captures_project_section ON dd_captures(project_section_id);
CREATE INDEX IF NOT EXISTS idx_ut_batches_owner ON unit_turn_batches(owner_id);
CREATE INDEX IF NOT EXISTS idx_ut_batch_units_owner ON unit_turn_batch_units(owner_id);
CREATE INDEX IF NOT EXISTS idx_ut_unit_items_unit ON unit_turn_unit_items(unit_id);
CREATE INDEX IF NOT EXISTS idx_ut_notes_unit ON unit_turn_notes(unit_id);
CREATE INDEX IF NOT EXISTS idx_ut_note_photos_note ON unit_turn_note_photos(note_id);
