"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  template_name: string | null;
  total_trades: number;
  completed_trades: number;
  estimated_cost_low: number | null;
  estimated_cost_high: number | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-charcoal-100 text-charcoal-700",
  pending_approval: "bg-amber-100 text-amber-700",
  active: "bg-blue-100 text-blue-700",
  paused: "bg-orange-100 text-orange-700",
  complete: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export function ProjectsContent({ projects }: { projects: Project[] }) {
  const t = useTranslations("home.projects");
  const [tab, setTab] = useState<"active" | "completed" | "all">("active");

  const filtered = projects.filter((p) => {
    if (tab === "active") return !["complete", "cancelled"].includes(p.status);
    if (tab === "completed") return p.status === "complete";
    return true;
  });

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      draft: t("draft"),
      pending_approval: t("pendingApproval"),
      active: t("activeStatus"),
      paused: t("paused"),
      complete: t("complete"),
      cancelled: t("cancelled"),
    };
    return map[s] ?? s;
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">{t("title")}</h1>
          <p className="text-sm text-content-tertiary mt-1">{t("subtitle")}</p>
        </div>
        <Link
          href="/home/projects/new"
          className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors"
        >
          {t("newProject")}
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-secondary rounded-lg p-1 mb-6">
        {(["active", "completed", "all"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === key
                ? "bg-surface-primary text-content-primary shadow-sm"
                : "text-content-tertiary hover:text-content-secondary"
            }`}
          >
            {t(key)}
          </button>
        ))}
      </div>

      {/* Project cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-surface-secondary rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-content-quaternary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
          </div>
          <p className="text-content-tertiary">
            {tab === "active"
              ? t("noActiveProjects")
              : tab === "completed"
                ? t("noCompletedProjects")
                : t("noProjects")}
          </p>
          <Link
            href="/home/projects/new"
            className="inline-block mt-4 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors"
          >
            {t("startProject")}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((project) => {
            const progress =
              project.total_trades > 0
                ? Math.round((project.completed_trades / project.total_trades) * 100)
                : 0;

            return (
              <Link
                key={project.id}
                href={`/home/projects/${project.id}`}
                className="block bg-surface-primary border border-edge-primary rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-content-primary truncate">
                      {project.title}
                    </h3>
                    {project.description && (
                      <p className="text-sm text-content-tertiary mt-0.5 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <span
                    className={`ml-3 px-2.5 py-1 text-xs font-medium rounded-full ${
                      STATUS_COLORS[project.status] ?? "bg-charcoal-100 text-charcoal-700"
                    }`}
                  >
                    {statusLabel(project.status)}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-content-tertiary mb-1">
                    <span>{t("progress")}</span>
                    <span>
                      {t("tradesCompleted", {
                        completed: project.completed_trades,
                        total: project.total_trades,
                      })}
                    </span>
                  </div>
                  <div className="w-full bg-surface-secondary rounded-full h-2">
                    <div
                      className="bg-rose-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Footer info */}
                <div className="flex items-center justify-between text-xs text-content-quaternary">
                  <span>
                    {project.template_name
                      ? t("template")
                      : t("custom")}
                  </span>
                  {project.estimated_cost_low && project.estimated_cost_high && (
                    <span>
                      ${project.estimated_cost_low.toLocaleString()} - $
                      {project.estimated_cost_high.toLocaleString()}
                    </span>
                  )}
                  <span>
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
