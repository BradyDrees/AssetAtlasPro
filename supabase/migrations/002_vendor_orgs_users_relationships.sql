-- Migration 2: Vendor organizations + users + PM relationships
-- Run this in Supabase SQL Editor AFTER migration 001

-- ============================================
-- vendor_organizations
-- ============================================
CREATE TABLE vendor_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  service_radius_miles INTEGER DEFAULT 25,
  max_concurrent_jobs INTEGER DEFAULT 10,
  trades TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active','suspended','inactive')),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- vendor_users (org membership)
-- ============================================
CREATE TABLE vendor_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_org_id UUID NOT NULL REFERENCES vendor_organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'tech' CHECK (role IN ('owner','admin','office_manager','tech')),
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  trades TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, vendor_org_id)
);

-- ============================================
-- vendor_pm_relationships
-- ============================================
CREATE TABLE vendor_pm_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_org_id UUID NOT NULL REFERENCES vendor_organizations(id) ON DELETE CASCADE,
  pm_user_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('pending','active','suspended','terminated')),
  invited_by TEXT CHECK (invited_by IN ('pm','vendor')),
  invite_token_hash TEXT,
  invite_expires_at TIMESTAMPTZ,
  invite_consumed BOOLEAN DEFAULT false,
  notes TEXT,
  pm_preferences JSONB DEFAULT '{}',
  payment_terms TEXT DEFAULT 'net_30',
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_org_id, pm_user_id)
);

-- ============================================
-- SECURITY DEFINER helper to avoid RLS infinite recursion
-- vendor_users policies can't subquery vendor_users (self-referencing),
-- so we use this function which bypasses RLS to get the caller's org IDs.
-- ============================================
CREATE OR REPLACE FUNCTION get_my_vendor_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT vendor_org_id FROM public.vendor_users WHERE user_id = auth.uid();
$$;

-- ============================================
-- RLS: vendor_organizations
-- CORRECTION 2: Split into explicit per-operation policies
-- ============================================
ALTER TABLE vendor_organizations ENABLE ROW LEVEL SECURITY;

-- Read: any org member (via helper function to avoid recursion)
CREATE POLICY "vendor_org_read" ON vendor_organizations FOR SELECT TO authenticated
  USING (id IN (SELECT get_my_vendor_org_ids()));

-- Insert: controlled by server action (onboarding creates org + vendor_users atomically)
-- User has no vendor_users row yet at INSERT time, so we can't check membership.
CREATE POLICY "vendor_org_insert" ON vendor_organizations FOR INSERT TO authenticated
  WITH CHECK (true);

-- Update: only owner/admin of the org
CREATE POLICY "vendor_org_update" ON vendor_organizations FOR UPDATE TO authenticated
  USING (id IN (SELECT vendor_org_id FROM public.vendor_users WHERE user_id = auth.uid() AND role IN ('owner','admin')))
  WITH CHECK (id IN (SELECT vendor_org_id FROM public.vendor_users WHERE user_id = auth.uid() AND role IN ('owner','admin')));

-- Delete: only owner
CREATE POLICY "vendor_org_delete" ON vendor_organizations FOR DELETE TO authenticated
  USING (id IN (SELECT vendor_org_id FROM public.vendor_users WHERE user_id = auth.uid() AND role = 'owner'));

-- ============================================
-- RLS: vendor_users
-- Uses get_my_vendor_org_ids() to avoid infinite recursion on self-referencing reads
-- ============================================
ALTER TABLE vendor_users ENABLE ROW LEVEL SECURITY;

-- Read own rows directly
CREATE POLICY "vendor_users_read_own" ON vendor_users FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Read teammates via helper function (no recursion)
CREATE POLICY "vendor_users_read_teammates" ON vendor_users FOR SELECT TO authenticated
  USING (vendor_org_id IN (SELECT get_my_vendor_org_ids()));

-- Write: only own rows
CREATE POLICY "vendor_users_self_write" ON vendor_users FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- RLS: vendor_pm_relationships
-- ============================================
ALTER TABLE vendor_pm_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vpr_vendor_side" ON vendor_pm_relationships FOR ALL TO authenticated
  USING (vendor_org_id IN (SELECT get_my_vendor_org_ids()));

CREATE POLICY "vpr_pm_side" ON vendor_pm_relationships FOR SELECT TO authenticated
  USING (pm_user_id = auth.uid());

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_vendor_users_user ON vendor_users(user_id);
CREATE INDEX idx_vendor_users_org ON vendor_users(vendor_org_id);
CREATE INDEX idx_vpr_vendor ON vendor_pm_relationships(vendor_org_id);
CREATE INDEX idx_vpr_pm ON vendor_pm_relationships(pm_user_id);
