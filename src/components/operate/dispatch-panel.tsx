"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { DispatchTech, DispatchJob } from "@/app/actions/operate-dashboard";
import { StatusBadge } from "@/components/vendor/status-badge";
import { PriorityDot } from "@/components/vendor/priority-dot";

interface DispatchPanelProps {
  techs: DispatchTech[];
  unscheduledToday: DispatchJob[];
  needsAssignment: DispatchJob[];
}

export function DispatchPanel({
  techs,
  unscheduledToday,
  needsAssignment,
}: DispatchPanelProps) {
  const t = useTranslations("operate.dashboard");

  const totalJobs = techs.reduce((sum, tech) => sum + tech.jobs.length, 0);
  const hasContent = techs.length > 0 || unscheduledToday.length > 0 || needsAssignment.length > 0;

  return (
    <div className="flex flex-col h-full min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-2 flex-shrink-0">
        <h2 className="text-sm font-semibold text-content-primary">
          {t("dispatch.title")}
        </h2>
        {totalJobs > 0 && (
          <span className="text-xs text-content-quaternary">
            {t("dispatch.jobsCount", { count: totalJobs })}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {!hasContent ? (
          <div className="text-center py-8">
            <p className="text-sm text-content-tertiary">
              {t("dispatch.noJobs")}
            </p>
            <p className="text-xs text-content-quaternary mt-1">
              {t("dispatch.noJobsDesc")}
            </p>
          </div>
        ) : (
          <>
            {/* Today's Dispatch — grouped by tech */}
            {techs.map((tech) => (
              <div key={tech.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-content-secondary truncate">
                    {tech.name}
                  </span>
                  <span className="flex-shrink-0 text-[10px] bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded-full font-medium">
                    {tech.jobs.length}
                  </span>
                </div>
                {tech.jobs.map((job) => (
                  <DispatchJobCard key={job.id} job={job} t={t} />
                ))}
              </div>
            ))}

            {/* Unscheduled Today */}
            {unscheduledToday.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-amber-600">
                  {t("dispatch.unscheduled")}
                </p>
                {unscheduledToday.map((job) => (
                  <DispatchJobCard key={job.id} job={job} t={t} />
                ))}
              </div>
            )}

            {/* Needs Assignment */}
            {needsAssignment.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-red-500">
                  {t("dispatch.needsAssignment")}
                </p>
                <p className="text-[10px] text-content-quaternary -mt-0.5">
                  {t("dispatch.needsAssignmentDesc")}
                </p>
                {needsAssignment.map((job) => (
                  <DispatchJobCard key={job.id} job={job} t={t} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Individual Dispatch Job Card ──

function DispatchJobCard({
  job,
  t,
}: {
  job: DispatchJob;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) {
  return (
    <Link
      href={`/operate/work-orders/${job.id}`}
      className="block bg-surface-primary rounded-lg border border-edge-tertiary p-2 hover:border-green-400/50 transition-all"
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <PriorityDot priority={job.priority} />
        <span className="text-xs font-medium text-content-primary truncate">
          {job.property_name}
        </span>
        {job.unit_number && (
          <span className="text-[10px] text-content-quaternary flex-shrink-0">
            #{job.unit_number}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 mt-1 flex-wrap min-w-0">
        {/* Time window */}
        {job.scheduled_time_start && (
          <span className="text-[10px] text-content-tertiary font-medium">
            {t("dispatch.timeWindow", {
              start: job.scheduled_time_start,
              end: job.scheduled_time_end ?? "—",
            })}
          </span>
        )}

        {job.trade && (
          <span className="text-[10px] text-content-quaternary">
            {job.trade}
          </span>
        )}

        <StatusBadge status={job.status} size="sm" />

        {/* Vendor org name per job row */}
        <span className="text-[10px] text-content-quaternary truncate">
          {job.vendor_org_name}
        </span>
      </div>
    </Link>
  );
}
