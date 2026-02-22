-- ============================================
-- Migration 5: Invoice tables + RLS
-- ============================================

-- Invoices
CREATE TABLE vendor_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_org_id UUID REFERENCES vendor_organizations(id),
  pm_user_id UUID REFERENCES auth.users(id),
  work_order_id UUID REFERENCES vendor_work_orders(id),
  estimate_id UUID REFERENCES vendor_estimates(id),
  invoice_number TEXT,
  property_name TEXT,
  unit_info TEXT,
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_pct DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','submitted','pm_approved','processing','paid','disputed')),
  submitted_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  due_date DATE,
  notes TEXT,
  dispute_reason TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoice line items
CREATE TABLE vendor_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES vendor_invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  item_type TEXT DEFAULT 'labor' CHECK (item_type IN ('labor','material','other')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: two-sided (vendor org + PM)
ALTER TABLE vendor_invoices ENABLE ROW LEVEL SECURITY;

-- Vendor org members read/update
CREATE POLICY "invoice_vendor_read" ON vendor_invoices FOR SELECT TO authenticated
  USING (vendor_org_id IN (SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()));
CREATE POLICY "invoice_vendor_insert" ON vendor_invoices FOR INSERT TO authenticated
  WITH CHECK (vendor_org_id IN (SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()));
CREATE POLICY "invoice_vendor_update" ON vendor_invoices FOR UPDATE TO authenticated
  USING (vendor_org_id IN (SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()));
CREATE POLICY "invoice_vendor_delete" ON vendor_invoices FOR DELETE TO authenticated
  USING (vendor_org_id IN (SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()) AND status = 'draft');

-- PM can read and update (approve/pay/dispute)
CREATE POLICY "invoice_pm_read" ON vendor_invoices FOR SELECT TO authenticated
  USING (pm_user_id = auth.uid());
CREATE POLICY "invoice_pm_update" ON vendor_invoices FOR UPDATE TO authenticated
  USING (pm_user_id = auth.uid());

-- Invoice items: access via invoice
ALTER TABLE vendor_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv_items_vendor_read" ON vendor_invoice_items FOR SELECT TO authenticated
  USING (invoice_id IN (
    SELECT id FROM vendor_invoices WHERE vendor_org_id IN (
      SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()
    )
  ));
CREATE POLICY "inv_items_vendor_write" ON vendor_invoice_items FOR ALL TO authenticated
  USING (invoice_id IN (
    SELECT id FROM vendor_invoices WHERE vendor_org_id IN (
      SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()
    )
  ));
CREATE POLICY "inv_items_pm_read" ON vendor_invoice_items FOR SELECT TO authenticated
  USING (invoice_id IN (
    SELECT id FROM vendor_invoices WHERE pm_user_id = auth.uid()
  ));

-- Indexes
CREATE INDEX idx_invoices_vendor_org ON vendor_invoices(vendor_org_id);
CREATE INDEX idx_invoices_pm ON vendor_invoices(pm_user_id);
CREATE INDEX idx_invoices_wo ON vendor_invoices(work_order_id);
CREATE INDEX idx_invoices_estimate ON vendor_invoices(estimate_id);
CREATE INDEX idx_invoices_status ON vendor_invoices(status);
CREATE INDEX idx_invoice_items_invoice ON vendor_invoice_items(invoice_id);
