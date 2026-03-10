-- Migration 022: GPS Time Tracking
-- Adds geolocation columns to time entries and property coordinates to work orders

ALTER TABLE vendor_wo_time_entries
  ADD COLUMN IF NOT EXISTS clock_in_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS clock_in_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS clock_out_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS clock_out_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS is_on_site BOOLEAN;

ALTER TABLE vendor_work_orders
  ADD COLUMN IF NOT EXISTS property_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS property_lng DOUBLE PRECISION;
