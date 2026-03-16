"use client";

import { useTranslations } from "next-intl";
import type { DashboardStats } from "@/app/actions/vendor-dashboard";

interface DashboardStatsProps {
  stats: DashboardStats;
}

function BriefcaseSmall() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function CalculatorSmall() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
    </svg>
  );
}

function ReceiptSmall() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function DollarSmall() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ChartSmall() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  );
}

function CheckSmall() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ClockSmall() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export function DashboardStatsGrid({ stats }: DashboardStatsProps) {
  const dt = useTranslations("vendor.dashboard");

  const cards = [
    { label: dt("stats.activeJobs"), value: stats.activeJobs, color: "text-content-primary", iconColor: "bg-blue-500/10 text-blue-400", icon: <BriefcaseSmall /> },
    { label: dt("stats.pendingEstimates"), value: stats.pendingEstimates, color: "text-content-primary", iconColor: "bg-amber-500/10 text-amber-400", icon: <CalculatorSmall /> },
    { label: dt("stats.unpaidInvoices"), value: stats.unpaidInvoices, color: "text-content-primary", iconColor: "bg-orange-500/10 text-orange-400", icon: <ReceiptSmall /> },
    { label: dt("stats.monthlyRevenue"), value: `$${stats.monthlyRevenue.toLocaleString("en-US", { minimumFractionDigits: 0 })}`, color: "text-green-400", iconColor: "bg-green-500/10 text-green-400", icon: <DollarSmall /> },
    { label: dt("stats.profit"), value: `$${stats.monthlyProfit.toLocaleString("en-US", { minimumFractionDigits: 0 })}`, color: stats.monthlyProfit >= 0 ? "text-green-400" : "text-red-400", iconColor: stats.monthlyProfit >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400", icon: <ChartSmall /> },
    { label: dt("stats.completedThisMonth"), value: stats.completedThisMonth, color: "text-brand-400", iconColor: "bg-brand-500/10 text-brand-400", icon: <CheckSmall /> },
    { label: dt("stats.avgResponseTime"), value: `${stats.avgResponseHours} ${dt("stats.hours")}`, color: "text-content-primary", iconColor: "bg-purple-500/10 text-purple-400", icon: <ClockSmall /> },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-gradient-to-br from-surface-primary to-surface-secondary/50 rounded-xl border border-edge-primary p-4"
        >
          <div className={`w-8 h-8 rounded-lg ${card.iconColor} flex items-center justify-center mb-2`}>
            {card.icon}
          </div>
          <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          <p className="text-xs text-content-tertiary mt-0.5">{card.label}</p>
        </div>
      ))}
    </div>
  );
}
