"use client";

import { useTranslations } from "next-intl";
import type { DashboardStats } from "@/app/actions/vendor-dashboard";

interface DashboardStatsProps {
  stats: DashboardStats;
}

export function DashboardStatsGrid({ stats }: DashboardStatsProps) {
  const dt = useTranslations("vendor.dashboard");

  const cards = [
    { label: dt("stats.activeJobs"), value: stats.activeJobs, color: "text-content-primary" },
    { label: dt("stats.pendingEstimates"), value: stats.pendingEstimates, color: "text-content-primary" },
    { label: dt("stats.unpaidInvoices"), value: stats.unpaidInvoices, color: "text-content-primary" },
    { label: dt("stats.monthlyRevenue"), value: `$${stats.monthlyRevenue.toLocaleString("en-US", { minimumFractionDigits: 0 })}`, color: "text-green-400" },
    { label: dt("stats.profit"), value: `$${stats.monthlyProfit.toLocaleString("en-US", { minimumFractionDigits: 0 })}`, color: stats.monthlyProfit >= 0 ? "text-green-400" : "text-red-400" },
    { label: dt("stats.completedThisMonth"), value: stats.completedThisMonth, color: "text-brand-400" },
    { label: dt("stats.avgResponseTime"), value: `${stats.avgResponseHours} ${dt("stats.hours")}`, color: "text-content-primary" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-surface-primary rounded-xl border border-edge-primary p-4"
        >
          <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          <p className="text-xs text-content-tertiary mt-1">{card.label}</p>
        </div>
      ))}
    </div>
  );
}
