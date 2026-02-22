"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 flex items-center gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-content-primary">{value}</p>
        <p className="text-sm text-content-tertiary">{label}</p>
      </div>
    </div>
  );
}

function EmptySection({
  title,
  message,
  actionLabel,
  actionHref,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-content-primary">{title}</h2>
        {actionLabel && actionHref && (
          <Link
            href={actionHref}
            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            {actionLabel}
          </Link>
        )}
      </div>
      <p className="text-content-tertiary text-sm">{message}</p>
    </div>
  );
}

function SetupChecklist() {
  const dt = useTranslations("vendor.dashboard");

  const items = [
    {
      label: dt("quickSetup.completeProfile"),
      href: "/vendor/profile",
      done: false,
    },
    {
      label: dt("quickSetup.addCredentials"),
      href: "/vendor/profile/credentials",
      done: false,
    },
    {
      label: dt("quickSetup.connectPm"),
      href: "/vendor/clients",
      done: false,
    },
  ];

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
      <h2 className="text-lg font-semibold text-content-primary mb-4">
        {dt("quickSetup.title")}
      </h2>
      <div className="space-y-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 p-3 rounded-lg border border-edge-secondary hover:bg-surface-secondary transition-colors"
          >
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                item.done
                  ? "border-brand-500 bg-brand-500"
                  : "border-content-quaternary"
              }`}
            >
              {item.done && (
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
            <span
              className={`text-sm ${
                item.done
                  ? "text-content-tertiary line-through"
                  : "text-content-primary"
              }`}
            >
              {item.label}
            </span>
            <svg
              className="w-4 h-4 text-content-quaternary ml-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function VendorDashboardPage() {
  const dt = useTranslations("vendor.dashboard");

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold text-content-primary">
          {dt("welcomeDefault")}
        </h1>
        <p className="text-content-tertiary mt-1">{dt("setupPrompt")}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label={dt("stats.activeJobs")}
          value={0}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          }
        />
        <StatCard
          label={dt("stats.pendingEstimates")}
          value={0}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
            </svg>
          }
        />
        <StatCard
          label={dt("stats.unpaidInvoices")}
          value={0}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          }
        />
        <StatCard
          label={dt("stats.monthlyRevenue")}
          value="$0"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label={dt("stats.completedThisMonth")}
          value={0}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label={dt("stats.avgResponseTime")}
          value={`0 ${dt("stats.hours")}`}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Quick setup checklist */}
      <SetupChecklist />

      {/* Dashboard sections (empty state) */}
      <div className="grid lg:grid-cols-2 gap-6">
        <EmptySection
          title={dt("sections.incomingWork")}
          message={dt("empty.noIncoming")}
          actionLabel={dt("actions.viewAll")}
          actionHref="/vendor/jobs"
        />
        <EmptySection
          title={dt("sections.todaysSchedule")}
          message={dt("empty.noSchedule")}
          actionLabel={dt("actions.viewAll")}
          actionHref="/vendor/schedule"
        />
        <EmptySection
          title={dt("sections.pendingEstimates")}
          message={dt("empty.noEstimates")}
          actionLabel={dt("actions.viewAll")}
          actionHref="/vendor/estimates"
        />
        <EmptySection
          title={dt("sections.pmClients")}
          message={dt("empty.noClients")}
          actionLabel={dt("actions.connectWithPm")}
          actionHref="/vendor/clients"
        />
      </div>
    </div>
  );
}
