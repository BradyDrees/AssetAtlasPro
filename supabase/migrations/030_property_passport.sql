-- ============================================
-- Migration 030: Property Passport
-- Feature: F9 (Property Passport)
-- ============================================

-- ─── Passport Token Column ───────────────────────────────
-- UUID token for public shareable passport URL.
-- UNIQUE ensures one-to-one mapping. NULL = no active passport.
ALTER TABLE homeowner_properties ADD COLUMN IF NOT EXISTS passport_token UUID UNIQUE;

-- Partial index — only index non-null tokens for fast lookup
CREATE INDEX IF NOT EXISTS idx_property_passport
  ON homeowner_properties(passport_token)
  WHERE passport_token IS NOT NULL;
