-- Migration 009: Twilio Phone Masking — Business Numbers + Message Log
-- Lets vendor orgs own Twilio numbers and log all SMS/call activity

-- ─── Vendor Phone Numbers ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vendor_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_org_id UUID NOT NULL REFERENCES vendor_organizations(id) ON DELETE CASCADE,
  twilio_number TEXT NOT NULL,          -- E.164 format (+1XXXXXXXXXX)
  twilio_sid TEXT NOT NULL,             -- Twilio IncomingPhoneNumber SID
  friendly_name TEXT DEFAULT '',        -- User label (e.g. "Main Office Line")
  is_default BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Only one default per org
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_phone_default
  ON vendor_phone_numbers (vendor_org_id)
  WHERE is_default = TRUE AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_vendor_phone_org ON vendor_phone_numbers (vendor_org_id);
CREATE INDEX IF NOT EXISTS idx_vendor_phone_number ON vendor_phone_numbers (twilio_number) WHERE status = 'active';

-- RLS
ALTER TABLE vendor_phone_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendor_phone_numbers_select" ON vendor_phone_numbers
  FOR SELECT USING (
    vendor_org_id IN (
      SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "vendor_phone_numbers_insert" ON vendor_phone_numbers
  FOR INSERT WITH CHECK (
    vendor_org_id IN (
      SELECT vendor_org_id FROM vendor_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "vendor_phone_numbers_update" ON vendor_phone_numbers
  FOR UPDATE USING (
    vendor_org_id IN (
      SELECT vendor_org_id FROM vendor_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ─── Vendor Messages ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vendor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_org_id UUID NOT NULL REFERENCES vendor_organizations(id) ON DELETE CASCADE,
  work_order_id UUID REFERENCES vendor_work_orders(id) ON DELETE SET NULL,
  phone_number_id UUID REFERENCES vendor_phone_numbers(id) ON DELETE SET NULL,
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- null for inbound
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT NOT NULL DEFAULT 'sms' CHECK (message_type IN ('sms', 'call')),
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  body TEXT,                            -- null for calls
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'received', 'queued')),
  twilio_sid TEXT,                      -- Twilio Message/Call SID
  duration_seconds INTEGER,             -- for calls
  read_at TIMESTAMPTZ,                  -- null = unread (for inbound)
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_messages_org ON vendor_messages (vendor_org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_messages_wo ON vendor_messages (work_order_id, created_at ASC) WHERE work_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_messages_unread ON vendor_messages (vendor_org_id)
  WHERE direction = 'inbound' AND read_at IS NULL;

-- RLS
ALTER TABLE vendor_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendor_messages_select" ON vendor_messages
  FOR SELECT USING (
    vendor_org_id IN (
      SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "vendor_messages_insert" ON vendor_messages
  FOR INSERT WITH CHECK (
    vendor_org_id IN (
      SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "vendor_messages_update" ON vendor_messages
  FOR UPDATE USING (
    vendor_org_id IN (
      SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()
    )
  );

-- ─── Updated_at trigger ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_vendor_phone_numbers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vendor_phone_numbers_updated_at
  BEFORE UPDATE ON vendor_phone_numbers
  FOR EACH ROW EXECUTE FUNCTION update_vendor_phone_numbers_updated_at();
