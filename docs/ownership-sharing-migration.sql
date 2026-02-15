-- ============================================
-- Asset Atlas Pro — Ownership & Sharing Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. Profiles table (for email lookup when sharing)
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_idx ON profiles(lower(email));

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read their own profile row
CREATE POLICY "profiles_read_own" ON profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    lower(NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists to avoid duplicate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Backfill existing users
INSERT INTO profiles (id, email, full_name)
SELECT id, lower(email), COALESCE(raw_user_meta_data->>'full_name', '')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Updated-at trigger
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_inspection_updated_at();

-- Secure RPC for email lookup (prevents full-table scraping)
CREATE OR REPLACE FUNCTION find_profile_by_email(lookup_email TEXT)
RETURNS TABLE(out_id UUID, out_email TEXT, out_full_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.email, p.full_name
  FROM profiles p
  WHERE p.email = lower(lookup_email)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 2. Inspection Project Shares table
-- ============================================

CREATE TABLE IF NOT EXISTS inspection_project_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES inspection_projects(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL DEFAULT 'collaborator' CHECK (role IN ('collaborator')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, shared_with_user_id)
);

CREATE INDEX IF NOT EXISTS idx_shares_shared_with ON inspection_project_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_shares_project ON inspection_project_shares(project_id);

ALTER TABLE inspection_project_shares ENABLE ROW LEVEL SECURITY;

-- Owner can manage shares for their projects
CREATE POLICY "shares_owner_manage" ON inspection_project_shares
  FOR ALL TO authenticated
  USING (
    project_id IN (SELECT id FROM inspection_projects WHERE owner_id = auth.uid())
  );

-- Shared user can read their own share records
CREATE POLICY "shares_shared_user_read" ON inspection_project_shares
  FOR SELECT TO authenticated
  USING (shared_with_user_id = auth.uid());

-- ============================================
-- 3. Add created_by to inspection_findings
-- ============================================

ALTER TABLE inspection_findings
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Backfill: set existing findings to their project owner
UPDATE inspection_findings f
SET created_by = p.owner_id
FROM inspection_projects p
WHERE f.project_id = p.id AND f.created_by IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE inspection_findings
  ALTER COLUMN created_by SET NOT NULL;

-- ============================================
-- 4. Add created_by to inspection_captures
-- ============================================

ALTER TABLE inspection_captures
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Backfill: set existing captures to their project owner (via project_sections)
UPDATE inspection_captures c
SET created_by = p.owner_id
FROM inspection_project_sections ps
JOIN inspection_projects p ON p.id = ps.project_id
WHERE c.project_section_id = ps.id AND c.created_by IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE inspection_captures
  ALTER COLUMN created_by SET NOT NULL;

-- ============================================
-- 5. Add location and is_na columns (from earlier session)
-- ============================================

ALTER TABLE inspection_findings
  ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT '';

ALTER TABLE inspection_project_sections
  ADD COLUMN IF NOT EXISTS is_na BOOLEAN NOT NULL DEFAULT false;

-- ============================================
-- 6. Helper function for access checks
-- ============================================

CREATE OR REPLACE FUNCTION user_can_access_project(p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check ownership first (fast path)
  IF EXISTS (
    SELECT 1 FROM inspection_projects
    WHERE id = p_project_id AND owner_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;
  -- Check share
  RETURN EXISTS (
    SELECT 1 FROM inspection_project_shares
    WHERE project_id = p_project_id AND shared_with_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 7. Updated RLS Policies
-- ============================================

-- Drop old owner-only policies
DROP POLICY IF EXISTS "inspection_projects_owner" ON inspection_projects;
DROP POLICY IF EXISTS "inspection_project_sections_owner" ON inspection_project_sections;
DROP POLICY IF EXISTS "inspection_findings_owner" ON inspection_findings;
DROP POLICY IF EXISTS "inspection_units_owner" ON inspection_units;
DROP POLICY IF EXISTS "inspection_captures_owner" ON inspection_captures;

-- === Projects ===
-- Owner: full access
CREATE POLICY "inspection_projects_owner_all" ON inspection_projects
  FOR ALL TO authenticated
  USING (owner_id = auth.uid());

-- Shared users: read only
CREATE POLICY "inspection_projects_shared_read" ON inspection_projects
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT project_id FROM inspection_project_shares WHERE shared_with_user_id = auth.uid())
  );

-- === Project Sections ===
-- Anyone with access can read and modify sections
CREATE POLICY "inspection_project_sections_access" ON inspection_project_sections
  FOR ALL TO authenticated
  USING (user_can_access_project(project_id));

-- === Findings ===
-- SELECT: anyone with access
CREATE POLICY "inspection_findings_select" ON inspection_findings
  FOR SELECT TO authenticated
  USING (user_can_access_project(project_id));

-- INSERT: anyone with access, must set created_by to self
CREATE POLICY "inspection_findings_insert" ON inspection_findings
  FOR INSERT TO authenticated
  WITH CHECK (user_can_access_project(project_id) AND created_by = auth.uid());

-- UPDATE: owner can update any, collaborator can update own
CREATE POLICY "inspection_findings_update" ON inspection_findings
  FOR UPDATE TO authenticated
  USING (
    project_id IN (SELECT id FROM inspection_projects WHERE owner_id = auth.uid())
    OR created_by = auth.uid()
  );

-- DELETE: owner can delete any, collaborator can delete own
CREATE POLICY "inspection_findings_delete" ON inspection_findings
  FOR DELETE TO authenticated
  USING (
    project_id IN (SELECT id FROM inspection_projects WHERE owner_id = auth.uid())
    OR created_by = auth.uid()
  );

-- === Units ===
-- Anyone with access gets full unit management
CREATE POLICY "inspection_units_access" ON inspection_units
  FOR ALL TO authenticated
  USING (user_can_access_project(project_id));

-- === Captures ===
-- SELECT: anyone with access
CREATE POLICY "inspection_captures_select" ON inspection_captures
  FOR SELECT TO authenticated
  USING (
    project_section_id IN (
      SELECT id FROM inspection_project_sections
      WHERE user_can_access_project(project_id)
    )
  );

-- INSERT: anyone with access, must set created_by to self
CREATE POLICY "inspection_captures_insert" ON inspection_captures
  FOR INSERT TO authenticated
  WITH CHECK (
    project_section_id IN (
      SELECT id FROM inspection_project_sections
      WHERE user_can_access_project(project_id)
    )
    AND created_by = auth.uid()
  );

-- UPDATE: owner or creator
CREATE POLICY "inspection_captures_update" ON inspection_captures
  FOR UPDATE TO authenticated
  USING (
    project_section_id IN (
      SELECT id FROM inspection_project_sections ps
      JOIN inspection_projects p ON p.id = ps.project_id
      WHERE p.owner_id = auth.uid()
    )
    OR created_by = auth.uid()
  );

-- DELETE: owner or creator
CREATE POLICY "inspection_captures_delete" ON inspection_captures
  FOR DELETE TO authenticated
  USING (
    project_section_id IN (
      SELECT id FROM inspection_project_sections ps
      JOIN inspection_projects p ON p.id = ps.project_id
      WHERE p.owner_id = auth.uid()
    )
    OR created_by = auth.uid()
  );

-- ============================================
-- 8. Performance indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_projects_owner ON inspection_projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_findings_created_by ON inspection_findings(created_by);
CREATE INDEX IF NOT EXISTS idx_captures_created_by ON inspection_captures(created_by);
