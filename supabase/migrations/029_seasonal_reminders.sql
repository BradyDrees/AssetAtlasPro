-- ============================================
-- Migration 029: Seasonal Maintenance Reminders
-- Feature: F4 (Seasonal Maintenance Reminders)
-- ============================================

-- ─── Dismissed Reminders Table ───────────────────────────
-- Tracks which seasonal reminders a user has dismissed, scoped by season_year.
-- Winter Dec 2026–Feb 2027 = season_year: 2026 (labeled by starting year).
CREATE TABLE IF NOT EXISTS homeowner_dismissed_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  reminder_id TEXT NOT NULL,
  season_year INT NOT NULL,
  dismissed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, reminder_id, season_year)
);

ALTER TABLE homeowner_dismissed_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_own_dismissals" ON homeowner_dismissed_reminders
  FOR ALL USING (user_id = auth.uid());

-- ─── Climate Zone Column ─────────────────────────────────
-- Optional climate zone for property-specific seasonal task filtering.
ALTER TABLE homeowner_properties ADD COLUMN IF NOT EXISTS climate_zone TEXT
  CHECK (climate_zone IS NULL OR climate_zone IN ('hot_humid','hot_dry','mixed_humid','mixed_dry','cold','very_cold','marine'));
