"use client";

import { useTranslations } from "next-intl";

interface ClientFinancialSummaryProps {
  totalDue: number;
  pastDue: number;
  estimatesPending: number;
  totalPaid: number;
}

export function ClientFinancialSummary({ totalDue, pastDue, estimatesPending, totalPaid }: ClientFinancialSummaryProps) {
  const t = useTranslations("vendor.clients");

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 text-center">
        <p className="text-2xl font-bold text-content-primary">{fmt(totalDue)}</p>
        <p className="text-xs text-content-quaternary mt-1">{t("direct.totalDue")}</p>
      </div>
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 text-center">
        <p className="text-2xl font-bold text-red-400">{fmt(pastDue)}</p>
        <p className="text-xs text-content-quaternary mt-1">{t("direct.pastDue")}</p>
      </div>
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 text-center">
        <p className="text-2xl font-bold text-yellow-400">{fmt(estimatesPending)}</p>
        <p className="text-xs text-content-quaternary mt-1">{t("direct.estimatesPending")}</p>
      </div>
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 text-center">
        <p className="text-2xl font-bold text-green-400">{fmt(totalPaid)}</p>
        <p className="text-xs text-content-quaternary mt-1">{t("direct.totalPaid")}</p>
      </div>
    </div>
  );
}
