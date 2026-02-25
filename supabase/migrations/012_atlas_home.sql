-- ============================================
-- Migration 012: Atlas Home — Homeowner Portal
-- ============================================
-- Run in Supabase SQL Editor AFTER migrations 001–011.
-- Creates homeowner tables: properties, preferences, ratings, disputes.
-- Extends vendor_work_orders + vendor_organizations with homeowner columns.
-- Extends vendor_chat_messages sender_role for homeowner messaging.

-- ============================================
-- homeowner_properties
-- ============================================
CREATE TABLE homeowner_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip TEXT,
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  property_type TEXT CHECK (property_type IN ('sfr','condo','townhouse','duplex')),
  year_built INT,
  sqft INT,
  beds INT,
  baths INT,
  hvac_model TEXT,
  hvac_age INT,
  water_heater_type TEXT,
  water_heater_age INT,
  electrical_panel TEXT,
  roof_material TEXT,
  roof_age INT,
  gate_code TEXT,
  lockbox_code TEXT,
  alarm_code TEXT,
  pet_warnings TEXT,
  parking_instructions TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_homeowner_properties_user ON homeowner_properties(user_id);

ALTER TABLE homeowner_properties ENABLE ROW LEVEL SECURITY;

-- Homeowner can CRUD their own properties
CREATE POLICY "homeowner_properties_owner" ON homeowner_properties
  FOR ALL USING (user_id = auth.uid());

-- Vendors can read properties for work orders assigned to them
CREATE POLICY "homeowner_properties_vendor_read" ON homeowner_properties
  FOR SELECT USING (
    id IN (
      SELECT homeowner_property_id FROM vendor_work_orders
      WHERE vendor_org_id IN (
        SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()
      )
      AND homeowner_property_id IS NOT NULL
    )
  );

-- ============================================
-- homeowner_vendor_preferences
-- ============================================
CREATE TABLE homeowner_vendor_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_org_id UUID NOT NULL REFERENCES vendor_organizations(id) ON DELETE CASCADE,
  trade TEXT,
  preference_type TEXT NOT NULL CHECK (preference_type IN ('preferred','saved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, vendor_org_id, preference_type)
);

CREATE INDEX idx_homeowner_prefs_user ON homeowner_vendor_preferences(user_id);
CREATE INDEX idx_homeowner_prefs_vendor ON homeowner_vendor_preferences(vendor_org_id);

ALTER TABLE homeowner_vendor_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "homeowner_prefs_owner" ON homeowner_vendor_preferences
  FOR ALL USING (user_id = auth.uid());

-- ============================================
-- vendor_ratings
-- ============================================
CREATE TABLE vendor_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES vendor_work_orders(id) ON DELETE CASCADE,
  homeowner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_org_id UUID NOT NULL REFERENCES vendor_organizations(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (work_order_id, homeowner_id)
);

CREATE INDEX idx_vendor_ratings_org ON vendor_ratings(vendor_org_id);
CREATE INDEX idx_vendor_ratings_homeowner ON vendor_ratings(homeowner_id);

ALTER TABLE vendor_ratings ENABLE ROW LEVEL SECURITY;

-- Homeowner can create ratings on their completed WOs
CREATE POLICY "vendor_ratings_homeowner_insert" ON vendor_ratings
  FOR INSERT WITH CHECK (
    homeowner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM vendor_work_orders
      WHERE id = work_order_id
      AND homeowner_id = auth.uid()
      AND status IN ('completed', 'invoiced', 'paid')
    )
  );

-- Public read for marketplace display
CREATE POLICY "vendor_ratings_public_read" ON vendor_ratings
  FOR SELECT USING (true);

-- Homeowner can update their own ratings
CREATE POLICY "vendor_ratings_homeowner_update" ON vendor_ratings
  FOR UPDATE USING (homeowner_id = auth.uid());

-- ============================================
-- homeowner_disputes
-- ============================================
CREATE TABLE homeowner_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES vendor_work_orders(id) ON DELETE CASCADE,
  homeowner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_org_id UUID NOT NULL REFERENCES vendor_organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('quality_issue','warranty_callback')),
  description TEXT NOT NULL,
  evidence_photos JSONB DEFAULT '[]'::jsonb,
  vendor_response TEXT,
  status TEXT NOT NULL DEFAULT 'opened' CHECK (status IN ('opened','vendor_responding','resolved','escalated','fixed')),
  warranty_window_days INT DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_disputes_wo ON homeowner_disputes(work_order_id);
CREATE INDEX idx_disputes_homeowner ON homeowner_disputes(homeowner_id);
CREATE INDEX idx_disputes_vendor ON homeowner_disputes(vendor_org_id);

ALTER TABLE homeowner_disputes ENABLE ROW LEVEL SECURITY;

-- Homeowner can CRUD their own disputes
CREATE POLICY "disputes_homeowner" ON homeowner_disputes
  FOR ALL USING (homeowner_id = auth.uid());

-- Vendor can read and respond to disputes on their org's WOs
CREATE POLICY "disputes_vendor_read" ON homeowner_disputes
  FOR SELECT USING (
    vendor_org_id IN (
      SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "disputes_vendor_respond" ON homeowner_disputes
  FOR UPDATE USING (
    vendor_org_id IN (
      SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- Extend vendor_work_orders for homeowner WOs
-- ============================================
ALTER TABLE vendor_work_orders
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'pm_routed' CHECK (source_type IN ('pm_routed','client_request')),
  ADD COLUMN IF NOT EXISTS homeowner_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS homeowner_property_id UUID REFERENCES homeowner_properties(id),
  ADD COLUMN IF NOT EXISTS urgency TEXT CHECK (urgency IN ('emergency','urgent','routine','whenever')),
  ADD COLUMN IF NOT EXISTS vendor_selection_mode TEXT CHECK (vendor_selection_mode IN ('auto_match','homeowner_choice','preferred_vendor')),
  ADD COLUMN IF NOT EXISTS warranty_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_wo_homeowner ON vendor_work_orders(homeowner_id) WHERE homeowner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wo_homeowner_property ON vendor_work_orders(homeowner_property_id) WHERE homeowner_property_id IS NOT NULL;

-- Homeowner can read their own WOs
CREATE POLICY "wo_homeowner_read" ON vendor_work_orders
  FOR SELECT USING (homeowner_id = auth.uid());

-- Homeowner can create WOs
CREATE POLICY "wo_homeowner_insert" ON vendor_work_orders
  FOR INSERT WITH CHECK (
    homeowner_id = auth.uid()
    AND source_type = 'client_request'
  );

-- ============================================
-- Extend vendor_organizations for marketplace
-- ============================================
ALTER TABLE vendor_organizations
  ADD COLUMN IF NOT EXISTS avg_rating DECIMAL(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_ratings INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS response_time_label TEXT CHECK (response_time_label IN ('same_day','next_day','within_48hrs')),
  ADD COLUMN IF NOT EXISTS emergency_available BOOLEAN DEFAULT false;

-- Public marketplace read for active vendor orgs
CREATE POLICY "vendor_orgs_marketplace_read" ON vendor_organizations
  FOR SELECT USING (status = 'active');

-- ============================================
-- Extend vendor_chat_messages sender_role for homeowner
-- ============================================
ALTER TABLE vendor_chat_messages
  DROP CONSTRAINT IF EXISTS vendor_chat_messages_sender_role_check;

ALTER TABLE vendor_chat_messages
  ADD CONSTRAINT vendor_chat_messages_sender_role_check
  CHECK (sender_role IN ('pm', 'vendor', 'homeowner'));

-- Homeowner can read/insert chat messages on their WOs
CREATE POLICY "chat_homeowner_read" ON vendor_chat_messages
  FOR SELECT USING (
    work_order_id IN (
      SELECT id FROM vendor_work_orders WHERE homeowner_id = auth.uid()
    )
  );

CREATE POLICY "chat_homeowner_insert" ON vendor_chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND sender_role = 'homeowner'
    AND work_order_id IN (
      SELECT id FROM vendor_work_orders WHERE homeowner_id = auth.uid()
    )
  );

-- ============================================
-- Trigger: auto-update avg_rating on vendor_organizations
-- ============================================
CREATE OR REPLACE FUNCTION update_vendor_avg_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE vendor_organizations SET
    avg_rating = COALESCE((
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM vendor_ratings
      WHERE vendor_org_id = COALESCE(NEW.vendor_org_id, OLD.vendor_org_id)
    ), 0),
    total_ratings = COALESCE((
      SELECT COUNT(*)
      FROM vendor_ratings
      WHERE vendor_org_id = COALESCE(NEW.vendor_org_id, OLD.vendor_org_id)
    ), 0)
  WHERE id = COALESCE(NEW.vendor_org_id, OLD.vendor_org_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vendor_ratings_update_avg
  AFTER INSERT OR UPDATE OR DELETE ON vendor_ratings
  FOR EACH ROW EXECUTE FUNCTION update_vendor_avg_rating();
