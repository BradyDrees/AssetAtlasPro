"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import type { TodayJob } from "@/app/actions/vendor-dashboard";
import { useFormatDate } from "@/hooks/use-format-date";

interface DashboardUpcomingJobsProps {
  jobs: TodayJob[];
}

const priorityColors: Record<string, string> = {
  urgent: "bg-red-500/20 text-red-400",
  high: "bg-orange-500/20 text-orange-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  low: "bg-green-500/20 text-green-400",
};

export function DashboardUpcomingJobs({ jobs }: DashboardUpcomingJobsProps) {
  const t = useTranslations("vendor.dashboard");
  const { formatDate, formatTime } = useFormatDate();

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-content-primary">{t("upcomingJobs.title")}</h3>
        <Link href="/vendor/schedule" className="text-sm text-brand-400 hover:text-brand-300">
          {t("upcomingJobs.viewAll")}
        </Link>
      </div>
      {jobs.length === 0 ? (
        <p className="text-content-muted text-sm">{t("upcomingJobs.empty")}</p>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={"/vendor/jobs/" + job.id}
              className="block p-3 rounded-lg bg-surface-secondary hover:bg-surface-tertiary transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-content-primary">{job.property_name}</span>
                <span className={"text-xs px-2 py-0.5 rounded-full " + (priorityColors[job.priority] || "bg-surface-tertiary text-content-secondary")}>
                  {job.priority}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-content-secondary">
                <span>{job.scheduled_date ? formatDate(job.scheduled_date) : ""}</span>
                {job.scheduled_time_start ? <span>· {formatTime(job.scheduled_time_start)}</span> : null}
                <span className="capitalize">· {job.trade}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}