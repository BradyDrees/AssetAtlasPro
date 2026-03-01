-- ============================================================
-- 013_atlas_home_foundation.sql
-- Atlas Home - Production-safe foundation (per-property)
-- Table: vendor_work_orders (rename deferred)
-- Pattern: TEXT + CHECK (consistent with current DB)
-- Matching: org-level (vendor_org_id)
-- ============================================================

-- 1A. profiles match weights
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS client_type TEXT
    DEFAULT 'homeowner'
    CHECK (client_type IN ('homeowner','tenant')),
  ADD COLUMN IF NOT EXISTS match_weight_proximity INT DEFAULT 20,
  ADD COLUMN IF NOT EXISTS match_weight_rating INT DEFAULT 20,
  ADD COLUMN IF NOT EXISTS match_weight_availability INT DEFAULT 20,
  ADD COLUMN IF NOT EXISTS match_weight_response INT DEFAULT 20,
  ADD COLUMN IF NOT EXISTS match_weight_price INT DEFAULT 20,
  ADD COLUMN IF NOT EXISTS match_preset TEXT
    DEFAULT 'balanced'
    CHECK (match_preset IN ('balanced','best_price','best_vendor','fastest','custom'));

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT match_weights_sum_100
    CHECK (
      match_weight_proximity
      + match_weight_rating
      + match_weight_availability
      + match_weight_response
      + match_weight_price = 100
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1B. subscriptions (per property)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.homeowner_properties(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('essential','standard','premium')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','paused','cancelled','past_due')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  monthly_amount NUMERIC(10,2) NOT NULL,
  pool_deposit_amount NUMERIC(10,2) NOT NULL,
  platform_fee_amount NUMERIC(10,2) NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_property ON public.subscriptions(property_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY sub_owner_read ON public.subscriptions
    FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY sub_owner_update ON public.subscriptions
    FOR UPDATE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1C. maintenance_pools (per property)
CREATE TABLE IF NOT EXISTS public.maintenance_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.homeowner_properties(id) ON DELETE CASCADE,
  balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_deposited NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_spent NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_pools_user ON public.maintenance_pools(user_id);
CREATE INDEX IF NOT EXISTS idx_pools_property ON public.maintenance_pools(property_id);

ALTER TABLE public.maintenance_pools ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY pool_owner_read ON public.maintenance_pools
    FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY pool_owner_update ON public.maintenance_pools
    FOR UPDATE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1D. pool_transactions
CREATE TABLE IF NOT EXISTS public.pool_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES public.maintenance_pools(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit','withdrawal','refund')),
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  reference_type TEXT CHECK (reference_type IN ('subscription','work_order','project','manual')),
  reference_id UUID,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pool_tx_pool ON public.pool_transactions(pool_id, created_at);

ALTER TABLE public.pool_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY pool_tx_owner_read ON public.pool_transactions
    FOR SELECT USING (
      pool_id IN (SELECT id FROM public.maintenance_pools WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1E. projects (per property)
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.homeowner_properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending_approval','active','paused','complete','cancelled')),
  template_name TEXT,
  total_trades INT NOT NULL DEFAULT 0,
  completed_trades INT NOT NULL DEFAULT 0,
  estimated_duration_days INT,
  estimated_cost_low NUMERIC(10,2),
  estimated_cost_high NUMERIC(10,2),
  actual_cost NUMERIC(10,2) DEFAULT 0,
  coordination_fee_pct NUMERIC(6,2) DEFAULT 10.00,
  per_wo_fee_pct NUMERIC(6,2) DEFAULT 5.00,
  match_weight_proximity INT,
  match_weight_rating INT,
  match_weight_availability INT,
  match_weight_response INT,
  match_weight_price INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_homeowner ON public.projects(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_projects_property ON public.projects(property_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY project_homeowner_all ON public.projects
    FOR ALL USING (homeowner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1F. project_templates + seed
CREATE TABLE IF NOT EXISTS public.project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  trades JSONB NOT NULL DEFAULT '[]',
  avg_duration_days INT,
  avg_cost_low NUMERIC(10,2),
  avg_cost_high NUMERIC(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY templates_public_read ON public.project_templates
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed 6 templates (upsert by name - safe to re-run)
INSERT INTO public.project_templates (name, display_name, description, trades, avg_duration_days, avg_cost_low, avg_cost_high)
VALUES
('bathroom_remodel', 'Bathroom Remodel', 'Full bathroom renovation including plumbing, electrical, tile, and paint',
 '[{"order":1,"trade":"demolition","scope":"Remove existing fixtures, tile, and drywall as needed","depends_on":[]},{"order":2,"trade":"plumbing","scope":"Rough-in plumbing, relocate fixtures if needed","depends_on":[1]},{"order":3,"trade":"electrical","scope":"Update wiring, install vent fan, GFCI outlets","depends_on":[1]},{"order":4,"trade":"drywall","scope":"Patch and repair drywall after rough-in","depends_on":[2,3]},{"order":5,"trade":"tile_flooring","scope":"Install floor and wall tile","depends_on":[4]},{"order":6,"trade":"painting","scope":"Prime and paint walls and ceiling","depends_on":[5]},{"order":7,"trade":"plumbing","scope":"Install fixtures - toilet, vanity, faucet, shower trim","depends_on":[5]},{"order":8,"trade":"cleaning","scope":"Final construction cleanup","depends_on":[6,7]}]'::jsonb,
 21, 8000.00, 18000.00),
('kitchen_reno', 'Kitchen Renovation', 'Kitchen remodel with cabinet, countertop, and appliance work',
 '[{"order":1,"trade":"demolition","scope":"Remove cabinets, countertops, backsplash","depends_on":[]},{"order":2,"trade":"plumbing","scope":"Rough-in for sink relocation, dishwasher","depends_on":[1]},{"order":3,"trade":"electrical","scope":"Update circuits, add outlets, under-cabinet lighting","depends_on":[1]},{"order":4,"trade":"drywall","scope":"Patch walls after rough-in","depends_on":[2,3]},{"order":5,"trade":"tile_flooring","scope":"Install flooring","depends_on":[4]},{"order":6,"trade":"carpentry","scope":"Install cabinets","depends_on":[5]},{"order":7,"trade":"concrete","scope":"Template and install countertops","depends_on":[6]},{"order":8,"trade":"tile_flooring","scope":"Install backsplash","depends_on":[7]},{"order":9,"trade":"painting","scope":"Paint walls and trim","depends_on":[8]},{"order":10,"trade":"appliance_install","scope":"Install and connect all appliances","depends_on":[7]},{"order":11,"trade":"cleaning","scope":"Final cleanup","depends_on":[9,10]}]'::jsonb,
 35, 15000.00, 40000.00),
('deck_build', 'Deck / Patio Build', 'New deck or patio construction',
 '[{"order":1,"trade":"concrete","scope":"Excavation and footings","depends_on":[]},{"order":2,"trade":"carpentry","scope":"Framing and structural","depends_on":[1]},{"order":3,"trade":"electrical","scope":"Outdoor electrical, lighting, outlets","depends_on":[2]},{"order":4,"trade":"carpentry","scope":"Decking, railings, stairs, finish carpentry","depends_on":[2]},{"order":5,"trade":"painting","scope":"Stain or seal","depends_on":[4]},{"order":6,"trade":"landscaping","scope":"Grade restoration and landscaping","depends_on":[5]}]'::jsonb,
 14, 5000.00, 20000.00),
('basement_finish', 'Basement Finishing', 'Finish an unfinished basement',
 '[{"order":1,"trade":"concrete","scope":"Waterproofing and moisture barrier","depends_on":[]},{"order":2,"trade":"carpentry","scope":"Framing walls and soffits","depends_on":[1]},{"order":3,"trade":"plumbing","scope":"Rough-in bathroom if included","depends_on":[2]},{"order":4,"trade":"electrical","scope":"Wiring, outlets, lighting, panel work","depends_on":[2]},{"order":5,"trade":"hvac","scope":"Ductwork extension and vents","depends_on":[2]},{"order":6,"trade":"drywall","scope":"Insulation and drywall","depends_on":[3,4,5]},{"order":7,"trade":"tile_flooring","scope":"Flooring installation","depends_on":[6]},{"order":8,"trade":"painting","scope":"Paint walls, ceiling, trim","depends_on":[6]},{"order":9,"trade":"carpentry","scope":"Trim, doors, finish carpentry","depends_on":[7,8]},{"order":10,"trade":"cleaning","scope":"Final cleanup","depends_on":[9]}]'::jsonb,
 28, 20000.00, 50000.00),
('exterior_refresh', 'Exterior Refresh', 'Exterior siding, paint, windows, and curb appeal',
 '[{"order":1,"trade":"cleaning","scope":"Pressure wash exterior surfaces","depends_on":[]},{"order":2,"trade":"carpentry","scope":"Siding repair and replacement","depends_on":[1]},{"order":3,"trade":"windows_doors","scope":"Window and door replacement","depends_on":[1]},{"order":4,"trade":"painting","scope":"Exterior paint - body, trim, accents","depends_on":[2,3]},{"order":5,"trade":"landscaping","scope":"Landscaping and curb appeal","depends_on":[4]},{"order":6,"trade":"plumbing","scope":"Gutter and drainage work","depends_on":[4]}]'::jsonb,
 14, 8000.00, 25000.00),
('whole_home_systems', 'Whole-Home Systems Upgrade', 'Major systems replacement - HVAC, electrical, plumbing',
 '[{"order":1,"trade":"hvac","scope":"HVAC system replacement","depends_on":[]},{"order":2,"trade":"electrical","scope":"Electrical panel upgrade and rewiring","depends_on":[]},{"order":3,"trade":"plumbing","scope":"Repipe and water heater replacement","depends_on":[]},{"order":4,"trade":"drywall","scope":"Drywall patch and repair at all access points","depends_on":[1,2,3]},{"order":5,"trade":"painting","scope":"Paint touch-up at all affected areas","depends_on":[4]}]'::jsonb,
 21, 15000.00, 45000.00)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  trades = EXCLUDED.trades,
  avg_duration_days = EXCLUDED.avg_duration_days,
  avg_cost_low = EXCLUDED.avg_cost_low,
  avg_cost_high = EXCLUDED.avg_cost_high;

-- 1G. project_threads + project_messages
CREATE TABLE IF NOT EXISTS public.project_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id)
);

CREATE TABLE IF NOT EXISTS public.project_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.project_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('homeowner','vendor','pm')),
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_threads_project ON public.project_threads(project_id);
CREATE INDEX IF NOT EXISTS idx_project_messages_thread ON public.project_messages(thread_id, created_at);

ALTER TABLE public.project_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY project_thread_homeowner_read ON public.project_threads
    FOR SELECT USING (
      project_id IN (SELECT id FROM public.projects WHERE homeowner_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY project_thread_homeowner_insert ON public.project_threads
    FOR INSERT WITH CHECK (
      project_id IN (SELECT id FROM public.projects WHERE homeowner_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY project_messages_homeowner_select ON public.project_messages
    FOR SELECT USING (
      thread_id IN (
        SELECT t.id FROM public.project_threads t
        JOIN public.projects p ON p.id = t.project_id
        WHERE p.homeowner_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY project_messages_homeowner_insert ON public.project_messages
    FOR INSERT WITH CHECK (
      thread_id IN (
        SELECT t.id FROM public.project_threads t
        JOIN public.projects p ON p.id = t.project_id
        WHERE p.homeowner_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY project_messages_homeowner_update ON public.project_messages
    FOR UPDATE USING (
      thread_id IN (
        SELECT t.id FROM public.project_threads t
        JOIN public.projects p ON p.id = t.project_id
        WHERE p.homeowner_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY project_messages_homeowner_delete ON public.project_messages
    FOR DELETE USING (
      thread_id IN (
        SELECT t.id FROM public.project_threads t
        JOIN public.projects p ON p.id = t.project_id
        WHERE p.homeowner_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- NOTE: project_messages_vendor_read policy moved after 1H (needs wo.project_id column)

-- 1H. Extend vendor_work_orders
-- ALREADY EXIST from migration 003/012: trade, source_type, urgency, warranty_expires_at,
-- homeowner_id, homeowner_property_id, vendor_selection_mode
-- Only add NEW columns here.
ALTER TABLE public.vendor_work_orders
  ADD COLUMN IF NOT EXISTS request_estimate BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id),
  ADD COLUMN IF NOT EXISTS sequence_order INT,
  ADD COLUMN IF NOT EXISTS depends_on INT[] DEFAULT '{}'::int[],
  ADD COLUMN IF NOT EXISTS match_weight_proximity INT,
  ADD COLUMN IF NOT EXISTS match_weight_rating INT,
  ADD COLUMN IF NOT EXISTS match_weight_availability INT,
  ADD COLUMN IF NOT EXISTS match_weight_response INT,
  ADD COLUMN IF NOT EXISTS match_weight_price INT,
  ADD COLUMN IF NOT EXISTS platform_fee_pct NUMERIC(6,2) DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS platform_fee_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS vendor_payout_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS pool_amount_used NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS card_amount_charged NUMERIC(10,2);

-- Extend status CHECK to include home-flow statuses
-- Drop ALL check constraints on status column (original + ours), then re-create
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.vendor_work_orders'::regclass
      AND contype = 'c'
      AND (pg_get_constraintdef(oid) ILIKE '%status%'
           AND pg_get_constraintdef(oid) NOT ILIKE '%source_type%')
  LOOP
    EXECUTE format('ALTER TABLE public.vendor_work_orders DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.vendor_work_orders ADD CONSTRAINT vendor_work_orders_status_check
  CHECK (status IN (
    'assigned','accepted','scheduled','en_route','on_site','in_progress',
    'completed','invoiced','paid','declined','on_hold',
    'open','matching','no_match','done_pending_approval'
  ));

-- Extend source_type CHECK to include project_trade
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.vendor_work_orders'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%source_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.vendor_work_orders DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.vendor_work_orders ADD CONSTRAINT vendor_work_orders_source_type_check
  CHECK (source_type IN ('pm_routed','client_request','inspection_finding','unit_turn_task','project_trade'));

CREATE INDEX IF NOT EXISTS idx_vwo_project ON public.vendor_work_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_vwo_homeowner ON public.vendor_work_orders(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_vwo_vendor_org ON public.vendor_work_orders(vendor_org_id);
CREATE INDEX IF NOT EXISTS idx_vwo_status ON public.vendor_work_orders(status);

-- 1H-b. project_messages vendor read (deferred from 1G — needs wo.project_id)
DO $$ BEGIN
  CREATE POLICY project_messages_vendor_read ON public.project_messages
    FOR SELECT USING (
      thread_id IN (
        SELECT t.id
        FROM public.project_threads t
        JOIN public.projects p ON p.id = t.project_id
        JOIN public.vendor_work_orders wo ON wo.project_id = p.id
        WHERE wo.vendor_org_id IN (
          SELECT vendor_org_id FROM public.vendor_users WHERE user_id = auth.uid() AND is_active = true
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1I. vendor_match_attempts
CREATE TABLE IF NOT EXISTS public.vendor_match_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.vendor_work_orders(id) ON DELETE CASCADE,
  vendor_org_id UUID NOT NULL REFERENCES public.vendor_organizations(id) ON DELETE CASCADE,
  rank INT NOT NULL,
  score NUMERIC(6,2) NOT NULL DEFAULT 0,
  score_breakdown JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','notified','accepted','declined','timeout','skipped')),
  notified_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  response_deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_attempts_wo ON public.vendor_match_attempts(work_order_id);
CREATE INDEX IF NOT EXISTS idx_match_attempts_vendor_status ON public.vendor_match_attempts(vendor_org_id, status);
CREATE INDEX IF NOT EXISTS idx_match_attempts_status_deadline ON public.vendor_match_attempts(status, response_deadline);

ALTER TABLE public.vendor_match_attempts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY match_vendor_read ON public.vendor_match_attempts
    FOR SELECT USING (
      vendor_org_id IN (SELECT vendor_org_id FROM public.vendor_users WHERE user_id = auth.uid() AND is_active = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY match_vendor_update ON public.vendor_match_attempts
    FOR UPDATE USING (
      vendor_org_id IN (SELECT vendor_org_id FROM public.vendor_users WHERE user_id = auth.uid() AND is_active = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY match_homeowner_read ON public.vendor_match_attempts
    FOR SELECT USING (
      work_order_id IN (SELECT id FROM public.vendor_work_orders WHERE homeowner_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1J. vendor_work_orders RLS (MVP completeness)
ALTER TABLE public.vendor_work_orders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY vwo_homeowner_select ON public.vendor_work_orders
    FOR SELECT USING (homeowner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY vwo_homeowner_insert ON public.vendor_work_orders
    FOR INSERT WITH CHECK (homeowner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY vwo_homeowner_update ON public.vendor_work_orders
    FOR UPDATE USING (homeowner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY vwo_vendor_org_select ON public.vendor_work_orders
    FOR SELECT USING (
      vendor_org_id IN (SELECT vendor_org_id FROM public.vendor_users WHERE user_id = auth.uid() AND is_active = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY vwo_vendor_org_update ON public.vendor_work_orders
    FOR UPDATE USING (
      vendor_org_id IN (SELECT vendor_org_id FROM public.vendor_users WHERE user_id = auth.uid() AND is_active = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1K. Realtime publication (safe)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='vendor_notifications')
  THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.vendor_notifications;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- 1L. Performance indexes
CREATE INDEX IF NOT EXISTS idx_vendor_orgs_trades_gin ON public.vendor_organizations USING GIN (trades);

CREATE INDEX IF NOT EXISTS idx_vendor_notifications_user_created
  ON public.vendor_notifications(user_id, created_at DESC);
