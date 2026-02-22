-- Migration 1: Roles + profiles extension + activity log
-- Run this in Supabase SQL Editor

-- ============================================
-- user_roles table
-- ============================================
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('pm','vendor','owner','tenant')),
  org_id UUID,
  org_type TEXT CHECK (org_type IN ('pm_org','vendor_org')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role, org_id)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_own" ON user_roles FOR ALL TO authenticated
  USING (user_id = auth.uid());
CREATE INDEX idx_user_roles_user ON user_roles(user_id);

-- ============================================
-- Profiles extension (add role context columns)
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_role TEXT DEFAULT 'pm';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_org_id UUID;

-- ============================================
-- Activity log for audit trail
-- ============================================
CREATE TABLE vendor_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  actor_role TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vendor_activity_log ENABLE ROW LEVEL SECURITY;

-- CORRECTION 1: Insert-only policy on table. Reads go through SECURITY DEFINER RPC.
CREATE POLICY "activity_log_insert_only" ON vendor_activity_log FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- Fallback SELECT for own actions (realtime subscriptions)
CREATE POLICY "activity_log_select_own_actions" ON vendor_activity_log FOR SELECT TO authenticated
  USING (actor_id = auth.uid());

CREATE INDEX idx_activity_log_entity ON vendor_activity_log(entity_type, entity_id, created_at DESC);

-- ============================================
-- Backfill existing users as PM
-- ============================================
INSERT INTO user_roles (user_id, role)
SELECT id, 'pm' FROM auth.users
ON CONFLICT DO NOTHING;
