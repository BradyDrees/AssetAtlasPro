"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { DashboardActiveWo } from "@/app/actions/home-dashboard";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-400",
  matching: "bg-purple-500/10 text-purple-400",
  no_match: "bg-amber-500/10 text-amber-400",
  assigned: "bg-blue-500/10 text-blue-400",
  accepted: "bg-cyan-500/10 text-cyan-400",
  scheduled: "bg-purple-500/10 text-purple-400",
  en_route: "bg-amber-500/10 text-amber-400",
  on_site: "bg-orange-500/10 text-orange-400",
  in_progress: "bg-yellow-500/10 text-yellow-400",
};

interface DashboardActiveWoProps {
  wos: DashboardActiveWo[];
}

export function DashboardActiveWoList({ wos }: DashboardActiveWoProps) {
  const t = useTranslations("home.dashboard");

  if (wos.length === 0) {
    return (
      <div className="text-center py-6 text-content-quaternary">
        <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
        </svg>
        <p className="text-sm">{t("noActiveWorkOrders")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {wos.map((wo) => (
        <Link
          key={wo.id}
          href={`/home/work-orders/${wo.id}`}
          className="flex items-center gap-3 p-3 rounded-lg bg-surface-secondary hover:bg-surface-tertiary transition-colors"
        >
          {/* Trade icon */}
          <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {wo.trade && (
                <span className="text-sm font-medium text-content-primary capitalize">{wo.trade}</span>
              )}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[wo.status] ?? "bg-gray-500/10 text-gray-400"}`}>
                {t(`status.${wo.status}`)}
              </span>
            </div>
            <p className="text-xs text-content-tertiary truncate mt-0.5">
              {wo.vendor_name ?? wo.description ?? wo.property_name ?? "—"}
            </p>
          </div>

          <svg className="w-4 h-4 text-content-quaternary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      ))}
    </div>
  );
}
