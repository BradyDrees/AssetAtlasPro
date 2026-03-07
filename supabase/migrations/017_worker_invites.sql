-- Migration 017: Worker Invites — invite flow for adding workers to vendor orgs
-- Run this in Supabase SQL Editor AFTER migration 016

-- ============================================
-- vendor_worker_invites
-- ============================================
CREATE TABLE vendor_worker_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_org_id UUID NOT NULL REFERENCES vendor_organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'tech' CHECK (role IN ('admin','office_manager','tech')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invite_token_hash TEXT NOT NULL,
  invite_expires_at TIMESTAMPTZ NOT NULL,
  invite_consumed BOOLEAN DEFAULT false,
  consumed_by UUID REFERENCES auth.users(id),
  consumed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_vwi_org ON vendor_worker_invites(vendor_org_id);
CREATE INDEX idx_vwi_token ON vendor_worker_invites(invite_token_hash);

-- Partial unique: one active invite per email per org
CREATE UNIQUE INDEX idx_vwi_unique_pending
  ON vendor_worker_invites(vendor_org_id, lower(email))
  WHERE invite_consumed = false AND revoked_at IS NULL;

-- ============================================
-- RLS
-- ============================================
ALTER TABLE vendor_worker_invites ENABLE ROW LEVEL SECURITY;

-- SELECT: org members can view their org's invites
CREATE POLICY vwi_select ON vendor_worker_invites FOR SELECT
  USING (vendor_org_id IN (SELECT get_my_vendor_org_ids()));

-- INSERT: only owner/admin in the org
CREATE POLICY vwi_insert ON vendor_worker_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vendor_users vu
      WHERE vu.user_id = auth.uid()
        AND vu.vendor_org_id = vendor_worker_invites.vendor_org_id
        AND vu.role IN ('owner', 'admin')
        AND vu.is_active = true
    )
  );

-- UPDATE: only owner/admin in the org (for revoke)
CREATE POLICY vwi_update ON vendor_worker_invites FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM vendor_users vu
      WHERE vu.user_id = auth.uid()
        AND vu.vendor_org_id = vendor_worker_invites.vendor_org_id
        AND vu.role IN ('owner', 'admin')
        AND vu.is_active = true
    )
  );

-- No DELETE policy — use revoke instead

-- ============================================
-- RPC: lookup_worker_invite (SECURITY DEFINER)
-- Minimal exposure — just enough to render the accept page
-- ============================================
CREATE OR REPLACE FUNCTION lookup_worker_invite(p_token_hash TEXT)
RETURNS TABLE (
  invite_id UUID,
  email TEXT,
  role TEXT,
  invite_expires_at TIMESTAMPTZ,
  invite_consumed BOOLEAN,
  revoked_at TIMESTAMPTZ,
  org_name TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT
    wi.id AS invite_id,
    wi.email,
    wi.role,
    wi.invite_expires_at,
    wi.invite_consumed,
    wi.revoked_at,
    vo.name AS org_name
  FROM public.vendor_worker_invites wi
  JOIN public.vendor_organizations vo ON vo.id = wi.vendor_org_id
  WHERE wi.invite_token_hash = p_token_hash
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION lookup_worker_invite(TEXT) TO authenticated;

-- ============================================
-- RPC: accept_worker_invite (SECURITY DEFINER)
-- Creates vendor_users + user_roles rows, verifies email match
-- ============================================
CREATE OR REPLACE FUNCTION accept_worker_invite(p_token_hash TEXT, p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invite RECORD;
  v_auth_email TEXT;
  v_vu_id UUID;
BEGIN
  -- 1. Find and lock the invite
  SELECT * INTO v_invite
  FROM public.vendor_worker_invites
  WHERE invite_token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_token';
  END IF;

  -- 2. Validate invite state
  IF v_invite.invite_consumed THEN
    RAISE EXCEPTION 'already_consumed';
  END IF;

  IF v_invite.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'invite_revoked';
  END IF;

  IF v_invite.invite_expires_at <= NOW() THEN
    RAISE EXCEPTION 'invite_expired';
  END IF;

  -- 3. Email verification: fetch auth email and compare
  SELECT email INTO v_auth_email
  FROM auth.users
  WHERE id = p_user_id;

  IF v_auth_email IS NULL THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  IF lower(trim(v_auth_email)) != lower(trim(v_invite.email)) THEN
    RAISE EXCEPTION 'email_mismatch';
  END IF;

  -- 4. Upsert vendor_users row
  INSERT INTO public.vendor_users (user_id, vendor_org_id, role, email, is_active)
  VALUES (p_user_id, v_invite.vendor_org_id, v_invite.role, lower(trim(v_invite.email)), true)
  ON CONFLICT (user_id, vendor_org_id)
  DO UPDATE SET role = v_invite.role, is_active = true, email = lower(trim(v_invite.email))
  RETURNING id INTO v_vu_id;

  -- 5. Upsert user_roles entry
  INSERT INTO public.user_roles (user_id, role, org_id, org_type, is_active)
  VALUES (p_user_id, 'vendor', v_invite.vendor_org_id, 'vendor_org', true)
  ON CONFLICT DO NOTHING;

  -- 6. Mark invite consumed
  UPDATE public.vendor_worker_invites
  SET invite_consumed = true,
      consumed_by = p_user_id,
      consumed_at = NOW()
  WHERE id = v_invite.id;

  RETURN v_vu_id;
END;
$$;

GRANT EXECUTE ON FUNCTION accept_worker_invite(TEXT, UUID) TO authenticated;
