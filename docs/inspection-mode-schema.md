# Inspection Mode — Database Schema Spec

## Architecture Decisions
- Two master tables (sections + checklist items), not JSON
- Explicit project-section join table for enable/disable + section-level fields
- Findings reference project_section_id (not master section_id)
- Separate inspection_captures (same shape as dd_captures, unify later)
- Bank-ready mode = validation layer, not schema (nullable columns)
- Standalone inspection_units (not coupled to DD)

## Tables

### 1. inspection_sections (master template)
```sql
CREATE TABLE inspection_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name TEXT NOT NULL,         -- 'Site & Exterior', 'Structure & Envelope', etc.
  name TEXT NOT NULL,               -- 'Site Drainage & Grading', 'Foundation', etc.
  slug TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  is_unit_mode BOOLEAN NOT NULL DEFAULT false,
  is_default_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2. inspection_checklist_items (master template)
```sql
CREATE TABLE inspection_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES inspection_sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,               -- 'Ponding', 'Improper slope', 'Active leaks', etc.
  sort_order INT NOT NULL DEFAULT 0,
  default_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3. inspection_projects
```sql
CREATE TABLE inspection_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,               -- project code, e.g. 'VERIDIAN'
  property_name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  inspection_type TEXT NOT NULL DEFAULT 'internal'
    CHECK (inspection_type IN ('internal', 'bank_ready')),
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'COMPLETE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- RLS: owner_id = auth.uid()
```

### 4. inspection_project_sections (join table)
```sql
CREATE TABLE inspection_project_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES inspection_projects(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES inspection_sections(id),
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  condition_rating INT CHECK (condition_rating BETWEEN 1 AND 5),
  rul_bucket TEXT CHECK (rul_bucket IN ('<1 year', '1-3 years', '3-5 years', '5+ years', 'Unknown')),
  notes TEXT,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, section_id)
);
```

### 5. inspection_findings (deficiency entries)
```sql
CREATE TABLE inspection_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES inspection_projects(id) ON DELETE CASCADE,
  project_section_id UUID NOT NULL REFERENCES inspection_project_sections(id) ON DELETE CASCADE,
  checklist_item_id UUID REFERENCES inspection_checklist_items(id),  -- nullable: section-level vs item-level
  title TEXT NOT NULL DEFAULT '',
  priority INT CHECK (priority BETWEEN 1 AND 5),  -- 1=Immediate, 5=Monitor; NULL = Good/No Issue
  exposure_bucket TEXT CHECK (exposure_bucket IN ('500', '1000', '2000', '3000', 'custom')),
  exposure_custom INT,              -- only used when exposure_bucket = 'custom'
  risk_flags TEXT[] DEFAULT '{}',   -- array: 'life_safety', 'water_intrusion', 'electrical_hazard', 'structural'
  notes TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 6. inspection_units (standalone, same shape as DD units)
```sql
CREATE TABLE inspection_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES inspection_projects(id) ON DELETE CASCADE,
  project_section_id UUID NOT NULL REFERENCES inspection_project_sections(id) ON DELETE CASCADE,
  building TEXT NOT NULL DEFAULT '',
  unit_number TEXT NOT NULL DEFAULT '',
  overall_condition INT CHECK (overall_condition BETWEEN 1 AND 5),
  tenant_housekeeping TEXT CHECK (tenant_housekeeping IN ('A', 'B', 'C', 'D', 'E', 'F')),
  floors TEXT CHECK (floors IN ('A', 'B', 'C', 'D', 'E', 'F')),
  cabinets TEXT CHECK (cabinets IN ('A', 'B', 'C', 'D', 'E', 'F')),
  countertops TEXT CHECK (countertops IN ('A', 'B', 'C', 'D', 'E', 'F')),
  appliances TEXT[] DEFAULT '{}',
  plumbing_fixtures TEXT CHECK (plumbing_fixtures IN ('A', 'B', 'C', 'D', 'E', 'F')),
  electrical_fixtures TEXT CHECK (electrical_fixtures IN ('A', 'B', 'C', 'D', 'E', 'F')),
  windows_doors TEXT CHECK (windows_doors IN ('A', 'B', 'C', 'D', 'E', 'F')),
  bath_condition TEXT CHECK (bath_condition IN ('A', 'B', 'C', 'D', 'E', 'F')),
  has_leak_evidence BOOLEAN NOT NULL DEFAULT false,
  has_mold_indicators BOOLEAN NOT NULL DEFAULT false,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 7. inspection_captures (same shape as dd_captures)
```sql
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
```

## Validation Rules by Inspection Type

### Internal (operator)
- All fields nullable/optional except project info
- Priority encouraged but not required
- Exposure/RUL/risk flags optional

### Bank-Ready (PCA Lite)
- Priority REQUIRED on all findings
- Exposure bucket REQUIRED on findings with priority 1-3
- RUL REQUIRED on all sections
- Condition rating REQUIRED on all sections
- Risk flags REQUIRED (can be empty array — explicit "none")
- Photos REQUIRED for findings with priority 1-2
- Export includes disclaimer language

## Section Seed Data
6 groups, 22 sections total, ~75 checklist items
(See inspection-mode-spec.md for full list)

## RLS Policies
Same pattern as DD: owner_id = auth.uid() on inspection_projects, cascade through joins.

## Storage
Reuse dd-captures bucket with path: {owner_id}/inspections/{project_id}/{section_id}/...
```
