"use client";

import { useMemo, useTransition } from "react";
import type { OperateProject } from "@/app/actions/operate-projects";
import { StagePipelineBar } from "./stage-pipeline-bar";

// -----------------------------------------------
// Translation helper type
// -----------------------------------------------
type TFn = (key: string, values?: Record<string, string | number>) => string;

interface ProjectCardProps {
  project: OperateProject;
  t: TFn;
  onAdvanceStage?: (projectId: string) => void;
  /** If provided, wraps the card in an interactive container */
  draggable?: boolean;
  onDragStart?: () => void;
}

// -----------------------------------------------
// Project type badge colours
// -----------------------------------------------
const TYPE_COLORS: Record<string, string> = {
  unit_turn: "bg-green-500/15 text-green-400 border-green-500/30",
  renovation: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  capital: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  seasonal: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  custom: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

// -----------------------------------------------
// Urgency helpers
// -----------------------------------------------
function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
}

function urgencyBadge(
  days: number,
  t: TFn
): { label: string; className: string } {
  if (days < 0) {
    return {
      label: t("card.overdue"),
      className: "bg-red-500/15 text-red-400",
    };
  }
  if (days === 0) {
    return {
      label: t("card.dueToday"),
      className: "bg-red-500/15 text-red-400",
    };
  }
  if (days <= 3) {
    return {
      label: t("card.dueIn", { days }),
      className: "bg-red-500/15 text-red-400",
    };
  }
  if (days <= 7) {
    return {
      label: t("card.dueIn", { days }),
      className: "bg-yellow-500/15 text-yellow-400",
    };
  }
  return {
    label: t("card.dueIn", { days }),
    className: "bg-green-500/15 text-green-400",
  };
}

// -----------------------------------------------
// Compact stage segments (reused from pipeline bar concept)
// -----------------------------------------------
function CompactStageProgress({
  done,
  total,
}: {
  done: number;
  total: number;
}) {
  if (total === 0) return null;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="w-full h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
      <div
        className="h-full bg-green-500 rounded-full transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// -----------------------------------------------
// Main component
// -----------------------------------------------
export function ProjectCard({
  project,
  t,
  onAdvanceStage,
  draggable = false,
  onDragStart,
}: ProjectCardProps) {
  const [isPending, startTransition] = useTransition();

  const typeColor =
    TYPE_COLORS[project.project_type] ??
    "bg-charcoal-500/15 text-content-tertiary border-edge-secondary";

  const urgency = useMemo(() => {
    if (!project.urgency_date) return null;
    const days = daysUntil(project.urgency_date);
    return urgencyBadge(days, t);
  }, [project.urgency_date, t]);

  const moveInDays = useMemo(() => {
    if (!project.move_in_date) return null;
    return daysUntil(project.move_in_date);
  }, [project.move_in_date]);

  const costDisplay = useMemo(() => {
    if (project.cost_to_date <= 0) return t("card.noCost");
    return t("card.costToDate", {
      amount: project.cost_to_date.toLocaleString(),
    });
  }, [project.cost_to_date, t]);

  const handleAdvance = () => {
    if (!onAdvanceStage) return;
    startTransition(() => {
      onAdvanceStage(project.id);
    });
  };

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      className={`
        bg-surface-primary rounded-xl border border-edge-primary p-4
        hover:border-green-500/40 transition-colors
        ${draggable ? "cursor-grab active:cursor-grabbing" : ""}
        ${isPending ? "opacity-60 pointer-events-none" : ""}
      `}
    >
      {/* Header row: title + type badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-content-primary truncate flex-1 min-w-0">
          {project.title}
        </h3>
        <span
          className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border ${typeColor}`}
        >
          {t(`projectTypes.${project.project_type}`)}
        </span>
      </div>

      {/* Property + Unit */}
      <div className="flex items-center gap-1.5 text-xs text-content-tertiary mb-3">
        {project.property_name && (
          <span className="truncate">{project.property_name}</span>
        )}
        {project.property_name && project.unit_number && (
          <span className="text-content-quaternary">/</span>
        )}
        {project.unit_number && (
          <span className="text-content-quaternary">
            {project.unit_number}
          </span>
        )}
      </div>

      {/* Stage progress bar */}
      {project.stage_progress.total > 0 ? (
        <div className="mb-3">
          <CompactStageProgress
            done={project.stage_progress.done}
            total={project.stage_progress.total}
          />
          <p className="text-[10px] text-content-quaternary mt-1">
            {t("card.stages", {
              done: project.stage_progress.done,
              total: project.stage_progress.total,
            })}
          </p>
        </div>
      ) : (
        <p className="text-[10px] text-content-quaternary mb-3">
          {t("card.noStages")}
        </p>
      )}

      {/* Current stage label */}
      {project.current_stage_name && (
        <p className="text-[10px] text-green-400 font-medium mb-2 truncate">
          {t("card.currentStage", { stage: project.current_stage_name })}
        </p>
      )}

      {/* Metrics row */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {/* Task count */}
        <span className="text-[10px] text-content-quaternary">
          {t("card.tasks", {
            done: project.task_progress.done,
            total: project.task_progress.total,
          })}
        </span>

        {/* Cost */}
        <span className="text-[10px] text-content-quaternary">
          {costDisplay}
        </span>

        {/* Move-in countdown */}
        {moveInDays !== null && project.project_type === "unit_turn" && (
          <span
            className={`text-[10px] font-medium ${
              moveInDays <= 3
                ? "text-red-400"
                : moveInDays <= 7
                  ? "text-yellow-400"
                  : "text-green-400"
            }`}
          >
            {t("card.daysUntilMoveIn", { days: moveInDays })}
          </span>
        )}
      </div>

      {/* Bottom row: urgency badge + advance button */}
      <div className="flex items-center justify-between gap-2">
        {urgency ? (
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${urgency.className}`}
          >
            {urgency.label}
          </span>
        ) : (
          <span />
        )}

        {onAdvanceStage &&
          project.status === "active" &&
          project.current_stage_id && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAdvance();
              }}
              disabled={isPending}
              className="text-[10px] font-medium px-2.5 py-1 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors disabled:opacity-50"
            >
              {t("card.advanceStage")}
            </button>
          )}
      </div>
    </div>
  );
}
