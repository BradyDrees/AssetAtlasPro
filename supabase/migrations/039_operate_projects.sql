-- ============================================
-- Migration 039: Operate Project Board
-- ============================================
-- 7 tables: stage_templates, projects, stages, tasks, task_photos, task_parts, comments
-- RLS: PM-only in Phase 1
-- ============================================

-- 1. Stage Templates (user-customizable pipeline definitions)
CREATE TABLE IF NOT EXISTS operate_stage_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pm_user_id UUID REFERENCES auth.users(id),  -- NULL = system default
  project_type TEXT NOT NULL CHECK (project_type IN ('unit_turn','renovation','capital','seasonal','custom')),
  name TEXT NOT NULL,
  stages JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pm_user_id, project_type, name)
);

-- 2. Projects (master project record)
CREATE TABLE IF NOT EXISTS operate_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pm_user_id UUID NOT NULL REFERENCES auth.users(id),
  property_name TEXT,
  property_address TEXT,
  unit_number TEXT,
  project_type TEXT NOT NULL CHECK (project_type IN ('unit_turn','renovation','capital','seasonal','custom')),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','on_hold','completed','cancelled')),
  current_stage_id UUID,  -- FK added after stages table
  template_id UUID REFERENCES operate_stage_templates(id),
  due_date DATE,
  move_in_date DATE,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','urgent','emergency')),
  total_budget NUMERIC(12,2),
  notes TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Project Stages (per-project instances copied from template)
CREATE TABLE IF NOT EXISTS operate_project_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES operate_projects(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','skipped')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK: current_stage_id → operate_project_stages
ALTER TABLE operate_projects
  ADD CONSTRAINT fk_current_stage
  FOREIGN KEY (current_stage_id) REFERENCES operate_project_stages(id) ON DELETE SET NULL;

-- 4. Project Tasks (tasks within stages)
CREATE TABLE IF NOT EXISTS operate_project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID REFERENCES operate_project_stages(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES operate_projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  assignee_type TEXT DEFAULT 'pm' CHECK (assignee_type IN ('pm','vendor','internal')),
  assigned_user_id UUID REFERENCES auth.users(id),
  vendor_org_id UUID REFERENCES vendor_organizations(id),
  wo_id UUID REFERENCES vendor_work_orders(id),
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','blocked','skipped')),
  sort_order INT NOT NULL DEFAULT 0,
  cost NUMERIC(12,2),
  notes TEXT,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dispatch idempotency: one WO per task
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_wo_unique
  ON operate_project_tasks (wo_id) WHERE wo_id IS NOT NULL;

-- 5. Task Photos
CREATE TABLE IF NOT EXISTS operate_project_task_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES operate_project_tasks(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption TEXT,
  photo_type TEXT DEFAULT 'general' CHECK (photo_type IN ('before','after','progress','general')),
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Task Parts
CREATE TABLE IF NOT EXISTS operate_project_task_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES operate_project_tasks(id) ON DELETE CASCADE,
  catalog_item_id UUID,  -- FK to vendor_parts_catalog if exists
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Project Comments (project-level thread)
CREATE TABLE IF NOT EXISTS operate_project_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES operate_projects(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  body TEXT NOT NULL,
  parent_id UUID REFERENCES operate_project_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_op_projects_pm ON operate_projects (pm_user_id);
CREATE INDEX IF NOT EXISTS idx_op_projects_status ON operate_projects (status);
CREATE INDEX IF NOT EXISTS idx_op_projects_type ON operate_projects (project_type);
CREATE INDEX IF NOT EXISTS idx_op_projects_due ON operate_projects (due_date);
CREATE INDEX IF NOT EXISTS idx_op_projects_pm_status ON operate_projects (pm_user_id, status) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_op_stages_project ON operate_project_stages (project_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_op_tasks_project ON operate_project_tasks (project_id, stage_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_op_tasks_stage ON operate_project_tasks (stage_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_op_comments_project ON operate_project_comments (project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_op_photos_task ON operate_project_task_photos (task_id);
CREATE INDEX IF NOT EXISTS idx_op_parts_task ON operate_project_task_parts (task_id);

-- ============================================
-- RLS (Phase 1 — PM-only)
-- ============================================
ALTER TABLE operate_stage_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE operate_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE operate_project_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE operate_project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE operate_project_task_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE operate_project_task_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE operate_project_comments ENABLE ROW LEVEL SECURITY;

-- Templates: PM CRUDs own, everyone reads system defaults
CREATE POLICY templates_select ON operate_stage_templates FOR SELECT
  USING (pm_user_id = auth.uid() OR pm_user_id IS NULL);
CREATE POLICY templates_insert ON operate_stage_templates FOR INSERT
  WITH CHECK (pm_user_id = auth.uid());
CREATE POLICY templates_update ON operate_stage_templates FOR UPDATE
  USING (pm_user_id = auth.uid());
CREATE POLICY templates_delete ON operate_stage_templates FOR DELETE
  USING (pm_user_id = auth.uid());

-- Projects: PM CRUDs own
CREATE POLICY projects_select ON operate_projects FOR SELECT
  USING (pm_user_id = auth.uid());
CREATE POLICY projects_insert ON operate_projects FOR INSERT
  WITH CHECK (pm_user_id = auth.uid());
CREATE POLICY projects_update ON operate_projects FOR UPDATE
  USING (pm_user_id = auth.uid());
CREATE POLICY projects_delete ON operate_projects FOR DELETE
  USING (pm_user_id = auth.uid());

-- Child tables: access via project ownership
CREATE POLICY stages_select ON operate_project_stages FOR SELECT
  USING (project_id IN (SELECT id FROM operate_projects WHERE pm_user_id = auth.uid()));
CREATE POLICY stages_insert ON operate_project_stages FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM operate_projects WHERE pm_user_id = auth.uid()));
CREATE POLICY stages_update ON operate_project_stages FOR UPDATE
  USING (project_id IN (SELECT id FROM operate_projects WHERE pm_user_id = auth.uid()));
CREATE POLICY stages_delete ON operate_project_stages FOR DELETE
  USING (project_id IN (SELECT id FROM operate_projects WHERE pm_user_id = auth.uid()));

CREATE POLICY tasks_select ON operate_project_tasks FOR SELECT
  USING (project_id IN (SELECT id FROM operate_projects WHERE pm_user_id = auth.uid()));
CREATE POLICY tasks_insert ON operate_project_tasks FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM operate_projects WHERE pm_user_id = auth.uid()));
CREATE POLICY tasks_update ON operate_project_tasks FOR UPDATE
  USING (project_id IN (SELECT id FROM operate_projects WHERE pm_user_id = auth.uid()));
CREATE POLICY tasks_delete ON operate_project_tasks FOR DELETE
  USING (project_id IN (SELECT id FROM operate_projects WHERE pm_user_id = auth.uid()));

CREATE POLICY photos_select ON operate_project_task_photos FOR SELECT
  USING (task_id IN (SELECT t.id FROM operate_project_tasks t JOIN operate_projects p ON t.project_id = p.id WHERE p.pm_user_id = auth.uid()));
CREATE POLICY photos_insert ON operate_project_task_photos FOR INSERT
  WITH CHECK (task_id IN (SELECT t.id FROM operate_project_tasks t JOIN operate_projects p ON t.project_id = p.id WHERE p.pm_user_id = auth.uid()));
CREATE POLICY photos_delete ON operate_project_task_photos FOR DELETE
  USING (task_id IN (SELECT t.id FROM operate_project_tasks t JOIN operate_projects p ON t.project_id = p.id WHERE p.pm_user_id = auth.uid()));

CREATE POLICY parts_select ON operate_project_task_parts FOR SELECT
  USING (task_id IN (SELECT t.id FROM operate_project_tasks t JOIN operate_projects p ON t.project_id = p.id WHERE p.pm_user_id = auth.uid()));
CREATE POLICY parts_insert ON operate_project_task_parts FOR INSERT
  WITH CHECK (task_id IN (SELECT t.id FROM operate_project_tasks t JOIN operate_projects p ON t.project_id = p.id WHERE p.pm_user_id = auth.uid()));
CREATE POLICY parts_delete ON operate_project_task_parts FOR DELETE
  USING (task_id IN (SELECT t.id FROM operate_project_tasks t JOIN operate_projects p ON t.project_id = p.id WHERE p.pm_user_id = auth.uid()));

CREATE POLICY comments_select ON operate_project_comments FOR SELECT
  USING (project_id IN (SELECT id FROM operate_projects WHERE pm_user_id = auth.uid()));
CREATE POLICY comments_insert ON operate_project_comments FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM operate_projects WHERE pm_user_id = auth.uid()));
CREATE POLICY comments_update ON operate_project_comments FOR UPDATE
  USING (project_id IN (SELECT id FROM operate_projects WHERE pm_user_id = auth.uid()) AND author_id = auth.uid());
CREATE POLICY comments_delete ON operate_project_comments FOR DELETE
  USING (project_id IN (SELECT id FROM operate_projects WHERE pm_user_id = auth.uid()) AND author_id = auth.uid());

-- ============================================
-- Seed: System Default Templates
-- ============================================
INSERT INTO operate_stage_templates (pm_user_id, project_type, name, is_default, stages)
VALUES
  (NULL, 'unit_turn', 'Standard Turn Pipeline', true, '[
    {"name":"Vacate","sort_order":0,"default_tasks":[{"description":"Confirm move-out date","assignee_type":"pm"},{"description":"Pre-move-out inspection","assignee_type":"pm"},{"description":"Collect keys/fobs","assignee_type":"pm"}]},
    {"name":"Inspection","sort_order":1,"default_tasks":[{"description":"Full unit walkthrough","assignee_type":"pm"},{"description":"Document damage beyond normal wear","assignee_type":"pm"},{"description":"Photo documentation","assignee_type":"pm"}]},
    {"name":"Cleaning","sort_order":2,"default_tasks":[{"description":"Deep clean unit","assignee_type":"vendor"},{"description":"Carpet cleaning/replacement","assignee_type":"vendor"},{"description":"Window cleaning","assignee_type":"vendor"}]},
    {"name":"Paint","sort_order":3,"default_tasks":[{"description":"Patch and repair walls","assignee_type":"vendor"},{"description":"Paint walls and trim","assignee_type":"vendor"},{"description":"Touch up doors and frames","assignee_type":"vendor"}]},
    {"name":"Repairs","sort_order":4,"default_tasks":[{"description":"Fix/replace broken fixtures","assignee_type":"vendor"},{"description":"Plumbing repairs","assignee_type":"vendor"},{"description":"Electrical repairs","assignee_type":"vendor"},{"description":"Appliance check/replace","assignee_type":"vendor"}]},
    {"name":"Final Walk","sort_order":5,"default_tasks":[{"description":"Final inspection walkthrough","assignee_type":"pm"},{"description":"Verify all punch list items complete","assignee_type":"pm"},{"description":"Test all systems (HVAC, plumbing, electrical)","assignee_type":"pm"}]},
    {"name":"Ready to Lease","sort_order":6,"default_tasks":[{"description":"Professional photos","assignee_type":"vendor"},{"description":"Update listing","assignee_type":"pm"},{"description":"Set showing schedule","assignee_type":"pm"}]}
  ]'),
  (NULL, 'custom', 'Blank', true, '[]')
ON CONFLICT DO NOTHING;
