"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import type {
  OperateProject,
  ProjectStatus,
} from "@/app/actions/operate-projects";
import { ProjectCard } from "./project-card";

type TFn = (key: string, values?: Record<string, string | number>) => string;

interface ProjectKanbanViewProps {
  projects: OperateProject[];
  t: TFn;
  onStatusChange: (projectId: string, newStatus: ProjectStatus) => void;
  onAdvanceStage: (projectId: string) => void;
}

const KANBAN_COLUMNS: ProjectStatus[] = [
  "draft",
  "active",
  "on_hold",
  "completed",
];

const COLUMN_ACCENT: Record<string, string> = {
  draft: "border-t-charcoal-500",
  active: "border-t-green-500",
  on_hold: "border-t-yellow-500",
  completed: "border-t-blue-500",
};

const COLUMN_DOT: Record<string, string> = {
  draft: "bg-charcoal-500",
  active: "bg-green-500",
  on_hold: "bg-yellow-500",
  completed: "bg-blue-500",
};

// ---------------------------------------------------
// Droppable column wrapper
// ---------------------------------------------------
function KanbanColumn({
  status,
  label,
  count,
  children,
}: {
  status: ProjectStatus;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`
        flex-1 min-w-[260px] rounded-lg bg-surface-secondary border-t-2
        ${COLUMN_ACCENT[status] ?? "border-t-charcoal-500"}
        ${isOver ? "ring-2 ring-green-500/30" : ""}
        transition-shadow
      `}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${COLUMN_DOT[status] ?? "bg-charcoal-500"}`}
          />
          <span className="text-xs font-semibold text-content-primary uppercase tracking-wider">
            {label}
          </span>
        </div>
        <span className="text-[10px] text-content-quaternary font-medium">
          {count}
        </span>
      </div>

      {/* Cards */}
      <div className="px-2 pb-2 space-y-2 min-h-[100px]">{children}</div>
    </div>
  );
}

// ---------------------------------------------------
// Draggable card wrapper
// ---------------------------------------------------
function DraggableCard({
  project,
  t,
  onAdvanceStage,
}: {
  project: OperateProject;
  t: TFn;
  onAdvanceStage: (projectId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: project.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`${isDragging ? "opacity-30" : ""}`}
    >
      <ProjectCard
        project={project}
        t={t}
        onAdvanceStage={onAdvanceStage}
        draggable={false}
      />
    </div>
  );
}

// ---------------------------------------------------
// Main Kanban view
// ---------------------------------------------------
export function ProjectKanbanView({
  projects,
  t,
  onStatusChange,
  onAdvanceStage,
}: ProjectKanbanViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Group by status, sorted by urgency_date ASC (nulls last)
  const grouped = KANBAN_COLUMNS.reduce(
    (acc, col) => {
      acc[col] = projects
        .filter((p) => p.status === col)
        .sort((a, b) => {
          if (!a.urgency_date && !b.urgency_date) return 0;
          if (!a.urgency_date) return 1;
          if (!b.urgency_date) return -1;
          return a.urgency_date.localeCompare(b.urgency_date);
        });
      return acc;
    },
    {} as Record<ProjectStatus, OperateProject[]>
  );

  const activeProject = activeId
    ? projects.find((p) => p.id === activeId) ?? null
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const projectId = String(active.id);
    const newStatus = String(over.id) as ProjectStatus;

    // Find current status
    const project = projects.find((p) => p.id === projectId);
    if (!project || project.status === newStatus) return;

    onStatusChange(projectId, newStatus);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3 min-w-[1080px]">
          {KANBAN_COLUMNS.map((col) => {
            const items = grouped[col] ?? [];
            return (
              <KanbanColumn
                key={col}
                status={col}
                label={t(`statuses.${col}`)}
                count={items.length}
              >
                {items.length === 0 && (
                  <p className="text-[10px] text-content-quaternary text-center py-6">
                    {t("empty.columnEmpty")}
                  </p>
                )}
                {items.map((project) => (
                  <DraggableCard
                    key={project.id}
                    project={project}
                    t={t}
                    onAdvanceStage={onAdvanceStage}
                  />
                ))}
              </KanbanColumn>
            );
          })}
        </div>
      </div>

      {/* Drag overlay — rendered outside columns for smooth animation */}
      <DragOverlay>
        {activeProject ? (
          <div className="rotate-2 opacity-90 w-[260px]">
            <ProjectCard
              project={activeProject}
              t={t}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
