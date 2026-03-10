"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { DashboardUpcoming } from "@/app/actions/home-dashboard";

interface Props {
  visits: DashboardUpcoming[];
}

export function DashboardUpcomingVisits({ visits }: Props) {
  const t = useTranslations("home.dashboard");

  if (visits.length === 0) {
    return (
      <div className="text-center py-6 text-content-quaternary">
        <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
        <p className="text-sm">{t("noUpcomingVisits")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {visits.map((v) => {
        const dateObj = new Date(v.scheduled_date + "T00:00:00");
        const dateStr = dateObj.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        });

        return (
          <Link
            key={v.id}
            href={`/home/work-orders/${v.id}`}
            className="flex items-center gap-3 p-3 rounded-lg bg-surface-secondary hover:bg-surface-tertiary transition-colors"
          >
            {/* Date badge */}
            <div className="w-11 h-11 rounded-lg bg-purple-500/10 flex flex-col items-center justify-center flex-shrink-0">
              <span className="text-[10px] uppercase font-bold text-purple-400 leading-none">
                {dateObj.toLocaleDateString(undefined, { month: "short" })}
              </span>
              <span className="text-sm font-bold text-purple-400 leading-tight">
                {dateObj.getDate()}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-content-primary">
                {v.trade ? <span className="capitalize">{v.trade}</span> : t("scheduledVisit")}
              </p>
              <p className="text-xs text-content-tertiary truncate">
                {v.vendor_name ?? "—"}
                {v.scheduled_time_start && (
                  <span className="ml-1">
                    · {v.scheduled_time_start}
                    {v.scheduled_time_end && `–${v.scheduled_time_end}`}
                  </span>
                )}
              </p>
            </div>

            <svg className="w-4 h-4 text-content-quaternary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        );
      })}
    </div>
  );
}
