-- ============================================
-- Asset Atlas Pro — Inspection Mode Seed Data
-- Run AFTER inspection-create-tables.sql
-- ============================================

-- GROUP 1: Site & Exterior
INSERT INTO inspection_sections (group_name, name, slug, sort_order, is_unit_mode) VALUES
('Site & Exterior', 'Site Drainage & Grading', 'site-drainage-grading', 1, false),
('Site & Exterior', 'Paving & Flatwork', 'paving-flatwork', 2, false),
('Site & Exterior', 'Exterior Lighting', 'exterior-lighting', 3, false),
('Site & Exterior', 'Landscaping & Site Features', 'landscaping-site-features', 4, false);

-- GROUP 2: Structure & Envelope
INSERT INTO inspection_sections (group_name, name, slug, sort_order, is_unit_mode) VALUES
('Structure & Envelope', 'Foundation', 'foundation', 5, false),
('Structure & Envelope', 'Structural Framing (Visual)', 'structural-framing', 6, false),
('Structure & Envelope', 'Roof', 'roof', 7, false),
('Structure & Envelope', 'Exterior Walls / Facade', 'exterior-walls-facade', 8, false),
('Structure & Envelope', 'Windows & Doors', 'windows-doors', 9, false);

-- GROUP 3: Life Safety
INSERT INTO inspection_sections (group_name, name, slug, sort_order, is_unit_mode) VALUES
('Life Safety', 'Fire Alarm System', 'fire-alarm-system', 10, false),
('Life Safety', 'Sprinkler / Fire Suppression', 'sprinkler-fire-suppression', 11, false),
('Life Safety', 'Emergency Lighting & Exit Signs', 'emergency-lighting-exits', 12, false),
('Life Safety', 'Egress Paths', 'egress-paths', 13, false);

-- GROUP 4: Mechanical / Electrical / Plumbing
INSERT INTO inspection_sections (group_name, name, slug, sort_order, is_unit_mode) VALUES
('Mechanical / Electrical / Plumbing', 'Electrical Service & Panels', 'electrical-service-panels', 14, false),
('Mechanical / Electrical / Plumbing', 'Unit Electrical (Sampling)', 'unit-electrical-sampling', 15, false),
('Mechanical / Electrical / Plumbing', 'Plumbing Supply & Drain', 'plumbing-supply-drain', 16, false),
('Mechanical / Electrical / Plumbing', 'Water Heaters', 'water-heaters', 17, false),
('Mechanical / Electrical / Plumbing', 'HVAC Systems', 'hvac-systems', 18, false);

-- GROUP 5: Common Areas
INSERT INTO inspection_sections (group_name, name, slug, sort_order, is_unit_mode) VALUES
('Common Areas', 'Corridors & Interior Finishes', 'corridors-interior-finishes', 19, false),
('Common Areas', 'Amenities', 'amenities', 20, false),
('Common Areas', 'Laundry', 'laundry', 21, false);

-- GROUP 6: Units (unit mode)
INSERT INTO inspection_sections (group_name, name, slug, sort_order, is_unit_mode) VALUES
('Units', 'Unit Inspections', 'unit-inspections', 22, true);

-- ============================================
-- Checklist Items per Section
-- ============================================

-- 1.1 Site Drainage & Grading
INSERT INTO inspection_checklist_items (section_id, name, sort_order) VALUES
((SELECT id FROM inspection_sections WHERE slug = 'site-drainage-grading'), 'Ponding', 1),
((SELECT id FROM inspection_sections WHERE slug = 'site-drainage-grading'), 'Improper slope', 2),
((SELECT id FROM inspection_sections WHERE slug = 'site-drainage-grading'), 'Erosion', 3),
((SELECT id FROM inspection_sections WHERE slug = 'site-drainage-grading'), 'Downspout discharge', 4),
((SELECT id FROM inspection_sections WHERE slug = 'site-drainage-grading'), 'Retaining walls', 5);

-- 1.2 Paving & Flatwork
INSERT INTO inspection_checklist_items (section_id, name, sort_order) VALUES
((SELECT id FROM inspection_sections WHERE slug = 'paving-flatwork'), 'Asphalt condition', 1),
((SELECT id FROM inspection_sections WHERE slug = 'paving-flatwork'), 'Concrete cracking', 2),
((SELECT id FROM inspection_sections WHERE slug = 'paving-flatwork'), 'Trip hazards', 3),
((SELECT id FROM inspection_sections WHERE slug = 'paving-flatwork'), 'ADA ramps (visual only)', 4);

-- 1.3 Exterior Lighting
INSERT INTO inspection_checklist_items (section_id, name, sort_order) VALUES
((SELECT id FROM inspection_sections WHERE slug = 'exterior-lighting'), 'Fixture condition', 1),
((SELECT id FROM inspection_sections WHERE slug = 'exterior-lighting'), 'Outages', 2),
((SELECT id FROM inspection_sections WHERE slug = 'exterior-lighting'), 'Dark zones', 3);

-- 1.4 Landscaping & Site Features
INSERT INTO inspection_checklist_items (section_id, name, sort_order) VALUES
((SELECT id FROM inspection_sections WHERE slug = 'landscaping-site-features'), 'Overgrowth against structure', 1),
((SELECT id FROM inspection_sections WHERE slug = 'landscaping-site-features'), 'Irrigation leaks', 2),
((SELECT id FROM inspection_sections WHERE slug = 'landscaping-site-features'), 'Fencing / gates', 3),
((SELECT id FROM inspection_sections WHERE slug = 'landscaping-site-features'), 'Dumpster enclosures', 4);

-- 2.1 Foundation
INSERT INTO inspection_checklist_items (section_id, name, sort_order) VALUES
((SELECT id FROM inspection_sections WHERE slug = 'foundation'), 'Visible cracking', 1),
((SELECT id FROM inspection_sections WHERE slug = 'foundation'), 'Settlement indicators', 2),
((SELECT id FROM inspection_sections WHERE slug = 'foundation'), 'Water intrusion', 3);

-- 2.2 Structural Framing (Visual)
INSERT INTO inspection_checklist_items (section_id, name, sort_order) VALUES
((SELECT id FROM inspection_sections WHERE slug = 'structural-framing'), 'Beam deflection', 1),
((SELECT id FROM inspection_sections WHERE slug = 'structural-framing'), 'Joist sagging', 2),
((SELECT id FROM inspection_sections WHERE slug = 'structural-framing'), 'Balcony attachment condition', 3);

-- 2.3 Roof
INSERT INTO inspection_checklist_items (section_id, name, sort_order) VALUES
((SELECT id FROM inspection_sections WHERE slug = 'roof'), 'Roof type', 1),
((SELECT id FROM inspection_sections WHERE slug = 'roof'), 'Age estimate', 2),
((SELECT id FROM inspection_sections WHERE slug = 'roof'), 'Active leaks', 3),
((SELECT id FROM inspection_sections WHERE slug = 'roof'), 'Flashing condition', 4),
((SELECT id FROM inspection_sections WHERE slug = 'roof'), 'Penetrations', 5);

-- 2.4 Exterior Walls / Facade
INSERT INTO inspection_checklist_items (section_id, name, sort_order) VALUES
((SELECT id FROM inspection_sections WHERE slug = 'exterior-walls-facade'), 'Siding condition', 1),
((SELECT id FROM inspection_sections WHERE slug = 'exterior-walls-facade'), 'Masonry cracking', 2),
((SELECT id FROM inspection_sections WHERE slug = 'exterior-walls-facade'), 'Sealant failure', 3);

-- 2.5 Windows & Doors
INSERT INTO inspection_checklist_items (section_id, name, sort_order) VALUES
((SELECT id FROM inspection_sections WHERE slug = 'windows-doors'), 'Broken seals', 1),
((SELECT id FROM inspection_sections WHERE slug = 'windows-doors'), 'Rot', 2),
((SELECT id FROM inspection_sections WHERE slug = 'windows-doors'), 'Hardware condition', 3);

-- 3.1 Fire Alarm System
INSERT INTO inspection_checklist_items (section_id, name, sort_order) VALUES
((SELECT id FROM inspection_sections WHERE slug = 'fire-alarm-system'), 'Panel present', 1),
((SELECT id FROM inspection_sections WHERE slug = 'fire-alarm-system'), 'Pull stations', 2),
((SELECT id FROM inspection_sections WHERE slug = 'fire-alarm-system'), 'Strobes visible', 3),
((SELECT id FROM inspection_sections WHERE slug = 'fire-alarm-system'), 'Tags current (visual)', 4);

-- 3.2 Sprinkler / Fire Suppression
INSERT INTO inspection_checklist_items (section_id, name, sort_order) VALUES
((SELECT id FROM inspection_sections WHERE slug = 'sprinkler-fire-suppression'), 'Riser condition', 1),
((SELECT id FROM inspection_sections WHERE slug = 'sprinkler-fire-suppression'), 'Tags visible', 2),
((SELECT id FROM inspection_sections WHERE slug = 'sprinkler-fire-suppression'), 'Obstructions', 3);

-- 3.3 Emergency Lighting & Exit Signs
INSERT INTO inspection_checklist_items (section_id, name, sort_order) VALUES
((SELECT id FROM inspection_sections WHERE slug = 'emergency-lighting-exits'), 'Functioning', 1),
((SELECT id FROM inspection_sections WHERE slug = 'emergency-lighting-exits'), 'Coverage gaps', 2);

-- 3.4 Egress Paths
INSERT INTO inspection_checklist_items (section_id, name, sort_order) VALUES
((SELECT id FROM inspection_sections WHERE slug = 'egress-paths'), 'Obstructions', 1),
((SELECT id FROM inspection_sections WHERE slug = 'egress-paths'), 'Stair rails secure', 2),
((SELECT id FROM inspection_sections WHERE slug = 'egress-paths'), 'Fire doors self-closing', 3);

-- 4.1 Electrical Service & Panels
INSERT INTO inspection_checklist_items (section_id, name, sort_order) VALUES
((SELECT id FROM inspection_sections WHERE slug = 'electrical-service-panels'), 'Panel brand', 1),
((SELECT id FROM inspection_sections WHERE slug = 'electrical-service-panels'), 'Labeling', 2),
((SELECT id FROM inspection_sections WHERE slug = 'electrical-service-panels'), 'Clearance', 3),
((SELECT id FROM inspection_sections WHERE slug = 'electrical-service-panels'), 'Double taps', 4),
((SELECT id FROM inspection_sections WHERE slug = 'electrical-service-panels'), 'Exposed wiring', 5);

-- 4.2 Unit Electrical (Sampling)
INSERT INTO inspection_checklist_items (section_id, name, sort_order) VALUES
((SELECT id FROM inspection_sections WHERE slug = 'unit-electrical-sampling'), 'GFCI presence', 1),
((SELECT id FROM inspection_sections WHERE slug = 'unit-electrical-sampling'), 'Damaged receptacles', 2),
((SELECT id FROM inspection_sections WHERE slug = 'unit-electrical-sampling'), 'Open knockouts', 3);

-- 4.3 Plumbing Supply & Drain
INSERT INTO inspection_checklist_items (section_id, name, sort_order) VALUES
((SELECT id FROM inspection_sections WHERE slug = 'plumbing-supply-drain'), 'Pipe type', 1),
((SELECT id FROM inspection_sections WHERE slug = 'plumbing-supply-drain'), 'Corrosion', 2),
((SELECT id FROM inspection_sections WHERE slug = 'plumbing-supply-drain'), 'Active leaks', 3),
((SELECT id FROM inspection_sections WHERE slug = 'plumbing-supply-drain'), 'PRVs', 4);

-- 4.4 Water Heaters
INSERT INTO inspection_checklist_items (section_id, name, sort_order) VALUES
((SELECT id FROM inspection_sections WHERE slug = 'water-heaters'), 'Age', 1),
((SELECT id FROM inspection_sections WHERE slug = 'water-heaters'), 'Venting', 2),
((SELECT id FROM inspection_sections WHERE slug = 'water-heaters'), 'T&P discharge', 3),
((SELECT id FROM inspection_sections WHERE slug = 'water-heaters'), 'Pan presence', 4);

-- 4.5 HVAC Systems
INSERT INTO inspection_checklist_items (section_id, name, sort_order) VALUES
((SELECT id FROM inspection_sections WHERE slug = 'hvac-systems'), 'Type (PTAC, split, VRV, etc.)', 1),
((SELECT id FROM inspection_sections WHERE slug = 'hvac-systems'), 'Age', 2),
((SELECT id FROM inspection_sections WHERE slug = 'hvac-systems'), 'Operational status', 3),
((SELECT id FROM inspection_sections WHERE slug = 'hvac-systems'), 'Condensate management', 4);

-- 5.1 Corridors & Interior Finishes
INSERT INTO inspection_checklist_items (section_id, name, sort_order) VALUES
((SELECT id FROM inspection_sections WHERE slug = 'corridors-interior-finishes'), 'Ceiling damage', 1),
((SELECT id FROM inspection_sections WHERE slug = 'corridors-interior-finishes'), 'Flooring wear', 2),
((SELECT id FROM inspection_sections WHERE slug = 'corridors-interior-finishes'), 'Water staining', 3);

-- 5.2 Amenities
INSERT INTO inspection_checklist_items (section_id, name, sort_order) VALUES
((SELECT id FROM inspection_sections WHERE slug = 'amenities'), 'Clubhouse', 1),
((SELECT id FROM inspection_sections WHERE slug = 'amenities'), 'Fitness', 2),
((SELECT id FROM inspection_sections WHERE slug = 'amenities'), 'Pool (visual compliance only)', 3);

-- 5.3 Laundry
INSERT INTO inspection_checklist_items (section_id, name, sort_order) VALUES
((SELECT id FROM inspection_sections WHERE slug = 'laundry'), 'Laundry facility condition', 1);
