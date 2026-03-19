"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { OperateProject } from "@/app/actions/operate-projects";

type TFn = (key: string, values?: Record<string, string | number>) => string;

interface ProjectListViewProps {
  projects: OperateProject[];
  t: TFn;
}

type SortField =
  | "title"
  | "property_name"
  | "project_type"
  | "current_stage_name"
  | "progress"
  | "urgency_date"
  | "cost_to_date";

type SortDir = "asc" | "desc";

// -----------------------------------------------
// Sortable header cell
// -----------------------------------------------
function SortHeader({
  label,
  field,
  activeField,
  dir,
  onSort,
  className,
}: {
  label: string;
  field: SortField;
  activeField: SortField;
  dir: SortDir;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const isActive = field === activeField;
  return (
    <th
      className={`px-3 py-2.5 text-left text-[11px] font-semibold text-content-tertiary uppercase tracking-wider cursor-pointer select-none hover:text-content-primary transition-colors ${className ?? ""}`}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive && (
          <svg
            className={`w-3 h-3 transition-transform ${dir === "desc" ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 15l7-7 7 7"
            />
          </svg>
        )}
      </span>
    </th>
  );
}

// -----------------------------------------------
// Urgency badge for the table
// -----------------------------------------------
function UrgencyCell({ dateStr, t }: { dateStr: string | null; t: TFn }) {
  if (!dateStr) return <span className="text-content-quaternary">--</span>;

  const target = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const days = Math.ceil((target.getTime() - now.getTime()) / 86_400_000);

  let color = "text-green-400";
  let label = t("card.dueIn", { days });

  if (days < 0) {
    color = "text-red-400";
    label = t("card.overdue");
  } else if (days === 0) {
    color = "text-red-400";
    label = t("card.dueToday");
  } else if (days <= 3) {
    color = "text-red-400";
  } else if (days <= 7) {
    color = "text-yellow-400";
  }

  return <span className={`text-xs font-medium ${color}`}>{label}</span>;
}

// -----------------------------------------------
// Main component
// -----------------------------------------------
export function ProjectListView({ projects, t }: ProjectListViewProps) {
  const [sortField, setSortField] = useState<SortField>("urgency_date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    const copy = [...projects];
    const dir = sortDir === "asc" ? 1 : -1;

    copy.sort((a, b) => {
      switch (sortField) {
        case "title":
          return dir * a.title.localeCompare(b.title);
        case "property_name":
          return (
            dir *
            (a.property_name ?? "").localeCompare(b.property_name ?? "")
          );
        case "project_type":
          return dir * a.project_type.localeCompare(b.project_type);
        case "current_stage_name":
          return (
            dir *
            (a.current_stage_name ?? "").localeCompare(
              b.current_stage_name ?? ""
            )
          );
        case "progress": {
          const pctA =
            a.stage_progress.total > 0
              ? a.stage_progress.done / a.stage_progress.total
              : 0;
          const pctB =
            b.stage_progress.total > 0
              ? b.stage_progress.done / b.stage_progress.total
              : 0;
          return dir * (pctA - pctB);
        }
        case "urgency_date": {
          if (!a.urgency_date && !b.urgency_date) return 0;
          if (!a.urgency_date) return 1;
          if (!b.urgency_date) return -1;
          return dir * a.urgency_date.localeCompare(b.urgency_date);
        }
        case "cost_to_date":
          return dir * (a.cost_to_date - b.cost_to_date);
        default:
          return 0;
      }
    });

    return copy;
  }, [projects, sortField, sortDir]);

  if (projects.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-content-tertiary">{t("empty.title")}</p>
        <p className="text-xs text-content-quaternary mt-1">
          {t("empty.subtitle")}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-edge-primary">
      <table className="w-full min-w-[800px]">
        <thead className="bg-surface-secondary">
          <tr>
            <SortHeader
              label={t("list.title")}
              field="title"
              activeField={sortField}
              dir={sortDir}
              onSort={handleSort}
              className="w-[22%]"
            />
            <SortHeader
              label={t("list.property")}
              field="property_name"
              activeField={sortField}
              dir={sortDir}
              onSort={handleSort}
              className="w-[18%]"
            />
            <SortHeader
              label={t("list.type")}
              field="project_type"
              activeField={sortField}
              dir={sortDir}
              onSort={handleSort}
              className="w-[12%]"
            />
            <SortHeader
              label={t("list.currentStage")}
              field="current_stage_name"
              activeField={sortField}
              dir={sortDir}
              onSort={handleSort}
              className="w-[14%]"
            />
            <SortHeader
              label={t("list.progress")}
              field="progress"
              activeField={sortField}
              dir={sortDir}
              onSort={handleSort}
              className="w-[12%]"
            />
            <SortHeader
              label={t("list.urgencyDate")}
              field="urgency_date"
              activeField={sortField}
              dir={sortDir}
              onSort={handleSort}
              className="w-[12%]"
            />
            <SortHeader
              label={t("list.cost")}
              field="cost_to_date"
              activeField={sortField}
              dir={sortDir}
              onSort={handleSort}
              className="w-[10%]"
            />
          </tr>
        </thead>

        <tbody className="divide-y divide-edge-secondary">
          {sorted.map((project) => {
            const pct =
              project.stage_progress.total > 0
                ? Math.round(
                    (project.stage_progress.done /
                      project.stage_progress.total) *
                      100
                  )
                : 0;

            return (
              <tr
                key={project.id}
                className="hover:bg-surface-secondary/50 transition-colors"
              >
                <td className="px-3 py-3">
                  <Link
                    href={`/operate/projects/${project.id}`}
                    className="text-sm font-medium text-content-primary hover:text-green-400 transition-colors truncate block"
                  >
                    {project.title}
                  </Link>
                </td>

                <td className="px-3 py-3">
                  <span className="text-xs text-content-secondary truncate block">
                    {project.property_name ?? "--"}
                    {project.unit_number
                      ? ` / ${project.unit_number}`
                      : ""}
                  </span>
                </td>

                <td className="px-3 py-3">
                  <span className="text-xs text-content-tertiary">
                    {t(`projectTypes.${project.project_type}`)}
                  </span>
                </td>

                <td className="px-3 py-3">
                  <span className="text-xs text-content-secondary truncate block">
                    {project.current_stage_name ?? t("list.noStage")}
                  </span>
                </td>

                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-content-quaternary w-8 text-right">
                      {pct}%
                    </span>
                  </div>
                </td>

                <td className="px-3 py-3">
                  <UrgencyCell dateStr={project.urgency_date} t={t} />
                </td>

                <td className="px-3 py-3">
                  <span className="text-xs text-content-secondary">
                    {project.cost_to_date > 0
                      ? `$${project.cost_to_date.toLocaleString()}`
                      : "--"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
