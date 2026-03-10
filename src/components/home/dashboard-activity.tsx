"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ActivityEvent, ActivityEventType } from "@/app/actions/home-dashboard";

interface Props {
  events: ActivityEvent[];
}

const EVENT_ICONS: Record<ActivityEventType, { icon: string; color: string }> = {
  wo_created: {
    icon: "M12 4.5v15m7.5-7.5h-15",
    color: "bg-blue-500/10 text-blue-400",
  },
  estimate_received: {
    icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
    color: "bg-purple-500/10 text-purple-400",
  },
  estimate_approved: {
    icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    color: "bg-green-500/10 text-green-400",
  },
  job_scheduled: {
    icon: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5",
    color: "bg-purple-500/10 text-purple-400",
  },
  job_completed: {
    icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
    color: "bg-green-500/10 text-green-400",
  },
  review_requested: {
    icon: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z",
    color: "bg-amber-500/10 text-amber-400",
  },
  review_submitted: {
    icon: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z",
    color: "bg-amber-500/10 text-amber-400",
  },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function DashboardActivity({ events }: Props) {
  const t = useTranslations("home.dashboard");

  if (events.length === 0) {
    return (
      <div className="text-center py-6 text-content-quaternary">
        <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm">{t("noRecentActivity")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {events.map((evt) => {
        const cfg = EVENT_ICONS[evt.type];
        const label = t(`activity.${evt.type}`, {
          trade: evt.trade ?? "",
          vendor: evt.vendor_name ?? "",
          rating: evt.meta?.rating != null ? String(evt.meta.rating) : "",
        });

        const inner = (
          <div className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-surface-secondary transition-colors">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={cfg.icon} />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-content-secondary leading-relaxed">{label}</p>
            </div>
            <span className="text-[10px] text-content-quaternary flex-shrink-0 mt-0.5">
              {timeAgo(evt.timestamp)}
            </span>
          </div>
        );

        return evt.wo_id ? (
          <Link key={evt.id} href={`/home/work-orders/${evt.wo_id}`}>
            {inner}
          </Link>
        ) : (
          <div key={evt.id}>{inner}</div>
        );
      })}
    </div>
  );
}
