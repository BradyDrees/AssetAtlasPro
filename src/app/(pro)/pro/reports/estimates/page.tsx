"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { getEstimatesFunnel } from "@/app/actions/vendor-reports";
import type { EstimatesFunnelSummary } from "@/lib/vendor/report-types";

function defaultRange() {
  const now = new Date();
  return { start: new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split("T")[0], end: now.toISOString().split("T")[0] };
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-400", sent: "bg-blue-400", pm_reviewing: "bg-purple-400", with_owner: "bg-indigo-400",
  changes_requested: "bg-yellow-400", approved: "bg-green-400", declined: "bg-red-400", expired: "bg-gray-300",
};

export default function EstimatesReportPage() {
  const t = useTranslations("vendor.reports");
  const [data, setData] = useState<EstimatesFunnelSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(defaultRange);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await getEstimatesFunnel(range);
    setData(r.data ?? null);
    setLoading(false);
  }, [range]);
  useEffect(() => { load(); }, [load]);

  const totalCount = data?.funnel.reduce((s, f) => s + f.count, 0) || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/pro/reports" className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-secondary text-content-secondary hover:text-content-primary transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-2xl font-bold text-content-primary">{t("cards.estimates.title")}</h1>
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
              { l: t("summary.approvalRate"), v: `${data.approval_rate.toFixed(1)}%`, c: "text-green-500" },
              { l: t("summary.approved"), v: String(data.total_approved), c: "text-green-500" },
              { l: t("summary.declined"), v: String(data.total_declined), c: "text-red-500" },
              { l: t("summary.pending"), v: String(data.total_sent), c: "text-blue-400" },
              { l: t("summary.avgValue"), v: `$${data.avg_estimate_value.toFixed(2)}`, c: "text-brand-500" },
              { l: t("summary.conversionRate"), v: `${data.conversion_rate.toFixed(1)}%`, c: "text-content-primary" },
            ].map((s, i) => (
              <div key={i} className="bg-surface-primary rounded-xl border border-edge-primary p-4">
                <p className="text-xs text-content-tertiary">{s.l}</p>
                <p className={`text-2xl font-bold ${s.c}`}>{s.v}</p>
              </div>
            ))}
          </div>
          {data.funnel.length > 0 && (
            <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 space-y-3">
              <h3 className="text-sm font-semibold text-content-primary">{t("summary.byStatus")}</h3>
              {data.funnel.map((f) => (
                <div key={f.status} className="flex items-center gap-3">
                  <span className="text-xs text-content-secondary w-32 truncate capitalize">{f.status.replace(/_/g, " ")}</span>
                  <div className="flex-1 bg-surface-secondary rounded-full h-5 overflow-hidden">
                    <div className={`${statusColors[f.status] || "bg-gray-400"} h-full rounded-full transition-all`} style={{ width: `${(f.count / totalCount) * 100}%` }} />
                  </div>
                  <span className="text-xs font-medium text-content-primary w-8 text-right">{f.count}</span>
                  <span className="text-xs text-content-tertiary w-24 text-right">${f.total_value.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
