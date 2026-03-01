"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

interface WorkOrder {
  id: string;
  trade: string;
  description: string | null;
  status: string;
  sequence_order: number | null;
  depends_on: number[] | null;
  vendor_org_id: string | null;
  created_at: string;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  template_name: string | null;
  total_trades: number;
  completed_trades: number;
  estimated_duration_days: number | null;
  estimated_cost_low: number | null;
  estimated_cost_high: number | null;
  actual_cost: number | null;
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

const WO_STATUS_COLORS: Record<string, string> = {
  on_hold: "bg-charcoal-100 text-charcoal-600",
  matching: "bg-amber-100 text-amber-700",
  open: "bg-blue-100 text-blue-700",
  assigned: "bg-indigo-100 text-indigo-700",
  accepted: "bg-cyan-100 text-cyan-700",
  scheduled: "bg-sky-100 text-sky-700",
  in_progress: "bg-violet-100 text-violet-700",
  completed: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  no_match: "bg-red-100 text-red-600",
};

interface ProjectDetailContentProps {
  project: Project;
  workOrders: WorkOrder[];
  vendorOrgs: Record<string, string>;
}

export function ProjectDetailContent({
  project,
  workOrders,
  vendorOrgs,
}: ProjectDetailContentProps) {
  const t = useTranslations("home.projects");
  const wt = useTranslations("home.workOrders");

  const progress =
    project.total_trades > 0
      ? Math.round((project.completed_trades / project.total_trades) * 100)
      : 0;

  const projectStatusLabel = (s: string) => {
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

  const woStatusLabel = (s: string) => {
    const map: Record<string, string> = {
      on_hold: t("onHold"),
      matching: t("matching"),
      open: wt("open"),
      assigned: t("assigned"),
      accepted: wt("approved"),
      scheduled: wt("scheduled"),
      in_progress: t("inProgress"),
      completed: t("tradeCompleted"),
      declined: wt("declined"),
      no_match: wt("noMatch"),
    };
    return map[s] ?? s.replace(/_/g, " ");
  };

  const tradeLabel = (trade: string) => {
    try {
      return wt(trade as Parameters<typeof wt>[0]);
    } catch {
      return trade.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href="/home/projects"
        className="inline-flex items-center gap-1 text-sm text-content-tertiary hover:text-content-primary mb-4"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {t("back")}
      </Link>

      {/* Project header */}
      <div className="bg-surface-primary border border-edge-primary rounded-xl p-5 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-content-primary">{project.title}</h1>
            {project.description && (
              <p className="text-sm text-content-tertiary mt-1">{project.description}</p>
            )}
          </div>
          <span
            className={`px-3 py-1 text-xs font-medium rounded-full ${
              STATUS_COLORS[project.status] ?? "bg-charcoal-100 text-charcoal-700"
            }`}
          >
            {projectStatusLabel(project.status)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-content-tertiary mb-1.5">
            <span>{t("tradeProgress")}</span>
            <span>
              {t("tradesCompleted", {
                completed: project.completed_trades,
                total: project.total_trades,
              })}
            </span>
          </div>
          <div className="w-full bg-surface-secondary rounded-full h-2.5">
            <div
              className="bg-rose-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {project.estimated_cost_low && project.estimated_cost_high && (
            <div>
              <p className="text-content-quaternary text-xs">{t("estimatedCost")}</p>
              <p className="text-content-primary font-medium">
                ${project.estimated_cost_low.toLocaleString()} - $
                {project.estimated_cost_high.toLocaleString()}
              </p>
            </div>
          )}
          {project.estimated_duration_days && (
            <div>
              <p className="text-content-quaternary text-xs">{t("estimatedDuration")}</p>
              <p className="text-content-primary font-medium">
                {t("days", { count: project.estimated_duration_days })}
              </p>
            </div>
          )}
          <div>
            <p className="text-content-quaternary text-xs">{t("createdAt")}</p>
            <p className="text-content-primary font-medium">
              {new Date(project.created_at).toLocaleDateString()}
            </p>
          </div>
          {project.template_name && (
            <div>
              <p className="text-content-quaternary text-xs">{t("template")}</p>
              <p className="text-content-primary font-medium">
                {project.template_name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Trade sequence */}
      <h2 className="text-lg font-semibold text-content-primary mb-4">
        {t("tradeSequence")}
      </h2>

      <div className="space-y-3">
        {workOrders.map((wo, idx) => {
          const isCompleted = wo.status === "completed";
          const isActive = ["assigned", "accepted", "scheduled", "in_progress", "matching"].includes(wo.status);

          return (
            <div
              key={wo.id}
              className={`relative bg-surface-primary border rounded-xl p-4 transition-all ${
                isCompleted
                  ? "border-green-200 bg-green-50/30"
                  : isActive
                    ? "border-rose-200 bg-rose-50/20"
                    : "border-edge-primary"
              }`}
            >
              {/* Connector line */}
              {idx < workOrders.length - 1 && (
                <div className="absolute left-[1.625rem] top-[3.5rem] w-0.5 h-[calc(100%-2rem)] bg-edge-secondary" />
              )}

              <div className="flex items-start gap-3">
                {/* Step number */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    isCompleted
                      ? "bg-green-500 text-white"
                      : isActive
                        ? "bg-rose-500 text-white"
                        : "bg-surface-secondary text-content-tertiary"
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    wo.sequence_order ?? idx + 1
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-content-primary">
                      {tradeLabel(wo.trade)}
                    </h3>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        WO_STATUS_COLORS[wo.status] ?? "bg-charcoal-100 text-charcoal-600"
                      }`}
                    >
                      {woStatusLabel(wo.status)}
                    </span>
                  </div>

                  {wo.description && (
                    <p className="text-sm text-content-tertiary mt-0.5 line-clamp-2">
                      {wo.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-2">
                    {wo.vendor_org_id && vendorOrgs[wo.vendor_org_id] && (
                      <span className="text-xs text-content-quaternary">
                        {vendorOrgs[wo.vendor_org_id]}
                      </span>
                    )}
                    {wo.depends_on && wo.depends_on.length > 0 && (
                      <span className="text-xs text-content-quaternary">
                        {t("dependsOn")}: {wo.depends_on.map((d) => `#${d}`).join(", ")}
                      </span>
                    )}
                  </div>

                  {/* View WO link */}
                  <Link
                    href={`/home/work-orders/${wo.id}`}
                    className="inline-block mt-2 text-xs text-rose-600 hover:text-rose-700 font-medium"
                  >
                    {t("viewWorkOrder")} →
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
