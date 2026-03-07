-- Migration 007: Work order photos
-- Allows homeowners (and vendors) to attach photos to work orders

CREATE TABLE IF NOT EXISTS work_order_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES vendor_work_orders(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  storage_path text NOT NULL,
  caption text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE work_order_photos ENABLE ROW LEVEL SECURITY;

-- Homeowner who created the WO can view + insert + delete their own photos
CREATE POLICY "wo_photos_homeowner_select" ON work_order_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM vendor_work_orders
      WHERE vendor_work_orders.id = work_order_photos.work_order_id
        AND vendor_work_orders.homeowner_id = auth.uid()
    )
  );

CREATE POLICY "wo_photos_homeowner_insert" ON work_order_photos
  FOR INSERT WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "wo_photos_homeowner_delete" ON work_order_photos
  FOR DELETE USING (uploaded_by = auth.uid());

-- Assigned vendor can view photos on their work orders
CREATE POLICY "wo_photos_vendor_select" ON work_order_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM vendor_work_orders
      WHERE vendor_work_orders.id = work_order_photos.work_order_id
        AND vendor_work_orders.vendor_org_id IN (
          SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid() AND is_active = true
        )
    )
  );

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_wo_photos_work_order ON work_order_photos(work_order_id);
CREATE INDEX IF NOT EXISTS idx_wo_photos_uploaded_by ON work_order_photos(uploaded_by);
