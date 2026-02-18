-- ============================================
-- Asset Atlas Pro — Inspection Mode Tables
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Master sections (template)
CREATE TABLE inspection_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  is_unit_mode BOOLEAN NOT NULL DEFAULT false,
  is_default_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Master checklist items (template)
CREATE TABLE inspection_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES inspection_sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  default_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Inspection projects
CREATE TABLE inspection_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  property_name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  inspection_type TEXT NOT NULL DEFAULT 'internal'
    CHECK (inspection_type IN ('internal', 'bank_ready')),
  asset_archetype TEXT NOT NULL DEFAULT 'garden'
    CHECK (asset_archetype IN ('garden', 'interior', 'sfr')),
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'COMPLETE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Per-project section instances
CREATE TABLE inspection_project_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES inspection_projects(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES inspection_sections(id),
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  display_name_override TEXT,
  condition_rating INT CHECK (condition_rating IS NULL OR (condition_rating BETWEEN 1 AND 5)),
  rul_bucket TEXT CHECK (rul_bucket IS NULL OR rul_bucket IN ('<1 year', '1-3 years', '3-5 years', '5+ years', 'Unknown')),
  notes TEXT,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, section_id)
);

-- 5. Inspection units (standalone, with vacant walk tracking)
CREATE TABLE inspection_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES inspection_projects(id) ON DELETE CASCADE,
  project_section_id UUID NOT NULL REFERENCES inspection_project_sections(id) ON DELETE CASCADE,
  building TEXT NOT NULL DEFAULT '',
  unit_number TEXT NOT NULL DEFAULT '',
  -- Vacant walk tracking
  occupancy_status TEXT NOT NULL DEFAULT 'UNKNOWN'
    CHECK (occupancy_status IN ('VACANT', 'OCCUPIED', 'MODEL', 'DOWN', 'UNKNOWN')),
  walk_status TEXT NOT NULL DEFAULT 'NOT_STARTED'
    CHECK (walk_status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETE', 'NO_ACCESS')),
  walk_required BOOLEAN NOT NULL DEFAULT true,
  turn_stage TEXT CHECK (turn_stage IS NULL OR turn_stage IN ('MAKE_READY', 'RENOVATION', 'READY', 'HOLD')),
  -- Condition grades (reused from DD pattern)
  overall_condition INT CHECK (overall_condition IS NULL OR (overall_condition BETWEEN 1 AND 5)),
  tenant_housekeeping TEXT CHECK (tenant_housekeeping IS NULL OR tenant_housekeeping IN ('A','B','C','D','E','F')),
  floors TEXT CHECK (floors IS NULL OR floors IN ('A','B','C','D','E','F')),
  cabinets TEXT CHECK (cabinets IS NULL OR cabinets IN ('A','B','C','D','E','F')),
  countertops TEXT CHECK (countertops IS NULL OR countertops IN ('A','B','C','D','E','F')),
  appliances TEXT[] NOT NULL DEFAULT '{}',
  plumbing_fixtures TEXT CHECK (plumbing_fixtures IS NULL OR plumbing_fixtures IN ('A','B','C','D','E','F')),
  electrical_fixtures TEXT CHECK (electrical_fixtures IS NULL OR electrical_fixtures IN ('A','B','C','D','E','F')),
  windows_doors TEXT CHECK (windows_doors IS NULL OR windows_doors IN ('A','B','C','D','E','F')),
  bath_condition TEXT CHECK (bath_condition IS NULL OR bath_condition IN ('A','B','C','D','E','F')),
  has_leak_evidence BOOLEAN NOT NULL DEFAULT false,
  has_mold_indicators BOOLEAN NOT NULL DEFAULT false,
  blinds_down BOOLEAN NOT NULL DEFAULT false,
  toilet_seat_down BOOLEAN NOT NULL DEFAULT false,
  rent_ready BOOLEAN,
  days_vacant INT,
  description TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Inspection findings (deficiency entries — can attach to section OR unit)
CREATE TABLE inspection_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES inspection_projects(id) ON DELETE CASCADE,
  project_section_id UUID NOT NULL REFERENCES inspection_project_sections(id) ON DELETE CASCADE,
  checklist_item_id UUID REFERENCES inspection_checklist_items(id),
  unit_id UUID REFERENCES inspection_units(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  priority INT CHECK (priority IS NULL OR (priority BETWEEN 1 AND 5)),
  exposure_bucket TEXT CHECK (exposure_bucket IS NULL OR exposure_bucket IN ('500', '1000', '2000', '3000', 'custom')),
  exposure_custom INT,
  risk_flags TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Inspection captures (same shape as dd_captures)
CREATE TABLE inspection_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_section_id UUID NOT NULL REFERENCES inspection_project_sections(id) ON DELETE CASCADE,
  finding_id UUID REFERENCES inspection_findings(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES inspection_units(id) ON DELETE SET NULL,
  file_type TEXT NOT NULL DEFAULT 'image' CHECK (file_type IN ('image', 'video', 'pdf')),
  image_path TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE inspection_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_project_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_checklist_items ENABLE ROW LEVEL SECURITY;

-- Master tables: readable by all authenticated users
CREATE POLICY "inspection_sections_read" ON inspection_sections
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "inspection_checklist_items_read" ON inspection_checklist_items
  FOR SELECT TO authenticated USING (true);

-- Projects: owner only
CREATE POLICY "inspection_projects_owner" ON inspection_projects
  FOR ALL TO authenticated USING (owner_id = auth.uid());

-- Project sections: owner via project
CREATE POLICY "inspection_project_sections_owner" ON inspection_project_sections
  FOR ALL TO authenticated
  USING (project_id IN (SELECT id FROM inspection_projects WHERE owner_id = auth.uid()));

-- Findings: owner via project
CREATE POLICY "inspection_findings_owner" ON inspection_findings
  FOR ALL TO authenticated
  USING (project_id IN (SELECT id FROM inspection_projects WHERE owner_id = auth.uid()));

-- Units: owner via project
CREATE POLICY "inspection_units_owner" ON inspection_units
  FOR ALL TO authenticated
  USING (project_id IN (SELECT id FROM inspection_projects WHERE owner_id = auth.uid()));

-- Captures: owner via project section
CREATE POLICY "inspection_captures_owner" ON inspection_captures
  FOR ALL TO authenticated
  USING (project_section_id IN (
    SELECT ips.id FROM inspection_project_sections ips
    JOIN inspection_projects ip ON ip.id = ips.project_id
    WHERE ip.owner_id = auth.uid()
  ));

-- ============================================
-- Updated-at triggers
-- ============================================

CREATE OR REPLACE FUNCTION update_inspection_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inspection_projects_updated_at
  BEFORE UPDATE ON inspection_projects
  FOR EACH ROW EXECUTE FUNCTION update_inspection_updated_at();

CREATE TRIGGER inspection_project_sections_updated_at
  BEFORE UPDATE ON inspection_project_sections
  FOR EACH ROW EXECUTE FUNCTION update_inspection_updated_at();

CREATE TRIGGER inspection_findings_updated_at
  BEFORE UPDATE ON inspection_findings
  FOR EACH ROW EXECUTE FUNCTION update_inspection_updated_at();

CREATE TRIGGER inspection_units_updated_at
  BEFORE UPDATE ON inspection_units
  FOR EACH ROW EXECUTE FUNCTION update_inspection_updated_at();

CREATE TRIGGER inspection_captures_updated_at
  BEFORE UPDATE ON inspection_captures
  FOR EACH ROW EXECUTE FUNCTION update_inspection_updated_at();
