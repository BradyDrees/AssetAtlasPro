"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { getInvoicesReport } from "@/app/actions/vendor-reports";
import type { InvoiceAgingSummary } from "@/lib/vendor/report-types";

function defaultRange() {
  const now = new Date();
  return { start: new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString().split("T")[0], end: now.toISOString().split("T")[0] };
}

const bucketColors = ["bg-green-400", "bg-yellow-400", "bg-orange-400", "bg-red-400"];

export default function InvoicesReportPage() {
  const t = useTranslations("vendor.reports");
  const [data, setData] = useState<InvoiceAgingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(defaultRange);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await getInvoicesReport(range);
    setData(r.data ?? null);
    setLoading(false);
  }, [range]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/pro/reports" className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-secondary text-content-secondary hover:text-content-primary transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-2xl font-bold text-content-primary">{t("cards.invoices.title")}</h1>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs text-content-tertiary">{t("dateFilter.from")}</label>
        <input type="date" value={range.start} onChange={(e) => setRange((p) => ({ ...p, start: e.target.value }))} className="px-2 py-1.5 text-xs bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary" />
        <label className="text-xs text-content-tertiary">{t("dateFilter.to")}</label>
        <input type="date" value={range.end} onChange={(e) => setRange((p) => ({ ...p, end: e.target.value }))} className="px-2 py-1.5 text-xs bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary" />
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : !data ? (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center"><p className="text-content-tertiary">{t("noData")}</p></div>
      ) : (
        <>
          <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-content-primary">{t("summary.totalOutstanding")}</h3>
              <span className="text-xl font-bold text-red-500">${data.total_outstanding.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {data.buckets.map((b, i) => (
                <div key={b.label} className="text-center">
                  <div className={`h-16 rounded-lg ${bucketColors[i]} flex items-end justify-center pb-1`} style={{ opacity: b.count > 0 ? 1 : 0.3 }}>
                    <span className="text-xs font-bold text-white">{b.count}</span>
                  </div>
                  <p className="text-[10px] text-content-quaternary mt-1">{b.label} {t("summary.days")}</p>
                  <p className="text-xs font-medium text-content-primary">${b.total.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
          {data.invoices.length > 0 && (
            <div className="bg-surface-primary rounded-xl border border-edge-primary overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-edge-primary text-left">
                  <th className="px-4 py-3 text-xs font-medium text-content-tertiary">{t("table.invoice")}</th>
                  <th className="px-4 py-3 text-xs font-medium text-content-tertiary">{t("table.dueDate")}</th>
                  <th className="px-4 py-3 text-xs font-medium text-content-tertiary text-right">{t("table.amount")}</th>
                  <th className="px-4 py-3 text-xs font-medium text-content-tertiary text-right">{t("table.daysOut")}</th>
                  <th className="px-4 py-3 text-xs font-medium text-content-tertiary">{t("table.bucket")}</th>
                </tr></thead>
                <tbody>{data.invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-edge-secondary/50 hover:bg-surface-secondary/30">
                    <td className="px-4 py-3 text-content-primary font-medium">{inv.invoice_number || inv.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-content-secondary">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3 text-right font-medium text-content-primary">${inv.total.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-content-tertiary">{inv.days_outstanding}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-surface-secondary text-content-secondary">{inv.bucket}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
