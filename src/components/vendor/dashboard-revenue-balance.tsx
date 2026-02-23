"use client";

import { useTranslations } from "next-intl";

interface DashboardRevenueBalanceProps {
  outstanding: number;
  received: number;
  pastDue: number;
}

function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function DashboardRevenueBalance({ outstanding, received, pastDue }: DashboardRevenueBalanceProps) {
  const t = useTranslations("vendor.dashboard");

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 text-center">
        <p className="text-xs text-content-secondary mb-1">{t("revenue.outstanding")}</p>
        <p className="text-lg font-bold text-content-primary">{formatUSD(outstanding)}</p>
      </div>
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 text-center">
        <p className="text-xs text-content-secondary mb-1">{t("revenue.received")}</p>
        <p className="text-lg font-bold text-green-400">{formatUSD(received)}</p>
      </div>
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 text-center">
        <p className="text-xs text-content-secondary mb-1">{t("revenue.pastDue")}</p>
        <p className="text-lg font-bold text-red-400">{formatUSD(pastDue)}</p>
      </div>
    </div>
  );
}