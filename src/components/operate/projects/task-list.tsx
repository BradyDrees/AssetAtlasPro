"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ProjectTask, TaskStatus } from "@/app/actions/operate-projects";
import {
  createProjectTask,
  updateProjectTask,
  deleteProjectTask,
} from "@/app/actions/operate-projects";
import { TaskRow } from "./task-row";

// -----------------------------------------------
// Types
// -----------------------------------------------
type TFn = (key: string, values?: Record<string, string | number>) => string;

interface TaskListProps {
  tasks: ProjectTask[];
  stageId: string;
  projectId: string;
  t: TFn;
}

// -----------------------------------------------
// Component
// -----------------------------------------------
export function TaskList({ tasks, stageId, projectId, t }: TaskListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const sorted = [...tasks].sort((a, b) => a.sort_order - b.sort_order);

  const handleStatusChange = useCallback(
    (taskId: string, status: TaskStatus) => {
      startTransition(async () => {
        const result = await updateProjectTask(taskId, { status });
        if (result.success) {
          router.refresh();
        }
      });
    },
    [router]
  );

  const handleDelete = useCallback(
    (taskId: string) => {
      startTransition(async () => {
        const result = await deleteProjectTask(taskId);
        if (result.success) {
          router.refresh();
        }
      });
    },
    [router]
  );

  const handleAddTask = useCallback(() => {
    const desc = newTaskDesc.trim();
    if (!desc) return;

    startTransition(async () => {
      const result = await createProjectTask(stageId, {
        project_id: projectId,
        description: desc,
      });
      if (result.success) {
        setNewTaskDesc("");
        setShowAddForm(false);
        router.refresh();
      }
    });
  }, [newTaskDesc, stageId, projectId, router]);

  return (
    <div
      className={`space-y-1 ${isPending ? "opacity-60 pointer-events-none" : ""}`}
    >
      {/* Task rows */}
      {sorted.length > 0 ? (
        sorted.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            t={t}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
          />
        ))
      ) : (
        <p className="text-xs text-content-quaternary py-3 px-3">
          {t("detail.noTasks")}
        </p>
      )}

      {/* Add task form */}
      {showAddForm ? (
        <div className="flex items-center gap-2 pt-2">
          <input
            type="text"
            value={newTaskDesc}
            onChange={(e) => setNewTaskDesc(e.target.value)}
            placeholder={t("detail.taskDescriptionPlaceholder")}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddTask();
              if (e.key === "Escape") {
                setShowAddForm(false);
                setNewTaskDesc("");
              }
            }}
            className="flex-1 text-sm bg-surface-secondary border border-edge-secondary rounded-lg px-3 py-2 text-content-primary placeholder:text-content-quaternary focus:outline-none focus:border-green-500/50 transition-colors"
            autoFocus
          />
          <button
            type="button"
            onClick={handleAddTask}
            disabled={!newTaskDesc.trim() || isPending}
            className="text-xs font-medium px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors disabled:opacity-50"
          >
            {t("detail.addStageButton")}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAddForm(false);
              setNewTaskDesc("");
            }}
            className="text-xs font-medium px-3 py-2 rounded-lg border border-edge-secondary text-content-tertiary hover:text-content-primary transition-colors"
          >
            {t("detail.cancel")}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 text-xs text-content-tertiary hover:text-green-400 transition-colors pt-2 px-3"
        >
          <svg
            className="w-3.5 h-3.5"
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
          {t("detail.addTask")}
        </button>
      )}
    </div>
  );
}
