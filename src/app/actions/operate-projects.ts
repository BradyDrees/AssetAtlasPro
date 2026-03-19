"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePmRole, logActivity } from "@/lib/vendor/role-helpers";

// ============================================
// Types
// ============================================

export type ProjectType = "unit_turn" | "renovation" | "capital" | "seasonal" | "custom";
export type ProjectStatus = "draft" | "active" | "on_hold" | "completed" | "cancelled";
export type StageStatus = "pending" | "in_progress" | "completed" | "skipped";
export type TaskStatus = "pending" | "in_progress" | "completed" | "blocked" | "skipped";
export type ProjectPriority = "normal" | "urgent" | "emergency";

export interface StageTemplateStage {
  name: string;
  sort_order: number;
  default_tasks: { description: string; assignee_type: string }[];
}

export interface StageTemplate {
  id: string;
  pm_user_id: string | null;
  project_type: ProjectType;
  name: string;
  stages: StageTemplateStage[];
  is_default: boolean;
}

export interface OperateProject {
  id: string;
  pm_user_id: string;
  property_name: string | null;
  property_address: string | null;
  unit_number: string | null;
  project_type: ProjectType;
  title: string;
  status: ProjectStatus;
  current_stage_id: string | null;
  template_id: string | null;
  due_date: string | null;
  move_in_date: string | null;
  priority: ProjectPriority;
  total_budget: number | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  // Computed
  urgency_date: string | null;
  current_stage_name: string | null;
  stage_progress: { done: number; total: number };
  task_progress: { done: number; total: number };
  cost_to_date: number;
}

export interface ProjectStage {
  id: string;
  project_id: string;
  stage_name: string;
  sort_order: number;
  status: StageStatus;
  started_at: string | null;
  completed_at: string | null;
}

export interface ProjectTask {
  id: string;
  stage_id: string | null;
  project_id: string;
  description: string;
  assignee_type: string;
  assigned_user_id: string | null;
  vendor_org_id: string | null;
  wo_id: string | null;
  due_date: string | null;
  status: TaskStatus;
  sort_order: number;
  cost: number | null;
  notes: string | null;
  completed_at: string | null;
  completed_by: string | null;
}

export interface ProjectFilters {
  search?: string;
  project_type?: ProjectType;
  status?: ProjectStatus;
  includeArchived?: boolean;
}

export interface CreateProjectInput {
  project_type: ProjectType;
  template_id: string;
  title: string;
  property_name?: string;
  property_address?: string;
  unit_number?: string;
  due_date?: string;
  move_in_date?: string;
  total_budget?: number;
  notes?: string;
  priority?: ProjectPriority;
  custom_stages?: { name: string; sort_order: number }[];
}

// ============================================
// Get Projects (list with computed fields)
// ============================================

export async function getOperateProjects(
  filters: ProjectFilters = {}
): Promise<{ data: OperateProject[]; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  // Fetch projects
  let query = supabase
    .from("operate_projects")
    .select("*")
    .eq("pm_user_id", user.id);

  if (!filters.includeArchived) {
    query = query.is("archived_at", null);
  }

  if (filters.project_type) {
    query = query.eq("project_type", filters.project_type);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.search) {
    query = query.or(
      `property_name.ilike.%${filters.search}%,title.ilike.%${filters.search}%,unit_number.ilike.%${filters.search}%`
    );
  }

  const { data: projects, error } = await query.order("created_at", { ascending: false });

  if (error) return { data: [], error: error.message };
  if (!projects || projects.length === 0) return { data: [] };

  // Batch fetch stages and tasks for all projects
  const projectIds = projects.map((p) => p.id);

  const [stagesResult, tasksResult] = await Promise.all([
    supabase
      .from("operate_project_stages")
      .select("id, project_id, stage_name, sort_order, status")
      .in("project_id", projectIds),
    supabase
      .from("operate_project_tasks")
      .select("id, project_id, status, cost")
      .in("project_id", projectIds),
  ]);

  const stages = stagesResult.data ?? [];
  const tasks = tasksResult.data ?? [];

  // Group by project
  const stagesByProject = new Map<string, typeof stages>();
  for (const s of stages) {
    const arr = stagesByProject.get(s.project_id) ?? [];
    arr.push(s);
    stagesByProject.set(s.project_id, arr);
  }

  const tasksByProject = new Map<string, typeof tasks>();
  for (const t of tasks) {
    const arr = tasksByProject.get(t.project_id) ?? [];
    arr.push(t);
    tasksByProject.set(t.project_id, arr);
  }

  const enriched: OperateProject[] = projects.map((p) => {
    const pStages = stagesByProject.get(p.id) ?? [];
    const pTasks = tasksByProject.get(p.id) ?? [];

    const stageDone = pStages.filter(
      (s) => s.status === "completed" || s.status === "skipped"
    ).length;
    const taskDone = pTasks.filter(
      (t) => t.status === "completed" || t.status === "skipped"
    ).length;
    const costSum = pTasks.reduce((sum, t) => sum + (Number(t.cost) || 0), 0);

    // Find current stage name
    const currentStage = pStages.find((s) => s.id === p.current_stage_id);

    // Compute urgency_date
    const urgencyDate = p.move_in_date ?? p.due_date ?? null;

    return {
      ...p,
      urgency_date: urgencyDate,
      current_stage_name: currentStage?.stage_name ?? null,
      stage_progress: { done: stageDone, total: pStages.length },
      task_progress: { done: taskDone, total: pTasks.length },
      cost_to_date: costSum,
    } as OperateProject;
  });

  // Sort by urgency_date ASC (nulls last)
  enriched.sort((a, b) => {
    if (!a.urgency_date && !b.urgency_date) return 0;
    if (!a.urgency_date) return 1;
    if (!b.urgency_date) return -1;
    return a.urgency_date.localeCompare(b.urgency_date);
  });

  return { data: enriched };
}

// ============================================
// Create Project (atomic: project + stages + tasks)
// ============================================

export async function createOperateProject(
  input: CreateProjectInput
): Promise<{ data: { id: string } | null; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  // Fetch template
  const { data: template } = await supabase
    .from("operate_stage_templates")
    .select("*")
    .eq("id", input.template_id)
    .single();

  if (!template) {
    return { data: null, error: "Template not found" };
  }

  const templateStages = (template.stages ?? []) as StageTemplateStage[];

  // Use custom stages if provided (for custom projects), otherwise template stages
  const stagesToCreate = input.custom_stages && input.custom_stages.length > 0
    ? input.custom_stages.map((s) => ({ name: s.name, sort_order: s.sort_order, default_tasks: [] }))
    : templateStages;

  // 1. Create project
  const projectId = crypto.randomUUID();
  const { error: projError } = await supabase
    .from("operate_projects")
    .insert({
      id: projectId,
      pm_user_id: user.id,
      project_type: input.project_type,
      title: input.title,
      property_name: input.property_name ?? null,
      property_address: input.property_address ?? null,
      unit_number: input.unit_number ?? null,
      template_id: input.template_id,
      due_date: input.due_date ?? null,
      move_in_date: input.move_in_date ?? null,
      total_budget: input.total_budget ?? null,
      notes: input.notes ?? null,
      priority: input.priority ?? "normal",
      status: "draft",
    });

  if (projError) {
    console.error("Project create failed:", projError);
    return { data: null, error: projError.message };
  }

  // 2. Create stages
  let firstStageId: string | null = null;

  if (stagesToCreate.length > 0) {
    const stageRows = stagesToCreate.map((s, i) => ({
      id: crypto.randomUUID(),
      project_id: projectId,
      stage_name: s.name,
      sort_order: s.sort_order ?? i,
      status: i === 0 ? "in_progress" : "pending",
      started_at: i === 0 ? new Date().toISOString() : null,
    }));

    firstStageId = stageRows[0].id;

    const { error: stagesError } = await supabase
      .from("operate_project_stages")
      .insert(stageRows);

    if (stagesError) {
      console.error("Stage insert failed:", stagesError);
      await supabase.from("operate_projects").delete().eq("id", projectId);
      return { data: null, error: stagesError.message };
    }

    // 3. Create default tasks for each stage
    const taskRows: {
      id: string;
      stage_id: string;
      project_id: string;
      description: string;
      assignee_type: string;
      sort_order: number;
    }[] = [];

    for (let si = 0; si < stagesToCreate.length; si++) {
      const stage = stagesToCreate[si];
      const stageId = stageRows[si].id;
      for (let ti = 0; ti < (stage.default_tasks ?? []).length; ti++) {
        const task = stage.default_tasks[ti];
        taskRows.push({
          id: crypto.randomUUID(),
          stage_id: stageId,
          project_id: projectId,
          description: task.description,
          assignee_type: task.assignee_type ?? "pm",
          sort_order: ti,
        });
      }
    }

    if (taskRows.length > 0) {
      const { error: tasksError } = await supabase
        .from("operate_project_tasks")
        .insert(taskRows);

      if (tasksError) {
        console.error("Task insert failed:", tasksError);
        // Stages cascade delete with project
        await supabase.from("operate_projects").delete().eq("id", projectId);
        return { data: null, error: tasksError.message };
      }
    }

    // 4. Set current_stage_id
    await supabase
      .from("operate_projects")
      .update({ current_stage_id: firstStageId })
      .eq("id", projectId);
  }

  await logActivity({
    entityType: "action_item",
    entityId: projectId,
    action: "project_created",
    actorRole: "pm",
    metadata: {
      project_type: input.project_type,
      title: input.title,
      stages_count: stagesToCreate.length,
    },
  });

  return { data: { id: projectId } };
}

// ============================================
// Move Project to Status (Kanban DnD)
// ============================================

export async function moveProjectToStatus(
  projectId: string,
  newStatus: ProjectStatus
): Promise<{ success: boolean; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();

  // If moving to completed, check all stages resolved
  if (newStatus === "completed") {
    const { data: unresolvedStages } = await supabase
      .from("operate_project_stages")
      .select("id")
      .eq("project_id", projectId)
      .not("status", "in", '("completed","skipped")')
      .limit(1);

    // Use a different approach for the check
    const { data: allStages } = await supabase
      .from("operate_project_stages")
      .select("id, status")
      .eq("project_id", projectId);

    const unresolved = (allStages ?? []).filter(
      (s) => s.status !== "completed" && s.status !== "skipped"
    );

    if (unresolved.length > 0) {
      return {
        success: false,
        error: "Cannot complete project: unresolved stages remain",
      };
    }
  }

  const { error } = await supabase
    .from("operate_projects")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", projectId);

  if (error) return { success: false, error: error.message };

  return { success: true };
}

// ============================================
// Update Project Metadata
// ============================================

export async function updateOperateProject(
  projectId: string,
  updates: {
    title?: string;
    property_name?: string;
    property_address?: string;
    unit_number?: string;
    due_date?: string | null;
    move_in_date?: string | null;
    total_budget?: number | null;
    notes?: string | null;
    priority?: ProjectPriority;
  }
): Promise<{ success: boolean; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();

  const { error } = await supabase
    .from("operate_projects")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", projectId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ============================================
// Archive Project
// ============================================

export async function archiveOperateProject(
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();

  const { error } = await supabase
    .from("operate_projects")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", projectId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ============================================
// Get Stage Templates
// ============================================

export async function getStageTemplates(): Promise<{
  data: StageTemplate[];
  error?: string;
}> {
  await requirePmRole();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("operate_stage_templates")
    .select("*")
    .or(`pm_user_id.eq.${user.id},pm_user_id.is.null`)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as StageTemplate[] };
}

// ============================================
// Phase 2: Advance Stage
// ============================================

export async function advanceProjectStage(
  projectId: string
): Promise<{ success: boolean; error?: string; autoCompleted?: boolean }> {
  await requirePmRole();
  const supabase = await createClient();

  // Get current project
  const { data: project } = await supabase
    .from("operate_projects")
    .select("current_stage_id")
    .eq("id", projectId)
    .single();

  if (!project) return { success: false, error: "Project not found" };
  if (!project.current_stage_id) {
    return { success: false, error: "No current stage to advance" };
  }

  // Complete current stage
  const now = new Date().toISOString();
  await supabase
    .from("operate_project_stages")
    .update({ status: "completed", completed_at: now, updated_at: now })
    .eq("id", project.current_stage_id);

  // Find next pending stage
  const { data: nextStages } = await supabase
    .from("operate_project_stages")
    .select("id")
    .eq("project_id", projectId)
    .eq("status", "pending")
    .order("sort_order", { ascending: true })
    .limit(1);

  if (nextStages && nextStages.length > 0) {
    const nextId = nextStages[0].id;
    await supabase
      .from("operate_project_stages")
      .update({ status: "in_progress", started_at: now, updated_at: now })
      .eq("id", nextId);
    await supabase
      .from("operate_projects")
      .update({ current_stage_id: nextId, updated_at: now })
      .eq("id", projectId);
    return { success: true };
  } else {
    // All stages done → auto-complete project
    await supabase
      .from("operate_projects")
      .update({ status: "completed", current_stage_id: null, updated_at: now })
      .eq("id", projectId);
    return { success: true, autoCompleted: true };
  }
}

// ============================================
// Phase 2: Task CRUD
// ============================================

export async function createProjectTask(
  stageId: string | null,
  input: {
    project_id: string;
    description: string;
    assignee_type?: string;
    due_date?: string;
    notes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();

  // Get max sort_order
  const { data: existing } = await supabase
    .from("operate_project_tasks")
    .select("sort_order")
    .eq("project_id", input.project_id)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { error } = await supabase.from("operate_project_tasks").insert({
    stage_id: stageId,
    project_id: input.project_id,
    description: input.description,
    assignee_type: input.assignee_type ?? "pm",
    due_date: input.due_date ?? null,
    notes: input.notes ?? null,
    sort_order: nextOrder,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateProjectTask(
  taskId: string,
  updates: {
    description?: string;
    status?: TaskStatus;
    assignee_type?: string;
    assigned_user_id?: string | null;
    vendor_org_id?: string | null;
    due_date?: string | null;
    cost?: number | null;
    notes?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const updateData: Record<string, unknown> = { ...updates, updated_at: new Date().toISOString() };

  // If completing, set completed_at and completed_by
  if (updates.status === "completed") {
    updateData.completed_at = new Date().toISOString();
    updateData.completed_by = user?.id ?? null;
  }

  const { error } = await supabase
    .from("operate_project_tasks")
    .update(updateData)
    .eq("id", taskId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteProjectTask(
  taskId: string
): Promise<{ success: boolean; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();

  const { error } = await supabase
    .from("operate_project_tasks")
    .delete()
    .eq("id", taskId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ============================================
// Phase 2: Add Stage to Project
// ============================================

export async function addStageToProject(
  projectId: string,
  stageName: string
): Promise<{ success: boolean; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("operate_project_stages")
    .select("sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { error } = await supabase.from("operate_project_stages").insert({
    project_id: projectId,
    stage_name: stageName,
    sort_order: nextOrder,
    status: "pending",
  });

  if (error) return { success: false, error: error.message };

  // If project has no current stage, set this as current
  const { data: project } = await supabase
    .from("operate_projects")
    .select("current_stage_id")
    .eq("id", projectId)
    .single();

  if (project && !project.current_stage_id) {
    const { data: firstStage } = await supabase
      .from("operate_project_stages")
      .select("id")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true })
      .limit(1)
      .single();

    if (firstStage) {
      await supabase
        .from("operate_projects")
        .update({ current_stage_id: firstStage.id })
        .eq("id", projectId);
      await supabase
        .from("operate_project_stages")
        .update({ status: "in_progress", started_at: new Date().toISOString() })
        .eq("id", firstStage.id);
    }
  }

  return { success: true };
}

// ============================================
// Phase 2: Get Single Project (detail)
// ============================================

export async function getOperateProject(
  projectId: string
): Promise<{ data: OperateProject & { stages: ProjectStage[]; tasks: ProjectTask[] } | null; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();

  const [projResult, stagesResult, tasksResult] = await Promise.all([
    supabase.from("operate_projects").select("*").eq("id", projectId).single(),
    supabase.from("operate_project_stages").select("*").eq("project_id", projectId).order("sort_order"),
    supabase.from("operate_project_tasks").select("*").eq("project_id", projectId).order("sort_order"),
  ]);

  if (projResult.error || !projResult.data) {
    return { data: null, error: projResult.error?.message ?? "Not found" };
  }

  const p = projResult.data;
  const pStages = stagesResult.data ?? [];
  const pTasks = tasksResult.data ?? [];

  const stageDone = pStages.filter((s) => s.status === "completed" || s.status === "skipped").length;
  const taskDone = pTasks.filter((t) => t.status === "completed" || t.status === "skipped").length;
  const costSum = pTasks.reduce((sum, t) => sum + (Number(t.cost) || 0), 0);
  const currentStage = pStages.find((s) => s.id === p.current_stage_id);

  return {
    data: {
      ...p,
      urgency_date: p.move_in_date ?? p.due_date ?? null,
      current_stage_name: currentStage?.stage_name ?? null,
      stage_progress: { done: stageDone, total: pStages.length },
      task_progress: { done: taskDone, total: pTasks.length },
      cost_to_date: costSum,
      stages: pStages as ProjectStage[],
      tasks: pTasks as ProjectTask[],
    } as OperateProject & { stages: ProjectStage[]; tasks: ProjectTask[] },
  };
}

// ============================================
// Phase 3: Comments
// ============================================

export interface ProjectComment {
  id: string;
  project_id: string;
  author_id: string;
  author_name: string;
  body: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function getProjectComments(
  projectId: string
): Promise<{ data: ProjectComment[]; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();

  const { data: comments, error } = await supabase
    .from("operate_project_comments")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) return { data: [], error: error.message };

  // Batch fetch author names
  const authorIds = [...new Set((comments ?? []).map((c) => c.author_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .in("id", authorIds);

  const nameMap = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Unknown",
    ])
  );

  return {
    data: (comments ?? []).map((c) => ({
      ...c,
      author_name: nameMap.get(c.author_id) ?? "Unknown",
    })) as ProjectComment[],
  };
}

export async function addProjectComment(
  projectId: string,
  body: string,
  parentId?: string
): Promise<{ success: boolean; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase.from("operate_project_comments").insert({
    project_id: projectId,
    author_id: user.id,
    body: body.trim(),
    parent_id: parentId ?? null,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ============================================
// Phase 3: Cost Summary
// ============================================

export interface ProjectCostSummary {
  taskCosts: number;
  partsCosts: number;
  woCosts: number;
  total: number;
  budget: number | null;
  remaining: number | null;
}

export async function getProjectCostSummary(
  projectId: string
): Promise<{ data: ProjectCostSummary | null; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();

  const [projResult, tasksResult, partsResult] = await Promise.all([
    supabase.from("operate_projects").select("total_budget").eq("id", projectId).single(),
    supabase.from("operate_project_tasks").select("id, cost, wo_id").eq("project_id", projectId),
    supabase.from("operate_project_task_parts").select("total, task_id").eq(
      "task_id",
      supabase.from("operate_project_tasks").select("id").eq("project_id", projectId)
    ),
  ]);

  const tasks = tasksResult.data ?? [];
  const taskCosts = tasks.reduce((sum, t) => sum + (Number(t.cost) || 0), 0);

  // Parts costs — fetch all parts for this project's tasks
  const taskIds = tasks.map((t) => t.id);
  let partsCosts = 0;
  if (taskIds.length > 0) {
    const { data: parts } = await supabase
      .from("operate_project_task_parts")
      .select("total")
      .in("task_id", taskIds);
    partsCosts = (parts ?? []).reduce((sum, p) => sum + (Number(p.total) || 0), 0);
  }

  // WO costs would come from vendor_work_orders — simplified for now
  const woCosts = 0;

  const budget = projResult.data?.total_budget ? Number(projResult.data.total_budget) : null;
  const total = taskCosts + partsCosts + woCosts;

  return {
    data: {
      taskCosts,
      partsCosts,
      woCosts,
      total,
      budget,
      remaining: budget !== null ? budget - total : null,
    },
  };
}

// ============================================
// Phase 4: Template CRUD
// ============================================

export async function createStageTemplate(input: {
  project_type: ProjectType;
  name: string;
  stages: StageTemplateStage[];
}): Promise<{ success: boolean; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase.from("operate_stage_templates").insert({
    pm_user_id: user.id,
    project_type: input.project_type,
    name: input.name,
    stages: input.stages,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateStageTemplate(
  templateId: string,
  updates: { name?: string; stages?: StageTemplateStage[] }
): Promise<{ success: boolean; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();

  const { error } = await supabase
    .from("operate_stage_templates")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", templateId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteStageTemplate(
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();

  const { error } = await supabase
    .from("operate_stage_templates")
    .delete()
    .eq("id", templateId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function cloneSystemTemplate(
  templateId: string,
  newName: string
): Promise<{ success: boolean; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: source } = await supabase
    .from("operate_stage_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (!source) return { success: false, error: "Template not found" };

  const { error } = await supabase.from("operate_stage_templates").insert({
    pm_user_id: user.id,
    project_type: source.project_type,
    name: newName,
    stages: source.stages,
    is_default: false,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}
