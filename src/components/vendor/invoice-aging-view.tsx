"use client";

import { useTranslations } from "next-intl";

interface AgingBucket {
  label: string;
  min_days: number;
  max_days: number | null;
  count: number;
  total: number;
}

interface InvoiceAgingViewProps {
  buckets: AgingBucket[];
  totalOutstanding: number;
}

const BUCKET_COLORS = [
  "bg-green-500/20 text-green-400 border-green-500/30",
  "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "bg-red-500/20 text-red-400 border-red-500/30",
];

export function InvoiceAgingView({ buckets, totalOutstanding }: InvoiceAgingViewProps) {
  const t = useTranslations("vendor.invoices");

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-content-primary">
          {t("aging.title")}
        </h3>
        <span className="text-sm font-semibold text-content-primary">
          ${totalOutstanding.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {buckets.map((bucket, i) => (
          <div
            key={bucket.label}
            className={`rounded-lg border p-3 text-center ${BUCKET_COLORS[i] || BUCKET_COLORS[0]}`}
          >
            <div className="text-xs font-medium mb-1 opacity-80">
              {bucket.label}
            </div>
            <div className="text-lg font-bold">
              {bucket.count}
            </div>
            <div className="text-xs mt-0.5">
              ${bucket.total.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
