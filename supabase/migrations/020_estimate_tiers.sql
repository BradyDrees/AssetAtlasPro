-- Migration 020: Track selected tier on estimate approval
-- When homeowner approves a tiered estimate, store which tier they chose

ALTER TABLE vendor_estimates
  ADD COLUMN IF NOT EXISTS selected_tier TEXT CHECK (selected_tier IN ('good','better','best'));
