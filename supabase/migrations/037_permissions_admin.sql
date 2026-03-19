-- ============================================
-- Migration 037: Unified Permissions & Admin System (Phase 1)
-- ============================================
-- 1. Add is_super_admin to profiles
-- 2. Expand user_roles role values for PM refinement
-- 3. Backfill existing 'pm' rows → 'pm_admin'
-- ============================================

-- 1. Add is_super_admin column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- 2. Drop old CHECK constraint on user_roles.role (if exists) and add expanded one
-- The existing constraint name may vary; use DO block for safety
DO $$
BEGIN
  -- Try to drop existing constraint (role_check or user_roles_role_check)
  BEGIN
    ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
  BEGIN
    ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS role_check;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
END $$;

-- Add new CHECK constraint allowing pm_admin, pm_manager, pm_member alongside legacy values
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('pm', 'pm_admin', 'pm_manager', 'pm_member', 'vendor', 'owner', 'tenant'));

-- 3. Backfill: existing 'pm' rows become 'pm_admin'
UPDATE user_roles SET role = 'pm_admin' WHERE role = 'pm';

-- 4. RLS: super admins bypass nothing at DB level (handled in app code).
--    No RLS changes needed — is_super_admin is read-only from app layer.

-- 5. Index for fast is_super_admin lookups (sparse — very few rows)
CREATE INDEX IF NOT EXISTS idx_profiles_super_admin
  ON profiles (id) WHERE is_super_admin = true;
