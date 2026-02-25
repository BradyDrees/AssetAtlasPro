"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { getSalesReport } from "@/app/actions/vendor-reports";
import type { SalesReportSummary } from "@/lib/vendor/report-types";

function defaultRange() {
  const now = new Date();
  return { start: new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split("T")[0], end: now.toISOString().split("T")[0] };
}

export default function SalesReportPage() {
  const t = useTranslations("vendor.reports");
  const [data, setData] = useState<SalesReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(defaultRange);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await getSalesReport(range);
    setData(r.data ?? null);
    setLoading(false);
  }, [range]);
  useEffect(() => { load(); }, [load]);

  const maxRevenue = data?.data.reduce((m, r) => Math.max(m, r.revenue), 0) || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/pro/reports" className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-secondary text-content-secondary hover:text-content-primary transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-2xl font-bold text-content-primary">{t("cards.sales.title")}</h1>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { l: t("summary.totalRevenue"), v: `$${data.total_revenue.toFixed(2)}`, c: "text-brand-500" },
              { l: t("summary.totalTax"), v: `$${data.total_tax.toFixed(2)}`, c: "text-content-primary" },
              { l: t("summary.invoiceCount"), v: String(data.invoice_count), c: "text-content-primary" },
              { l: t("summary.avgInvoice"), v: `$${data.avg_invoice_value.toFixed(2)}`, c: "text-content-primary" },
            ].map((s, i) => (
              <div key={i} className="bg-surface-primary rounded-xl border border-edge-primary p-4">
                <p className="text-xs text-content-tertiary">{s.l}</p>
                <p className={`text-2xl font-bold ${s.c}`}>{s.v}</p>
              </div>
            ))}
          </div>
          {data.data.length > 0 && (
            <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 space-y-3">
              <h3 className="text-sm font-semibold text-content-primary">{t("summary.revenueByPeriod")}</h3>
              {data.data.map((row) => (
                <div key={row.date} className="flex items-center gap-3">
                  <span className="text-xs text-content-tertiary w-20 flex-shrink-0">{row.date}</span>
                  <div className="flex-1 bg-surface-secondary rounded-full h-6 overflow-hidden">
                    <div className="bg-brand-500 h-full rounded-full transition-all" style={{ width: `${(row.revenue / maxRevenue) * 100}%` }} />
                  </div>
                  <span className="text-xs font-medium text-content-primary w-24 text-right">${row.revenue.toFixed(2)}</span>
                  <span className="text-[10px] text-content-quaternary w-8 text-right">{row.invoice_count}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
