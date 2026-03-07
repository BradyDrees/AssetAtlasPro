-- 021: Vendor Integrations — QuickBooks / Xero / Stripe Connect
-- Stores OAuth tokens and sync state for accounting integrations.

CREATE TABLE IF NOT EXISTS vendor_integrations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_org_id UUID NOT NULL REFERENCES vendor_organizations(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL CHECK (provider IN ('quickbooks','xero','stripe_connect')),
  access_token  TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  realm_id      TEXT, -- QBO company ID
  is_active     BOOLEAN NOT NULL DEFAULT true,
  last_sync_at  TIMESTAMPTZ,
  sync_error    TEXT,
  settings      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (vendor_org_id, provider)
);

CREATE TABLE IF NOT EXISTS vendor_integration_sync_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES vendor_integrations(id) ON DELETE CASCADE,
  direction      TEXT NOT NULL DEFAULT 'push' CHECK (direction IN ('push','pull')),
  entity_type    TEXT NOT NULL, -- 'invoice', 'expense', 'payment'
  entity_id      TEXT NOT NULL,
  external_id    TEXT, -- QBO ID
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','error','skipped')),
  error_message  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vi_vendor_org
  ON vendor_integrations(vendor_org_id);

CREATE INDEX IF NOT EXISTS idx_visl_integration
  ON vendor_integration_sync_log(integration_id);

CREATE INDEX IF NOT EXISTS idx_visl_entity
  ON vendor_integration_sync_log(entity_type, entity_id);

-- RLS
ALTER TABLE vendor_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_integration_sync_log ENABLE ROW LEVEL SECURITY;

-- Vendor org members can manage their integrations
CREATE POLICY "Vendor org members manage integrations"
  ON vendor_integrations
  FOR ALL
  USING (
    vendor_org_id IN (
      SELECT vendor_org_id FROM vendor_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    vendor_org_id IN (
      SELECT vendor_org_id FROM vendor_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Vendor org members view sync log"
  ON vendor_integration_sync_log
  FOR SELECT
  USING (
    integration_id IN (
      SELECT id FROM vendor_integrations
      WHERE vendor_org_id IN (
        SELECT vendor_org_id FROM vendor_users
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );
