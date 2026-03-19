"use client";

import { useState, useMemo, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  OperateProject,
  ProjectStage,
  ProjectTask,
  StageStatus,
} from "@/app/actions/operate-projects";
import {
  advanceProjectStage,
  addStageToProject,
} from "@/app/actions/operate-projects";
import { StagePipelineBar } from "./stage-pipeline-bar";
import { TaskList } from "./task-list";

// -----------------------------------------------
// Types
// -----------------------------------------------
type TFn = (key: string, values?: Record<string, string | number>) => string;

type ProjectWithDetail = OperateProject & {
  stages: ProjectStage[];
  tasks: ProjectTask[];
};

interface ProjectDetailShellProps {
  project: ProjectWithDetail;
  messages: Record<string, unknown>;
}

// -----------------------------------------------
// Deep-access i18n helper (matches projects-board pattern)
// -----------------------------------------------
function getNestedValue(
  obj: Record<string, unknown>,
  path: string
): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

function createT(
  messages: Record<string, unknown>
): TFn {
  return (key: string, values?: Record<string, string | number>) => {
    let str = getNestedValue(messages, key);
    if (!str) return key;
    if (values) {
      for (const [k, v] of Object.entries(values)) {
        str = str!.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return str!;
  };
}

// -----------------------------------------------
// Badge colour maps
// -----------------------------------------------
const TYPE_COLORS: Record<string, string> = {
  unit_turn: "bg-green-500/15 text-green-400 border-green-500/30",
  renovation: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  capital: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  seasonal: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  custom: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-charcoal-500/15 text-content-tertiary border-edge-secondary",
  active: "bg-green-500/15 text-green-400 border-green-500/30",
  on_hold: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  completed: "bg-green-500/15 text-green-400 border-green-500/30",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
};

const PRIORITY_COLORS: Record<string, string> = {
  normal: "text-content-tertiary",
  urgent: "text-yellow-400",
  emergency: "text-red-400",
};

const STAGE_STATUS_ICON: Record<StageStatus, string> = {
  completed: "text-green-400",
  in_progress: "text-green-400",
  pending: "text-content-quaternary",
  skipped: "text-charcoal-500 line-through",
};

// -----------------------------------------------
// Main shell
// -----------------------------------------------
export function ProjectDetailShell({
  project: initialProject,
  messages,
}: ProjectDetailShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useMemo(() => createT(messages), [messages]);

  // Local state for optimistic updates
  const [project, setProject] = useState<ProjectWithDetail>(initialProject);

  // Which stage accordion sections are open
  const [openStages, setOpenStages] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    // Auto-expand the current stage
    if (project.current_stage_id) {
      initial.add(project.current_stage_id);
    }
    return initial;
  });

  // Add-stage form
  const [showAddStage, setShowAddStage] = useState(false);
  const [newStageName, setNewStageName] = useState("");

  const sortedStages = useMemo(
    () => [...project.stages].sort((a, b) => a.sort_order - b.sort_order),
    [project.stages]
  );

  const tasksByStage = useMemo(() => {
    const map = new Map<string, ProjectTask[]>();
    for (const task of project.tasks) {
      const key = task.stage_id ?? "__unstaged";
      const arr = map.get(key) ?? [];
      arr.push(task);
      map.set(key, arr);
    }
    return map;
  }, [project.tasks]);

  const currentStage = useMemo(
    () => sortedStages.find((s) => s.id === project.current_stage_id) ?? null,
    [sortedStages, project.current_stage_id]
  );

  // ---- handlers ----

  const toggleStage = useCallback((stageId: string) => {
    setOpenStages((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) {
        next.delete(stageId);
      } else {
        next.add(stageId);
      }
      return next;
    });
  }, []);

  const handleCompleteStage = useCallback(() => {
    startTransition(async () => {
      const result = await advanceProjectStage(project.id);
      if (result.success) {
        router.refresh();
      }
    });
  }, [project.id, router]);

  const handleSkipStage = useCallback(() => {
    // Skip reuses advance — it completes the current stage and moves on.
    // The advanceProjectStage action marks the current stage as completed,
    // which functions identically for a skip in the UI.
    startTransition(async () => {
      const result = await advanceProjectStage(project.id);
      if (result.success) {
        router.refresh();
      }
    });
  }, [project.id, router]);

  const handleAddStage = useCallback(() => {
    const name = newStageName.trim();
    if (!name) return;

    startTransition(async () => {
      const result = await addStageToProject(project.id, name);
      if (result.success) {
        setNewStageName("");
        setShowAddStage(false);
        router.refresh();
      }
    });
  }, [project.id, newStageName, router]);

  // Format helpers
  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d + "T00:00:00").toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString()}`;
  };

  return (
    <div className={`space-y-6 ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
      {/* ---- Back link ---- */}
      <Link
        href="/operate/projects"
        className="inline-flex items-center gap-1.5 text-sm text-content-tertiary hover:text-green-400 transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 19.5L8.25 12l7.5-7.5"
          />
        </svg>
        {t("detail.backToProjects")}
      </Link>

      {/* ---- Header row ---- */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-content-primary">
            {project.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {/* Type badge */}
            <span
              className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                TYPE_COLORS[project.project_type] ??
                "bg-charcoal-500/15 text-content-tertiary border-edge-secondary"
              }`}
            >
              {t(`projectTypes.${project.project_type}`)}
            </span>

            {/* Status badge */}
            <span
              className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                STATUS_COLORS[project.status] ??
                "bg-charcoal-500/15 text-content-tertiary border-edge-secondary"
              }`}
            >
              {t(`statuses.${project.status}`)}
            </span>

            {/* Priority */}
            {project.priority !== "normal" && (
              <span
                className={`text-[11px] font-semibold ${
                  PRIORITY_COLORS[project.priority] ?? "text-content-tertiary"
                }`}
              >
                {t(`priority.${project.priority}`)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ---- Content: two-column layout (stages + sidebar) ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ===== LEFT COLUMN: stages & tasks ===== */}
        <div className="lg:col-span-2 space-y-5">
          {/* Stage pipeline bar */}
          {sortedStages.length > 0 && (
            <div className="bg-surface-primary border border-edge-primary rounded-xl p-4">
              <h2 className="text-sm font-semibold text-content-primary mb-4">
                {t("detail.stagesTitle")}
              </h2>
              <div className="pb-4">
                <StagePipelineBar
                  stages={sortedStages}
                  currentStageId={project.current_stage_id}
                />
              </div>

              {/* Complete / Skip buttons for current stage */}
              {currentStage && project.status === "active" && (
                <div className="flex items-center gap-2 pt-3 border-t border-edge-secondary">
                  <span className="text-xs text-content-tertiary flex-1">
                    {t("card.currentStage", { stage: currentStage.stage_name })}
                  </span>
                  <button
                    type="button"
                    onClick={handleSkipStage}
                    disabled={isPending}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-edge-secondary text-content-tertiary hover:text-content-primary hover:border-edge-primary transition-colors disabled:opacity-50"
                  >
                    {t("detail.skipStage")}
                  </button>
                  <button
                    type="button"
                    onClick={handleCompleteStage}
                    disabled={isPending}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors disabled:opacity-50"
                  >
                    {t("detail.completeStage")}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Stage accordion */}
          {sortedStages.length > 0 ? (
            <div className="space-y-2">
              {sortedStages.map((stage) => {
                const isOpen = openStages.has(stage.id);
                const stageTasks = tasksByStage.get(stage.id) ?? [];
                const isCurrent = stage.id === project.current_stage_id;

                return (
                  <div
                    key={stage.id}
                    className={`bg-surface-primary border rounded-xl overflow-hidden transition-colors ${
                      isCurrent
                        ? "border-green-500/40"
                        : "border-edge-primary"
                    }`}
                  >
                    {/* Accordion header */}
                    <button
                      type="button"
                      onClick={() => toggleStage(stage.id)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-secondary/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Expand/collapse icon */}
                        <svg
                          className={`w-4 h-4 text-content-quaternary transition-transform shrink-0 ${
                            isOpen ? "rotate-90" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8.25 4.5l7.5 7.5-7.5 7.5"
                          />
                        </svg>

                        {/* Stage name */}
                        <span
                          className={`text-sm font-medium truncate ${
                            STAGE_STATUS_ICON[stage.status]
                          }`}
                        >
                          {stage.stage_name}
                        </span>

                        {/* Current indicator */}
                        {isCurrent && (
                          <span className="text-[9px] font-semibold uppercase tracking-wider bg-green-500/15 text-green-400 px-1.5 py-0.5 rounded shrink-0">
                            {t("stageStatuses.in_progress")}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {/* Stage status badge */}
                        {!isCurrent && (
                          <span className="text-[10px] text-content-quaternary">
                            {t(`stageStatuses.${stage.status}`)}
                          </span>
                        )}

                        {/* Task count */}
                        <span className="text-[10px] text-content-quaternary">
                          {t("card.tasks", {
                            done: stageTasks.filter(
                              (tk) =>
                                tk.status === "completed" ||
                                tk.status === "skipped"
                            ).length,
                            total: stageTasks.length,
                          })}
                        </span>
                      </div>
                    </button>

                    {/* Accordion body */}
                    {isOpen && (
                      <div className="border-t border-edge-secondary px-4 py-3">
                        <TaskList
                          tasks={stageTasks}
                          stageId={stage.id}
                          projectId={project.id}
                          t={t}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-surface-primary border border-edge-primary rounded-xl">
              <p className="text-sm text-content-tertiary">
                {t("detail.noStages")}
              </p>
            </div>
          )}

          {/* Add Stage form */}
          <div className="bg-surface-primary border border-edge-primary rounded-xl p-4">
            {showAddStage ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  placeholder={t("detail.addStageNamePlaceholder")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddStage();
                    if (e.key === "Escape") {
                      setShowAddStage(false);
                      setNewStageName("");
                    }
                  }}
                  className="flex-1 text-sm bg-surface-secondary border border-edge-secondary rounded-lg px-3 py-2 text-content-primary placeholder:text-content-quaternary focus:outline-none focus:border-green-500/50 transition-colors"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddStage}
                  disabled={!newStageName.trim() || isPending}
                  className="text-xs font-medium px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors disabled:opacity-50"
                >
                  {t("detail.addStageButton")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddStage(false);
                    setNewStageName("");
                  }}
                  className="text-xs font-medium px-3 py-2 rounded-lg border border-edge-secondary text-content-tertiary hover:text-content-primary transition-colors"
                >
                  {t("detail.cancel")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddStage(true)}
                className="flex items-center gap-1.5 text-sm text-content-tertiary hover:text-green-400 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                {t("detail.addStage")}
              </button>
            )}
          </div>
        </div>

        {/* ===== RIGHT COLUMN: project info sidebar ===== */}
        <div className="space-y-4">
          <div className="bg-surface-primary border border-edge-primary rounded-xl p-4 space-y-4">
            <h3 className="text-sm font-semibold text-content-primary">
              {t("detail.projectInfo")}
            </h3>

            <div className="space-y-3">
              {/* Property */}
              {project.property_name && (
                <InfoRow
                  label={t("create.propertyName")}
                  value={project.property_name}
                />
              )}

              {/* Address */}
              {project.property_address && (
                <InfoRow
                  label={t("create.propertyAddress")}
                  value={project.property_address}
                />
              )}

              {/* Unit */}
              {project.unit_number && (
                <InfoRow
                  label={t("create.unitNumber")}
                  value={project.unit_number}
                />
              )}

              {/* Due date */}
              <InfoRow
                label={t("create.dueDate")}
                value={formatDate(project.due_date)}
              />

              {/* Move-in date */}
              {project.move_in_date && (
                <InfoRow
                  label={t("create.moveInDate")}
                  value={formatDate(project.move_in_date)}
                />
              )}

              {/* Budget */}
              {project.total_budget != null && (
                <InfoRow
                  label={t("create.budget")}
                  value={formatCurrency(project.total_budget)}
                />
              )}

              {/* Cost to date */}
              <InfoRow
                label={t("cost.total")}
                value={formatCurrency(project.cost_to_date)}
              />

              {/* Budget remaining */}
              {project.total_budget != null && (
                <InfoRow
                  label={t("cost.remaining")}
                  value={formatCurrency(
                    project.total_budget - project.cost_to_date
                  )}
                  valueClassName={
                    project.total_budget - project.cost_to_date < 0
                      ? "text-red-400"
                      : "text-green-400"
                  }
                />
              )}

              {/* Stage progress */}
              <InfoRow
                label={t("card.stages", { done: "", total: "" }).replace(
                  / of /,
                  ""
                ).trim() || t("detail.stagesTitle")}
                value={t("card.stages", {
                  done: project.stage_progress.done,
                  total: project.stage_progress.total,
                })}
              />

              {/* Task progress */}
              <InfoRow
                label={t("detail.tasksTitle")}
                value={t("card.tasks", {
                  done: project.task_progress.done,
                  total: project.task_progress.total,
                })}
              />

              {/* Created */}
              <InfoRow
                label="Created"
                value={new Date(project.created_at).toLocaleDateString(
                  undefined,
                  { month: "short", day: "numeric", year: "numeric" }
                )}
              />
            </div>

            {/* Notes */}
            {project.notes && (
              <div className="pt-3 border-t border-edge-secondary">
                <p className="text-xs text-content-quaternary mb-1">
                  {t("create.notes")}
                </p>
                <p className="text-sm text-content-secondary whitespace-pre-wrap">
                  {project.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------
// Sidebar info row helper
// -----------------------------------------------
function InfoRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-content-quaternary shrink-0">{label}</span>
      <span
        className={`text-sm font-medium text-right truncate ${
          valueClassName ?? "text-content-secondary"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
