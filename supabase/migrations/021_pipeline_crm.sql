-- Migration 021: Pipeline/CRM — lead management columns + client notes table
-- Run in Supabase SQL editor

-- 1. Add pipeline columns to vendor_clients
ALTER TABLE vendor_clients
  ADD COLUMN IF NOT EXISTS lead_status TEXT DEFAULT 'new'
    CHECK (lead_status IN ('new','contacted','quoted','won','lost','active')),
  ADD COLUMN IF NOT EXISTS lead_source TEXT,
  ADD COLUMN IF NOT EXISTS next_followup_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS lifetime_revenue NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_job_at TIMESTAMPTZ;

-- 2. Client notes / activity timeline
CREATE TABLE IF NOT EXISTS vendor_client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_org_id UUID NOT NULL REFERENCES vendor_organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES vendor_clients(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  is_system BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_notes_client ON vendor_client_notes(client_id);

-- 3. RLS for client notes
ALTER TABLE vendor_client_notes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'client_notes_vendor_read' AND tablename = 'vendor_client_notes') THEN
    CREATE POLICY client_notes_vendor_read ON vendor_client_notes
      FOR SELECT USING (vendor_org_id IN (
        SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()
      ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'client_notes_vendor_write' AND tablename = 'vendor_client_notes') THEN
    CREATE POLICY client_notes_vendor_write ON vendor_client_notes
      FOR INSERT WITH CHECK (vendor_org_id IN (
        SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()
      ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'client_notes_vendor_delete' AND tablename = 'vendor_client_notes') THEN
    CREATE POLICY client_notes_vendor_delete ON vendor_client_notes
      FOR DELETE USING (vendor_org_id IN (
        SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()
      ));
  END IF;
END $$;
