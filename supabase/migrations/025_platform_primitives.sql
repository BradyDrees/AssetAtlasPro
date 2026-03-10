-- Migration 025: Platform Primitives
-- Domain events, notification delivery log, maintenance alerts,
-- source tracking, payment tokens, signatures, lead source, on_hold tracking.
-- Run in Supabase SQL editor BEFORE Batch 0 code deployment.

-- ═══════════════════════════════════════════════════════════════════════════════
-- A. Domain Events Table
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS domain_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  actor_id UUID,
  actor_type TEXT CHECK (actor_type IN ('user','system','cron','webhook')),
  origin_module TEXT CHECK (origin_module IN ('operate','home','acquire','vendor','public','system')),
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_domain_events_entity ON domain_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_domain_events_type ON domain_events(event_type);
CREATE INDEX IF NOT EXISTS idx_domain_events_created ON domain_events(created_at DESC);

-- RLS: service-role for writes, scoped reads
ALTER TABLE domain_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'domain_events_service_insert' AND tablename = 'domain_events') THEN
    CREATE POLICY domain_events_service_insert ON domain_events
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'domain_events_read' AND tablename = 'domain_events') THEN
    CREATE POLICY domain_events_read ON domain_events
      FOR SELECT USING (true);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- B. Source Tracking on vendor_work_orders
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop existing constraint first so we can widen it
ALTER TABLE vendor_work_orders
  DROP CONSTRAINT IF EXISTS vendor_work_orders_source_type_check;

ALTER TABLE vendor_work_orders
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_id TEXT,
  ADD COLUMN IF NOT EXISTS source_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS created_via TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS origin_module TEXT,
  ADD COLUMN IF NOT EXISTS budget_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT 'pm_assignment',
  ADD COLUMN IF NOT EXISTS lead_source_detail TEXT,
  ADD COLUMN IF NOT EXISTS previous_status TEXT;

-- Re-add widened source_type constraint
ALTER TABLE vendor_work_orders
  ADD CONSTRAINT vendor_work_orders_source_type_check
  CHECK (source_type IS NULL OR source_type IN (
    'manual','inspection_finding','unit_turn_item','acquire_finding',
    'maintenance_alert','bid_request','pm_routed','client_request',
    'unit_turn_task','project_trade','vendor_direct','website_lead','pm'
  ));

-- created_via constraint
ALTER TABLE vendor_work_orders
  DROP CONSTRAINT IF EXISTS vendor_work_orders_created_via_check;
ALTER TABLE vendor_work_orders
  ADD CONSTRAINT vendor_work_orders_created_via_check
  CHECK (created_via IS NULL OR created_via IN ('manual','automation','cron','webhook','system'));

-- origin_module constraint
ALTER TABLE vendor_work_orders
  DROP CONSTRAINT IF EXISTS vendor_work_orders_origin_module_check;
ALTER TABLE vendor_work_orders
  ADD CONSTRAINT vendor_work_orders_origin_module_check
  CHECK (origin_module IS NULL OR origin_module IN ('operate','home','acquire','vendor','public','system'));

-- Hot-path indexes
CREATE INDEX IF NOT EXISTS idx_wo_source ON vendor_work_orders(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_wo_lead_source ON vendor_work_orders(lead_source);
CREATE INDEX IF NOT EXISTS idx_wo_origin_module ON vendor_work_orders(origin_module);

-- ═══════════════════════════════════════════════════════════════════════════════
-- C. Vendor Invoices — payment token + traceability
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE vendor_invoices
  ADD COLUMN IF NOT EXISTS payment_token UUID UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS payment_token_created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS origin_module TEXT DEFAULT 'vendor';

-- ═══════════════════════════════════════════════════════════════════════════════
-- D. Vendor Estimates — signature fields
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE vendor_estimates
  ADD COLUMN IF NOT EXISTS signature_url TEXT,
  ADD COLUMN IF NOT EXISTS signed_by TEXT,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;

-- ═══════════════════════════════════════════════════════════════════════════════
-- E. Property Onboarding link
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE homeowner_properties
  ADD COLUMN IF NOT EXISTS source_dd_project_id UUID,
  ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;

-- ═══════════════════════════════════════════════════════════════════════════════
-- F. Notification Delivery Log
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID,
  notification_type TEXT NOT NULL,
  delivery_channel TEXT NOT NULL CHECK (delivery_channel IN ('sms','email','push','in_app')),
  recipient TEXT NOT NULL,
  delivery_key TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent','failed','bounced')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_log_key ON notification_delivery_log(delivery_key);
CREATE INDEX IF NOT EXISTS idx_delivery_log_wo ON notification_delivery_log(work_order_id, notification_type, delivery_channel);

ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'delivery_log_service_insert' AND tablename = 'notification_delivery_log') THEN
    CREATE POLICY delivery_log_service_insert ON notification_delivery_log
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'delivery_log_service_select' AND tablename = 'notification_delivery_log') THEN
    CREATE POLICY delivery_log_service_select ON notification_delivery_log
      FOR SELECT USING (true);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- G. Property Maintenance Alerts
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS property_maintenance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES homeowner_properties(id) ON DELETE CASCADE,
  system_type TEXT NOT NULL,
  alert_key TEXT NOT NULL UNIQUE,
  threshold_percent INT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','dismissed','resolved')),
  source_snapshot JSONB,
  dismissed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maint_alerts_property ON property_maintenance_alerts(property_id);
CREATE INDEX IF NOT EXISTS idx_maint_alerts_status ON property_maintenance_alerts(status);
