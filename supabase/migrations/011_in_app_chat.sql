-- ============================================
-- Migration 011: In-App Chat (PM ↔ Vendor)
-- ============================================

-- Chat messages between PM and Vendor on a work order
CREATE TABLE IF NOT EXISTS vendor_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_org_id UUID NOT NULL REFERENCES vendor_organizations(id) ON DELETE CASCADE,
  work_order_id UUID NOT NULL REFERENCES vendor_work_orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  sender_role TEXT NOT NULL CHECK (sender_role IN ('pm', 'vendor')),
  body TEXT NOT NULL CHECK (char_length(body) > 0),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast queries
CREATE INDEX idx_chat_messages_wo ON vendor_chat_messages(work_order_id, created_at);
CREATE INDEX idx_chat_messages_org ON vendor_chat_messages(vendor_org_id, created_at DESC);
CREATE INDEX idx_chat_messages_unread ON vendor_chat_messages(sender_role, is_read) WHERE is_read = false;

-- RLS
ALTER TABLE vendor_chat_messages ENABLE ROW LEVEL SECURITY;

-- Vendor users can see messages in their org's work orders
CREATE POLICY "vendor_chat_select" ON vendor_chat_messages
  FOR SELECT USING (
    vendor_org_id IN (
      SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()
    )
    OR
    sender_id = auth.uid()
  );

-- Vendor users can insert messages in their org's work orders
CREATE POLICY "vendor_chat_insert" ON vendor_chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND (
      vendor_org_id IN (
        SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()
      )
      OR
      -- PM can insert if they're the PM on the work order
      EXISTS (
        SELECT 1 FROM vendor_work_orders
        WHERE id = work_order_id AND pm_user_id = auth.uid()
      )
    )
  );

-- Users can mark messages as read (only messages sent TO them)
CREATE POLICY "vendor_chat_update_read" ON vendor_chat_messages
  FOR UPDATE USING (
    -- Can only mark as read messages NOT sent by you
    sender_id != auth.uid()
    AND (
      vendor_org_id IN (
        SELECT vendor_org_id FROM vendor_users WHERE user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM vendor_work_orders
        WHERE id = work_order_id AND pm_user_id = auth.uid()
      )
    )
  ) WITH CHECK (is_read = true);

-- Conversation summary view: latest message per work order
CREATE OR REPLACE VIEW vendor_chat_conversations AS
SELECT DISTINCT ON (m.work_order_id)
  m.work_order_id,
  m.vendor_org_id,
  m.body AS last_message,
  m.sender_role AS last_sender_role,
  m.created_at AS last_message_at,
  wo.property_name,
  wo.description AS wo_description,
  wo.pm_user_id
FROM vendor_chat_messages m
JOIN vendor_work_orders wo ON wo.id = m.work_order_id
ORDER BY m.work_order_id, m.created_at DESC;
