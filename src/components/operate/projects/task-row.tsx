"use client";

import { useTransition } from "react";
import type { ProjectTask, TaskStatus } from "@/app/actions/operate-projects";

// -----------------------------------------------
// Types
// -----------------------------------------------
type TFn = (key: string, values?: Record<string, string | number>) => string;

interface TaskRowProps {
  task: ProjectTask;
  t: TFn;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onDelete: (taskId: string) => void;
}

// -----------------------------------------------
// Status badge colours
// -----------------------------------------------
const TASK_STATUS_CLASSES: Record<
  TaskStatus,
  { badge: string; checkbox: string }
> = {
  pending: {
    badge: "bg-charcoal-500/15 text-content-tertiary",
    checkbox: "border-edge-secondary hover:border-green-500/50",
  },
  in_progress: {
    badge: "bg-blue-500/15 text-blue-400",
    checkbox: "border-blue-500/50 hover:border-green-500/50",
  },
  completed: {
    badge: "bg-green-500/15 text-green-400",
    checkbox: "border-green-500 bg-green-600",
  },
  blocked: {
    badge: "bg-red-500/15 text-red-400",
    checkbox: "border-red-500/50 hover:border-green-500/50",
  },
  skipped: {
    badge: "bg-charcoal-600/15 text-charcoal-400",
    checkbox: "border-charcoal-600 bg-charcoal-700",
  },
};

// -----------------------------------------------
// Assignee type icons
// -----------------------------------------------
const ASSIGNEE_ICONS: Record<string, { label: string; className: string }> = {
  pm: { label: "PM", className: "bg-green-500/15 text-green-400" },
  vendor: { label: "V", className: "bg-blue-500/15 text-blue-400" },
  owner: { label: "O", className: "bg-amber-500/15 text-amber-400" },
  tenant: { label: "T", className: "bg-purple-500/15 text-purple-400" },
};

// -----------------------------------------------
// Component
// -----------------------------------------------
export function TaskRow({ task, t, onStatusChange, onDelete }: TaskRowProps) {
  const [isPending, startTransition] = useTransition();
  const statusClasses = TASK_STATUS_CLASSES[task.status];
  const isResolved = task.status === "completed" || task.status === "skipped";

  const handleCheckbox = () => {
    const nextStatus: TaskStatus = isResolved ? "pending" : "completed";
    startTransition(() => {
      onStatusChange(task.id, nextStatus);
    });
  };

  const handleDelete = () => {
    startTransition(() => {
      onDelete(task.id);
    });
  };

  const assignee = ASSIGNEE_ICONS[task.assignee_type] ?? {
    label: task.assignee_type?.charAt(0).toUpperCase() ?? "?",
    className: "bg-charcoal-500/15 text-content-quaternary",
  };

  return (
    <div
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-secondary/50 transition-colors ${
        isPending ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={handleCheckbox}
        className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${statusClasses.checkbox}`}
        aria-label={
          isResolved ? t("detail.markComplete") : t("detail.markComplete")
        }
      >
        {isResolved && (
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        )}
      </button>

      {/* Description */}
      <span
        className={`flex-1 text-sm min-w-0 truncate ${
          isResolved
            ? "text-content-quaternary line-through"
            : "text-content-primary"
        }`}
      >
        {task.description}
      </span>

      {/* Status badge */}
      <span
        className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${statusClasses.badge}`}
      >
        {t(`taskStatuses.${task.status}`)}
      </span>

      {/* Assignee type indicator */}
      <span
        className={`text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded shrink-0 ${assignee.className}`}
        title={task.assignee_type}
      >
        {assignee.label}
      </span>

      {/* WO badge */}
      {task.wo_id && (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 shrink-0">
          {t("detail.dispatched")}
        </span>
      )}

      {/* Cost */}
      {task.cost != null && task.cost > 0 && (
        <span className="text-[10px] text-content-quaternary shrink-0">
          ${task.cost.toLocaleString()}
        </span>
      )}

      {/* Delete button (visible on hover) */}
      <button
        type="button"
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 text-content-quaternary hover:text-red-400 transition-all shrink-0"
        aria-label={t("detail.deleteTask")}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
          />
        </svg>
      </button>
    </div>
  );
}
