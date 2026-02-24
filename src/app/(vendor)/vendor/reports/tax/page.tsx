"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { getTaxReport } from "@/app/actions/vendor-reports";
import type { TaxReportSummary } from "@/lib/vendor/report-types";

function defaultRange() {
  const now = new Date();
  return { start: new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0], end: now.toISOString().split("T")[0] };
}

export default function TaxReportPage() {
  const t = useTranslations("vendor.reports");
  const [data, setData] = useState<TaxReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(defaultRange);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await getTaxReport(range);
    setData(r.data ?? null);
    setLoading(false);
  }, [range]);
  useEffect(() => { load(); }, [load]);

  const maxSales = data?.data.reduce((m, r) => Math.max(m, r.taxable_sales), 0) || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/vendor/reports" className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-secondary text-content-secondary hover:text-content-primary transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-2xl font-bold text-content-primary">{t("cards.tax.title")}</h1>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { l: t("summary.taxableSales"), v: `$${data.total_taxable_sales.toFixed(2)}`, c: "text-content-primary" },
              { l: t("summary.taxCollected"), v: `$${data.total_tax_collected.toFixed(2)}`, c: "text-brand-500" },
              { l: t("summary.effectiveRate"), v: data.effective_tax_rate != null ? `${data.effective_tax_rate.toFixed(2)}%` : "—", c: "text-content-primary" },
            ].map((s, i) => (
              <div key={i} className="bg-surface-primary rounded-xl border border-edge-primary p-4">
                <p className="text-xs text-content-tertiary">{s.l}</p>
                <p className={`text-2xl font-bold ${s.c}`}>{s.v}</p>
              </div>
            ))}
          </div>
          {data.data.length > 0 ? (
            <>
              <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 space-y-3">
                <h3 className="text-sm font-semibold text-content-primary">{t("summary.taxByMonth")}</h3>
                {data.data.map((row) => (
                  <div key={row.month} className="flex items-center gap-3">
                    <span className="text-xs text-content-tertiary w-20 flex-shrink-0">{row.month}</span>
                    <div className="flex-1 bg-surface-secondary rounded-full h-6 overflow-hidden">
                      <div className="bg-brand-500 h-full rounded-full transition-all" style={{ width: `${(row.taxable_sales / maxSales) * 100}%` }} />
                    </div>
                    <span className="text-xs font-medium text-content-primary w-24 text-right">${row.taxable_sales.toFixed(2)}</span>
                    <span className="text-xs text-content-tertiary w-20 text-right">${row.tax_collected.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="bg-surface-primary rounded-xl border border-edge-primary overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-edge-primary text-left">
                    <th className="px-4 py-3 text-xs font-medium text-content-tertiary">{t("table.month")}</th>
                    <th className="px-4 py-3 text-xs font-medium text-content-tertiary text-right">{t("table.taxableSales")}</th>
                    <th className="px-4 py-3 text-xs font-medium text-content-tertiary text-right">{t("table.taxCollected")}</th>
                    <th className="px-4 py-3 text-xs font-medium text-content-tertiary text-right">{t("table.invoices")}</th>
                  </tr></thead>
                  <tbody>{data.data.map((row) => (
                    <tr key={row.month} className="border-b border-edge-secondary/50 hover:bg-surface-secondary/30">
                      <td className="px-4 py-3 text-content-primary font-medium">{row.month}</td>
                      <td className="px-4 py-3 text-right text-content-primary">${row.taxable_sales.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-brand-500 font-medium">${row.tax_collected.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-content-tertiary">{row.invoice_count}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center"><p className="text-content-tertiary">{t("noData")}</p></div>
          )}
        </>
      )}
    </div>
  );
}
