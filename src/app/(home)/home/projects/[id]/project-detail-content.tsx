"use client";

import { useState, useCallback, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ProjectInviteVendors } from "@/components/home/project-invite-vendors";
import { ProjectBidComparison } from "@/components/home/project-bid-comparison";
import type { BidInvitation } from "@/app/actions/home-project-bids";
import { getProjectBids } from "@/app/actions/home-project-bids";

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
  initialBids: Record<string, BidInvitation[]>;
}

export function ProjectDetailContent({
  project,
  workOrders,
  vendorOrgs,
  initialBids,
}: ProjectDetailContentProps) {
  const t = useTranslations("home.projects");
  const wt = useTranslations("home.workOrders");
  const router = useRouter();

  const [bidsMap, setBidsMap] = useState<Record<string, BidInvitation[]>>(initialBids);
  const [inviteModal, setInviteModal] = useState<{ woId: string; trade: string } | null>(null);
  const [compareModal, setCompareModal] = useState<{ woId: string; trade: string } | null>(null);
  const [, startTransition] = useTransition();

  const refreshBids = useCallback(() => {
    startTransition(async () => {
      const result = await getProjectBids(project.id);
      if (!result.error) {
        setBidsMap(result.data);
      }
      router.refresh();
    });
  }, [project.id, router, startTransition]);

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
          const woBids = bidsMap[wo.id] ?? [];
          const submittedBids = woBids.filter((b) => b.status === "bid_submitted");
          const hasBids = woBids.length > 0;
          const hasAccepted = woBids.some((b) => b.status === "accepted");
          const canInvite =
            project.status === "active" &&
            !isCompleted &&
            !hasAccepted &&
            ["matching", "on_hold", "open"].includes(wo.status);

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
                    <div className="flex items-center gap-2">
                      {/* Bid count badge */}
                      {hasBids && (
                        <button
                          onClick={() => setCompareModal({ woId: wo.id, trade: wo.trade })}
                          className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20 transition-colors"
                        >
                          {submittedBids.length > 0
                            ? t("bidsReceived", { count: submittedBids.length })
                            : t("bidsInvited", { count: woBids.length })}
                        </button>
                      )}
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          WO_STATUS_COLORS[wo.status] ?? "bg-charcoal-100 text-charcoal-600"
                        }`}
                      >
                        {woStatusLabel(wo.status)}
                      </span>
                    </div>
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

                  {/* Action buttons */}
                  <div className="flex items-center gap-3 mt-2">
                    <Link
                      href={`/home/work-orders/${wo.id}`}
                      className="text-xs text-rose-600 hover:text-rose-700 font-medium"
                    >
                      {t("viewWorkOrder")} →
                    </Link>

                    {canInvite && (
                      <button
                        onClick={() => setInviteModal({ woId: wo.id, trade: wo.trade })}
                        className="text-xs text-indigo-500 hover:text-indigo-400 font-medium flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                        </svg>
                        {t("inviteVendors")}
                      </button>
                    )}

                    {submittedBids.length > 0 && !hasAccepted && (
                      <button
                        onClick={() => setCompareModal({ woId: wo.id, trade: wo.trade })}
                        className="text-xs text-emerald-500 hover:text-emerald-400 font-medium flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                        </svg>
                        {t("compareBids")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {inviteModal && (
        <ProjectInviteVendors
          workOrderId={inviteModal.woId}
          projectId={project.id}
          trade={inviteModal.trade}
          onClose={() => setInviteModal(null)}
          onInvited={() => {
            setInviteModal(null);
            refreshBids();
          }}
        />
      )}

      {compareModal && (
        <ProjectBidComparison
          bids={bidsMap[compareModal.woId] ?? []}
          trade={compareModal.trade}
          onClose={() => setCompareModal(null)}
          onAction={() => {
            setCompareModal(null);
            refreshBids();
          }}
        />
      )}
    </div>
  );
}
