"use client";

import { useTranslations } from "next-intl";

interface InvoiceSummaryTilesProps {
  totalDue: number;
  pastDue: number;
  paidThisMonth: number;
  draftCount: number;
}

export function InvoiceSummaryTiles({
  totalDue,
  pastDue,
  paidThisMonth,
  draftCount,
}: InvoiceSummaryTilesProps) {
  const t = useTranslations("vendor.invoices");

  const tiles = [
    {
      label: t("summary.totalDue"),
      value: `$${totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      color: "text-blue-400",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: t("summary.pastDue"),
      value: `$${pastDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      color: pastDue > 0 ? "text-red-400" : "text-green-400",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      ),
    },
    {
      label: t("summary.paidThisMonth"),
      value: `$${paidThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      color: "text-green-400",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: t("summary.drafts"),
      value: String(draftCount),
      color: "text-content-tertiary",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="bg-surface-primary rounded-xl border border-edge-primary p-3"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className={tile.color}>{tile.icon}</span>
            <span className="text-xs text-content-tertiary">{tile.label}</span>
          </div>
          <div className={`text-lg font-bold ${tile.color}`}>{tile.value}</div>
        </div>
      ))}
    </div>
  );
}
