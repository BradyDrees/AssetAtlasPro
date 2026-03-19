"use client";

import { useState, useCallback, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  OperateProject,
  ProjectType,
  ProjectStatus,
  ProjectFilters,
  StageTemplate,
} from "@/app/actions/operate-projects";
import {
  moveProjectToStatus,
  advanceProjectStage,
} from "@/app/actions/operate-projects";
import { ProjectFilterBar } from "./project-filter-bar";
import { ProjectKanbanView } from "./project-kanban-view";
import { ProjectListView } from "./project-list-view";
import { NewProjectModal } from "./new-project-modal";
import { ProjectCalendarView } from "./project-calendar-view";

// -----------------------------------------------
// Types
// -----------------------------------------------
type ViewMode = "kanban" | "list" | "calendar";

interface ProjectsBoardProps {
  initialProjects: OperateProject[];
  templates: StageTemplate[];
  messages: Record<string, unknown>;
}

const PROJECT_TYPES: ProjectType[] = [
  "unit_turn",
  "renovation",
  "capital",
  "seasonal",
  "custom",
];

// -----------------------------------------------
// Deep-access i18n helper
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
): (key: string, values?: Record<string, string | number>) => string {
  return (key: string, values?: Record<string, string | number>) => {
    let str = getNestedValue(messages, key);
    if (!str) return key;
    if (values) {
      for (const [k, v] of Object.entries(values)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return str;
  };
}

// -----------------------------------------------
// View toggle button group
// -----------------------------------------------
function ViewToggle({
  active,
  onSelect,
  t,
}: {
  active: ViewMode;
  onSelect: (v: ViewMode) => void;
  t: (key: string) => string;
}) {
  const views: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
    {
      id: "kanban",
      label: t("views.kanban"),
      icon: (
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
            d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z"
          />
        </svg>
      ),
    },
    {
      id: "list",
      label: t("views.list"),
      icon: (
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
            d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
          />
        </svg>
      ),
    },
    {
      id: "calendar",
      label: t("views.calendar"),
      icon: (
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
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="inline-flex rounded-lg bg-surface-secondary border border-edge-secondary p-0.5">
      {views.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => onSelect(v.id)}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors
            ${
              active === v.id
                ? "bg-green-600 text-white"
                : "text-content-tertiary hover:text-content-primary"
            }
          `}
        >
          {v.icon}
          <span className="hidden sm:inline">{v.label}</span>
        </button>
      ))}
    </div>
  );
}

// -----------------------------------------------
// Main board shell
// -----------------------------------------------
export function ProjectsBoard({
  initialProjects,
  templates,
  messages,
}: ProjectsBoardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeView, setActiveView] = useState<ViewMode>("kanban");
  const [modalOpen, setModalOpen] = useState(false);
  const [filters, setFilters] = useState<ProjectFilters>({});
  const [projects, setProjects] = useState(initialProjects);

  // Build the t() function from the messages prop
  const t = useMemo(() => createT(messages), [messages]);

  // Filter projects client-side for instant feedback
  const filtered = useMemo(() => {
    let result = projects;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.property_name ?? "").toLowerCase().includes(q) ||
          (p.unit_number ?? "").toLowerCase().includes(q)
      );
    }

    if (filters.project_type) {
      result = result.filter((p) => p.project_type === filters.project_type);
    }

    if (filters.status) {
      result = result.filter((p) => p.status === filters.status);
    }

    return result;
  }, [projects, filters]);

  // Handlers
  const handleStatusChange = useCallback(
    (projectId: string, newStatus: ProjectStatus) => {
      // Optimistic update
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId ? { ...p, status: newStatus } : p
        )
      );

      startTransition(async () => {
        const result = await moveProjectToStatus(projectId, newStatus);
        if (!result.success) {
          // Revert on failure
          setProjects((prev) =>
            prev.map((p) => {
              if (p.id === projectId) {
                const original = initialProjects.find((ip) => ip.id === projectId);
                return original ?? p;
              }
              return p;
            })
          );
        }
      });
    },
    [initialProjects]
  );

  const handleAdvanceStage = useCallback(
    (projectId: string) => {
      startTransition(async () => {
        const result = await advanceProjectStage(projectId);
        if (result.success) {
          // Refresh from server
          router.refresh();
        }
      });
    },
    [router]
  );

  const handleCreated = useCallback(
    (id: string) => {
      setModalOpen(false);
      router.refresh();
    },
    [router]
  );

  return (
    <div className="space-y-4">
      {/* Top bar: title, view toggle, new button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-content-primary">
            {t("title")}
          </h1>
          <p className="text-xs text-content-tertiary mt-0.5">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle active={activeView} onSelect={setActiveView} t={t} />
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors"
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
            {t("newProject")}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <ProjectFilterBar
        filters={filters}
        onFilterChange={setFilters}
        t={t}
        projectTypes={PROJECT_TYPES}
      />

      {/* Content */}
      {activeView === "kanban" && (
        <ProjectKanbanView
          projects={filtered}
          t={t}
          onStatusChange={handleStatusChange}
          onAdvanceStage={handleAdvanceStage}
        />
      )}

      {activeView === "list" && (
        <ProjectListView projects={filtered} t={t} />
      )}

      {activeView === "calendar" && (
        <ProjectCalendarView projects={filtered} t={t} />
      )}

      {/* Empty state */}
      {filtered.length === 0 && activeView !== "calendar" && (
        <div className="text-center py-16">
          <p className="text-sm text-content-tertiary">{t("empty.title")}</p>
          <p className="text-xs text-content-quaternary mt-1">
            {t("empty.subtitle")}
          </p>
        </div>
      )}

      {/* New Project Modal */}
      <NewProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
        templates={templates}
        t={t}
      />
    </div>
  );
}
