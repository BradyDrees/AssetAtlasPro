"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useFormatDate } from "@/hooks/use-format-date";
import type { ClientWithStats } from "@/app/actions/vendor-clients";

interface ClientCardProps {
  client: ClientWithStats;
}

export function ClientCard({ client }: ClientCardProps) {
  const t = useTranslations("vendor.clients");
  const { formatDate } = useFormatDate();

  const statusColors: Record<string, string> = {
    active: "bg-green-500/20 text-green-400 border-green-500/30",
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    suspended: "bg-red-500/20 text-red-400 border-red-500/30",
    terminated: "bg-content-quaternary/20 text-content-quaternary border-content-quaternary/30",
  };

  return (
    <Link
      href={`/vendor/clients/${client.pm_user_id}`}
      className="block bg-surface-primary rounded-xl border border-edge-primary p-5 hover:border-edge-secondary transition-colors group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-content-primary truncate">
              {client.pm_name ?? client.pm_email ?? t("unknownPm")}
            </h3>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                statusColors[client.status] ?? statusColors.pending
              }`}
            >
              {t(`status.${client.status}`)}
            </span>
          </div>
          {client.pm_email && (
            <p className="text-xs text-content-tertiary truncate">{client.pm_email}</p>
          )}
        </div>
        <svg className="w-5 h-5 text-content-quaternary group-hover:text-content-tertiary transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-lg font-bold text-content-primary">{client.total_jobs}</p>
          <p className="text-xs text-content-quaternary">{t("totalJobs")}</p>
        </div>
        <div>
          <p className="text-lg font-bold text-brand-400">{client.active_jobs}</p>
          <p className="text-xs text-content-quaternary">{t("activeJobs")}</p>
        </div>
        <div>
          <p className="text-lg font-bold text-green-400">
            ${client.total_revenue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-content-quaternary">{t("totalRevenue")}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-content-quaternary">
        <span>{t("paymentTerms")}: {client.payment_terms}</span>
        <span>·</span>
        <span>{t("since")}: {formatDate(client.created_at, { weekday: false })}</span>
      </div>
    </Link>
  );
}
