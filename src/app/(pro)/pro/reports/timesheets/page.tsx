"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { getTimesheetsReport } from "@/app/actions/vendor-reports";
import type { TimesheetSummary } from "@/lib/vendor/report-types";

function defaultRange() {
  const now = new Date();
  return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0], end: now.toISOString().split("T")[0] };
}

export default function TimesheetsReportPage() {
  const t = useTranslations("vendor.reports");
  const [data, setData] = useState<TimesheetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(defaultRange);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await getTimesheetsReport(range);
    setData(r.data ?? null);
    setLoading(false);
  }, [range]);
  useEffect(() => { load(); }, [load]);

  const fmtDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/pro/reports" className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-secondary text-content-secondary hover:text-content-primary transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-2xl font-bold text-content-primary">{t("cards.timesheets.title")}</h1>
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
            <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
              <p className="text-xs text-content-tertiary">{t("summary.totalHours")}</p>
              <p className="text-2xl font-bold text-content-primary">{data.total_hours.toFixed(1)}h</p>
            </div>
            <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
              <p className="text-xs text-content-tertiary">{t("summary.entries")}</p>
              <p className="text-2xl font-bold text-content-primary">{data.entries.length}</p>
            </div>
            {data.labor_cost_available && (
              <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
                <p className="text-xs text-content-tertiary">{t("summary.laborCost")}</p>
                <p className="text-2xl font-bold text-brand-500">${data.total_labor_cost?.toFixed(2) ?? "0.00"}</p>
              </div>
            )}
          </div>
          {data.entries.length > 0 ? (
            <div className="bg-surface-primary rounded-xl border border-edge-primary overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-edge-primary text-left">
                  <th className="px-4 py-3 text-xs font-medium text-content-tertiary">{t("table.employee")}</th>
                  <th className="px-4 py-3 text-xs font-medium text-content-tertiary">{t("table.clockIn")}</th>
                  <th className="px-4 py-3 text-xs font-medium text-content-tertiary">{t("table.clockOut")}</th>
                  <th className="px-4 py-3 text-xs font-medium text-content-tertiary text-right">{t("table.duration")}</th>
                  {data.labor_cost_available && <th className="px-4 py-3 text-xs font-medium text-content-tertiary text-right">{t("table.cost")}</th>}
                </tr></thead>
                <tbody>{data.entries.map((e, i) => (
                  <tr key={i} className="border-b border-edge-secondary/50 hover:bg-surface-secondary/30">
                    <td className="px-4 py-3 text-content-primary">{e.user_name || e.vendor_user_id?.slice(0, 8) || "—"}</td>
                    <td className="px-4 py-3 text-content-secondary text-xs">{e.clock_in ? new Date(e.clock_in).toLocaleString() : "—"}</td>
                    <td className="px-4 py-3 text-content-secondary text-xs">{e.clock_out ? new Date(e.clock_out).toLocaleString() : "—"}</td>
                    <td className="px-4 py-3 text-right text-content-primary font-medium">{fmtDuration(e.duration_minutes)}</td>
                    {data.labor_cost_available && <td className="px-4 py-3 text-right text-content-primary">${(e.labor_cost ?? 0).toFixed(2)}</td>}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : (
            <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center"><p className="text-content-tertiary">{t("noData")}</p></div>
          )}
        </>
      )}
    </div>
  );
}
