"use client";

import type { ProjectCostSummary } from "@/app/actions/operate-projects";

interface ProjectCostSidebarProps {
  cost: ProjectCostSummary;
  t: (key: string) => string;
}

export function ProjectCostSidebar({ cost, t }: ProjectCostSidebarProps) {
  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const overBudget = cost.remaining !== null && cost.remaining < 0;

  return (
    <div className="bg-surface-secondary border border-edge-primary rounded-xl p-4 space-y-3">
      <h3 className="text-content-primary font-semibold text-sm">
        {t("cost.title")}
      </h3>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-content-tertiary">{t("cost.taskCosts")}</span>
          <span className="text-content-primary">${fmt(cost.taskCosts)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-content-tertiary">{t("cost.partsCosts")}</span>
          <span className="text-content-primary">${fmt(cost.partsCosts)}</span>
        </div>
        {cost.woCosts > 0 && (
          <div className="flex justify-between">
            <span className="text-content-tertiary">{t("cost.woCosts")}</span>
            <span className="text-content-primary">${fmt(cost.woCosts)}</span>
          </div>
        )}
        <div className="border-t border-edge-primary pt-2 flex justify-between font-semibold">
          <span className="text-content-primary">{t("cost.total")}</span>
          <span className="text-content-primary">${fmt(cost.total)}</span>
        </div>
        {cost.budget !== null && (
          <>
            <div className="flex justify-between">
              <span className="text-content-tertiary">{t("cost.budget")}</span>
              <span className="text-content-primary">${fmt(cost.budget)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-content-tertiary">
                {overBudget ? t("cost.overBudget") : t("cost.remaining")}
              </span>
              <span className={overBudget ? "text-red-400 font-semibold" : "text-green-400"}>
                {overBudget ? "-" : ""}${fmt(Math.abs(cost.remaining!))}
              </span>
            </div>
            {/* Budget bar */}
            <div className="h-2 rounded-full bg-surface-tertiary overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  overBudget ? "bg-red-500" : "bg-green-500"
                }`}
                style={{
                  width: `${Math.min((cost.total / cost.budget) * 100, 100)}%`,
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
