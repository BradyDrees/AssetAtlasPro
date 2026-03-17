-- Migration 036: Internal Tech Performance Ratings
-- One rating per work order (snapshot of assigned tech at rating time)

CREATE TABLE IF NOT EXISTS public.tech_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_org_id UUID NOT NULL REFERENCES vendor_organizations(id) ON DELETE CASCADE,
  tech_user_id UUID NOT NULL REFERENCES vendor_users(id) ON DELETE CASCADE,
  wo_id UUID NOT NULL REFERENCES vendor_work_orders(id) ON DELETE CASCADE,
  trade TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  notes TEXT,
  rated_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (wo_id)
);

-- Indexes
CREATE INDEX idx_tech_ratings_org ON tech_ratings(vendor_org_id);
CREATE INDEX idx_tech_ratings_tech ON tech_ratings(tech_user_id);
CREATE INDEX idx_tech_ratings_tech_trade ON tech_ratings(tech_user_id, trade);
CREATE INDEX idx_tech_ratings_org_trade ON tech_ratings(vendor_org_id, trade);

-- RLS
ALTER TABLE tech_ratings ENABLE ROW LEVEL SECURITY;

-- SELECT: active member of same vendor org
CREATE POLICY "tech_ratings_select"
  ON tech_ratings FOR SELECT
  USING (
    vendor_org_id IN (
      SELECT vendor_org_id FROM vendor_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- INSERT: active owner/admin/office_manager in same org
CREATE POLICY "tech_ratings_insert"
  ON tech_ratings FOR INSERT
  WITH CHECK (
    rated_by = auth.uid()
    AND vendor_org_id IN (
      SELECT vendor_org_id FROM vendor_users
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role IN ('owner', 'admin', 'office_manager')
    )
  );

-- UPDATE: active owner/admin/office_manager in same org
CREATE POLICY "tech_ratings_update"
  ON tech_ratings FOR UPDATE
  USING (
    vendor_org_id IN (
      SELECT vendor_org_id FROM vendor_users
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role IN ('owner', 'admin', 'office_manager')
    )
  );
