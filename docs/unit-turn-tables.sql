-- ============================================
-- Unit Turns Module — Tables + Seed Data
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Batches (top-level container)
CREATE TABLE unit_turn_batches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL REFERENCES auth.users(id),
  name        TEXT NOT NULL,
  month       TEXT DEFAULT NULL,  -- 'YYYY-MM' format
  status      TEXT NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'CLOSED')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE unit_turn_batches DISABLE ROW LEVEL SECURITY;

-- 2. Units within a batch (property is per-unit)
CREATE TABLE unit_turn_batch_units (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id    UUID NOT NULL REFERENCES unit_turn_batches(id) ON DELETE CASCADE,
  owner_id    UUID NOT NULL REFERENCES auth.users(id),
  property    TEXT NOT NULL,
  unit_label  TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'NOT_STARTED'
    CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETE')),
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(batch_id, property, unit_label)
);

ALTER TABLE unit_turn_batch_units DISABLE ROW LEVEL SECURITY;
CREATE INDEX idx_batch_units_batch ON unit_turn_batch_units(batch_id);

-- 3. Master template: categories (seeded once, read-only)
CREATE TABLE unit_turn_categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  sort_order    INT NOT NULL DEFAULT 0,
  category_type TEXT NOT NULL DEFAULT 'standard'
    CHECK (category_type IN ('standard', 'paint', 'cleaning')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE unit_turn_categories DISABLE ROW LEVEL SECURITY;

-- 4. Master template: items within categories (seeded once, read-only)
CREATE TABLE unit_turn_template_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     UUID NOT NULL REFERENCES unit_turn_categories(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  sort_order      INT NOT NULL DEFAULT 0,
  complexity_type TEXT NOT NULL DEFAULT 'fixed'
    CHECK (complexity_type IN ('fixed', 'tiered')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE unit_turn_template_items DISABLE ROW LEVEL SECURITY;
CREATE INDEX idx_template_items_cat ON unit_turn_template_items(category_id);

-- 5. Per-unit instance of each template item
CREATE TABLE unit_turn_unit_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id           UUID NOT NULL REFERENCES unit_turn_batch_units(id) ON DELETE CASCADE,
  template_item_id  UUID NOT NULL REFERENCES unit_turn_template_items(id),
  category_id       UUID NOT NULL REFERENCES unit_turn_categories(id),
  status            TEXT DEFAULT NULL
    CHECK (status IS NULL OR status IN ('good', 'repair', 'replace')),
  is_na             BOOLEAN NOT NULL DEFAULT false,
  paint_scope       TEXT DEFAULT NULL
    CHECK (paint_scope IS NULL OR paint_scope IN ('touch_up', 'full')),
  tier              TEXT DEFAULT NULL
    CHECK (tier IS NULL OR tier IN ('light', 'standard', 'heavy')),
  sort_order        INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE unit_turn_unit_items DISABLE ROW LEVEL SECURITY;
CREATE INDEX idx_unit_items_unit ON unit_turn_unit_items(unit_id);
CREATE INDEX idx_unit_items_unit_cat ON unit_turn_unit_items(unit_id, category_id);
CREATE INDEX idx_unit_items_template ON unit_turn_unit_items(template_item_id);

-- 6. Notes (item-level or category-level)
CREATE TABLE unit_turn_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id     UUID NOT NULL REFERENCES unit_turn_batch_units(id) ON DELETE CASCADE,
  item_id     UUID REFERENCES unit_turn_unit_items(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES unit_turn_categories(id),
  text        TEXT NOT NULL DEFAULT '',
  created_by  UUID NOT NULL REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE unit_turn_notes DISABLE ROW LEVEL SECURITY;
CREATE INDEX idx_notes_unit_item ON unit_turn_notes(unit_id, item_id);
CREATE INDEX idx_notes_unit_cat ON unit_turn_notes(unit_id, category_id);

-- 7. Photos attached to notes
CREATE TABLE unit_turn_note_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id     UUID NOT NULL REFERENCES unit_turn_notes(id) ON DELETE CASCADE,
  image_path  TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE unit_turn_note_photos DISABLE ROW LEVEL SECURITY;
CREATE INDEX idx_note_photos_note ON unit_turn_note_photos(note_id);


-- ============================================
-- SEED DATA — Categories + Template Items
-- ============================================

-- Helper: insert categories first, then items reference them
-- Using DO block so we can reference category IDs

DO $$
DECLARE
  cat_kitchen_cab UUID;
  cat_kitchen_plumb UUID;
  cat_kitchen_app UUID;
  cat_bath_vanity UUID;
  cat_bath_toilet UUID;
  cat_bath_tub UUID;
  cat_bath_fix UUID;
  cat_electrical UUID;
  cat_doors UUID;
  cat_flooring UUID;
  cat_mechanical UUID;
  cat_laundry UUID;
  cat_paint UUID;
  cat_cleaning UUID;
BEGIN

-- ---- Categories ----
INSERT INTO unit_turn_categories (id, name, slug, sort_order, category_type) VALUES
  (gen_random_uuid(), 'Kitchen – Cabinetry & Storage', 'kitchen-cabinetry', 1, 'standard') RETURNING id INTO cat_kitchen_cab;
INSERT INTO unit_turn_categories (id, name, slug, sort_order, category_type) VALUES
  (gen_random_uuid(), 'Kitchen – Sink & Plumbing', 'kitchen-plumbing', 2, 'standard') RETURNING id INTO cat_kitchen_plumb;
INSERT INTO unit_turn_categories (id, name, slug, sort_order, category_type) VALUES
  (gen_random_uuid(), 'Kitchen – Appliances', 'kitchen-appliances', 3, 'standard') RETURNING id INTO cat_kitchen_app;
INSERT INTO unit_turn_categories (id, name, slug, sort_order, category_type) VALUES
  (gen_random_uuid(), 'Bathroom – Vanity Area', 'bathroom-vanity', 4, 'standard') RETURNING id INTO cat_bath_vanity;
INSERT INTO unit_turn_categories (id, name, slug, sort_order, category_type) VALUES
  (gen_random_uuid(), 'Bathroom – Toilet', 'bathroom-toilet', 5, 'standard') RETURNING id INTO cat_bath_toilet;
INSERT INTO unit_turn_categories (id, name, slug, sort_order, category_type) VALUES
  (gen_random_uuid(), 'Bathroom – Tub / Shower', 'bathroom-tub-shower', 6, 'standard') RETURNING id INTO cat_bath_tub;
INSERT INTO unit_turn_categories (id, name, slug, sort_order, category_type) VALUES
  (gen_random_uuid(), 'Bathroom – Fixtures', 'bathroom-fixtures', 7, 'standard') RETURNING id INTO cat_bath_fix;
INSERT INTO unit_turn_categories (id, name, slug, sort_order, category_type) VALUES
  (gen_random_uuid(), 'Electrical & Fixtures', 'electrical-fixtures', 8, 'standard') RETURNING id INTO cat_electrical;
INSERT INTO unit_turn_categories (id, name, slug, sort_order, category_type) VALUES
  (gen_random_uuid(), 'Doors, Hardware & Windows', 'doors-hardware-windows', 9, 'standard') RETURNING id INTO cat_doors;
INSERT INTO unit_turn_categories (id, name, slug, sort_order, category_type) VALUES
  (gen_random_uuid(), 'Flooring & Finish', 'flooring-finish', 10, 'standard') RETURNING id INTO cat_flooring;
INSERT INTO unit_turn_categories (id, name, slug, sort_order, category_type) VALUES
  (gen_random_uuid(), 'Mechanical / Safety', 'mechanical-safety', 11, 'standard') RETURNING id INTO cat_mechanical;
INSERT INTO unit_turn_categories (id, name, slug, sort_order, category_type) VALUES
  (gen_random_uuid(), 'Laundry', 'laundry', 12, 'standard') RETURNING id INTO cat_laundry;
INSERT INTO unit_turn_categories (id, name, slug, sort_order, category_type) VALUES
  (gen_random_uuid(), 'Paint', 'paint', 13, 'paint') RETURNING id INTO cat_paint;
INSERT INTO unit_turn_categories (id, name, slug, sort_order, category_type) VALUES
  (gen_random_uuid(), 'Cleaning', 'cleaning', 14, 'cleaning') RETURNING id INTO cat_cleaning;

-- ---- Template Items ----

-- Kitchen – Cabinetry & Storage (5 items)
INSERT INTO unit_turn_template_items (category_id, name, sort_order) VALUES
  (cat_kitchen_cab, 'Cabinets (secure, aligned, functioning)', 1),
  (cat_kitchen_cab, 'Cabinet doors (hinges secure, close properly)', 2),
  (cat_kitchen_cab, 'Cabinet hardware (knobs/pulls secure)', 3),
  (cat_kitchen_cab, 'Drawers (operate smoothly, aligned)', 4),
  (cat_kitchen_cab, 'Drawer slides (function properly)', 5);

-- Kitchen – Sink & Plumbing (7 items)
INSERT INTO unit_turn_template_items (category_id, name, sort_order) VALUES
  (cat_kitchen_plumb, 'Kitchen sink (secure, no leaks)', 1),
  (cat_kitchen_plumb, 'Faucet (secure, no leaks)', 2),
  (cat_kitchen_plumb, 'Sprayer (functioning)', 3),
  (cat_kitchen_plumb, 'Drain (clear, draining properly)', 4),
  (cat_kitchen_plumb, 'Disposal (functioning, no leaks)', 5),
  (cat_kitchen_plumb, 'Under-sink plumbing (no leaks)', 6),
  (cat_kitchen_plumb, 'Splash guard / sink baffle', 7);

-- Kitchen – Appliances (10 items)
INSERT INTO unit_turn_template_items (category_id, name, sort_order) VALUES
  (cat_kitchen_app, 'Refrigerator (cooling, seals intact)', 1),
  (cat_kitchen_app, 'Refrigerator shelves/drawers secure', 2),
  (cat_kitchen_app, 'Stove / range (burners functioning)', 3),
  (cat_kitchen_app, 'Oven (heating properly)', 4),
  (cat_kitchen_app, 'Oven light', 5),
  (cat_kitchen_app, 'Microwave (functioning)', 6),
  (cat_kitchen_app, 'Microwave light', 7),
  (cat_kitchen_app, 'Dishwasher (runs properly)', 8),
  (cat_kitchen_app, 'Dishwasher secure (not loose)', 9),
  (cat_kitchen_app, 'Dishwasher drain (no leaks)', 10);

-- Bathroom – Vanity Area (7 items)
INSERT INTO unit_turn_template_items (category_id, name, sort_order) VALUES
  (cat_bath_vanity, 'Vanity cabinet (secure)', 1),
  (cat_bath_vanity, 'Vanity drawers (functioning)', 2),
  (cat_bath_vanity, 'Vanity hardware (secure)', 3),
  (cat_bath_vanity, 'Sink (secure, no leaks)', 4),
  (cat_bath_vanity, 'Faucet (secure, no leaks)', 5),
  (cat_bath_vanity, 'Pop-up stopper (functioning)', 6),
  (cat_bath_vanity, 'Mirror (secure)', 7);

-- Bathroom – Toilet (5 items)
INSERT INTO unit_turn_template_items (category_id, name, sort_order) VALUES
  (cat_bath_toilet, 'Toilet secure to floor', 1),
  (cat_bath_toilet, 'Toilet flushes properly', 2),
  (cat_bath_toilet, 'Toilet seat secure', 3),
  (cat_bath_toilet, 'Toilet fill valve functioning', 4),
  (cat_bath_toilet, 'No leaks at base or supply line', 5);

-- Bathroom – Tub / Shower (8 items)
INSERT INTO unit_turn_template_items (category_id, name, sort_order) VALUES
  (cat_bath_tub, 'Shower head functioning', 1),
  (cat_bath_tub, 'Shower faucet functioning', 2),
  (cat_bath_tub, 'Tub drain clear', 3),
  (cat_bath_tub, 'Tub stopper functioning', 4),
  (cat_bath_tub, 'Tub caulk intact', 5),
  (cat_bath_tub, 'Shower rod secure', 6),
  (cat_bath_tub, 'Shower trim secure', 7),
  (cat_bath_tub, 'Tile/grout condition', 8);

-- Bathroom – Fixtures (2 items)
INSERT INTO unit_turn_template_items (category_id, name, sort_order) VALUES
  (cat_bath_fix, 'Towel rack secure', 1),
  (cat_bath_fix, 'Toilet paper holder secure', 2);

-- Electrical & Fixtures (16 items)
INSERT INTO unit_turn_template_items (category_id, name, sort_order) VALUES
  (cat_electrical, 'All ceiling lights functioning', 1),
  (cat_electrical, 'Light fixtures secure', 2),
  (cat_electrical, 'Light covers intact', 3),
  (cat_electrical, 'Ceiling fan functioning', 4),
  (cat_electrical, 'Fan blades secure', 5),
  (cat_electrical, 'Fan light functioning', 6),
  (cat_electrical, 'Outlets functioning', 7),
  (cat_electrical, 'GFCI outlets reset properly', 8),
  (cat_electrical, 'Outlet covers intact', 9),
  (cat_electrical, 'Switches functioning', 10),
  (cat_electrical, 'Switch plates intact', 11),
  (cat_electrical, 'Smoke detector present & functioning', 12),
  (cat_electrical, 'Smoke detector secure', 13),
  (cat_electrical, 'Thermostat functioning', 14),
  (cat_electrical, 'Thermostat secure', 15),
  (cat_electrical, 'Replace thermostat batteries (if applicable)', 16);

-- Doors, Hardware & Windows (15 items)
INSERT INTO unit_turn_template_items (category_id, name, sort_order) VALUES
  (cat_doors, 'Entry door closes and latches properly', 1),
  (cat_doors, 'Door sweep intact', 2),
  (cat_doors, 'Deadbolt functioning', 3),
  (cat_doors, 'Interior doors open/close properly', 4),
  (cat_doors, 'Door hinges secure', 5),
  (cat_doors, 'Door handles secure', 6),
  (cat_doors, 'Door stops secure', 7),
  (cat_doors, 'Windows open/close properly', 8),
  (cat_doors, 'Window locks functioning', 9),
  (cat_doors, 'Window screens intact', 10),
  (cat_doors, 'Blinds functioning', 11),
  (cat_doors, 'Curtain rods secure', 12),
  (cat_doors, 'Closet racks secure', 13),
  (cat_doors, 'Closet rods secure', 14),
  (cat_doors, 'Closet shelves secure', 15);

-- Flooring & Finish (6 items)
INSERT INTO unit_turn_template_items (category_id, name, sort_order) VALUES
  (cat_flooring, 'Flooring condition (no damage)', 1),
  (cat_flooring, 'Transitions secure', 2),
  (cat_flooring, 'Baseboards secure', 3),
  (cat_flooring, 'Wall damage (patch required)', 4),
  (cat_flooring, 'Ceiling condition (no stains/damage)', 5),
  (cat_flooring, 'Ceiling fixtures secure', 6);

-- Mechanical / Safety (6 items)
INSERT INTO unit_turn_template_items (category_id, name, sort_order) VALUES
  (cat_mechanical, 'HVAC filter replaced', 1),
  (cat_mechanical, 'Return vent secure', 2),
  (cat_mechanical, 'Supply vents secure', 3),
  (cat_mechanical, 'Water heater (if in unit) secure/no leaks', 4),
  (cat_mechanical, 'Sprinkler heads intact', 5),
  (cat_mechanical, 'Sprinkler caps present', 6);

-- Laundry (5 items)
INSERT INTO unit_turn_template_items (category_id, name, sort_order) VALUES
  (cat_laundry, 'Washer functioning', 1),
  (cat_laundry, 'Washer drain secure', 2),
  (cat_laundry, 'Dryer functioning', 3),
  (cat_laundry, 'Dryer vent secure', 4),
  (cat_laundry, 'Dryer lint trap intact', 5);

-- Paint (2 special items)
INSERT INTO unit_turn_template_items (category_id, name, sort_order) VALUES
  (cat_paint, 'Paint Scope: Touch Up', 1),
  (cat_paint, 'Paint Scope: Full Paint', 2);

-- Cleaning (7 items)
INSERT INTO unit_turn_template_items (category_id, name, sort_order) VALUES
  (cat_cleaning, 'Kitchen cleaned', 1),
  (cat_cleaning, 'Bathrooms cleaned', 2),
  (cat_cleaning, 'Appliances cleaned', 3),
  (cat_cleaning, 'Floors cleaned', 4),
  (cat_cleaning, 'Windows cleaned', 5),
  (cat_cleaning, 'Trash/debris removed', 6),
  (cat_cleaning, 'Final wipe-down complete', 7);

END $$;
