"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { getLeadSourceBreakdown, type LeadSourceBucket } from "@/app/actions/vendor-dashboard";

const SOURCE_COLORS: Record<string, string> = {
  pm_assignment: "bg-green-500",
  homeowner_request: "bg-rose-500",
  homeowner_project: "bg-pink-500",
  vendor_self_created: "bg-amber-500",
  marketplace: "bg-blue-500",
  inspection_finding: "bg-purple-500",
  unit_turn: "bg-teal-500",
  unknown: "bg-gray-500",
};

export function DashboardLeadSources() {
  const t = useTranslations("vendor.dashboard");
  const [data, setData] = useState<LeadSourceBucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const result = await getLeadSourceBreakdown();
      setData(result);
      setLoading(false);
    }
    load();
  }, []);

  const total = data.reduce((sum, b) => sum + b.count, 0);

  if (loading) {
    return (
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
        <div className="h-5 w-32 bg-surface-secondary animate-pulse rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-surface-secondary animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0 || total === 0) {
    return (
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
        <h3 className="text-sm font-semibold text-content-primary mb-3">{t("leadSources")}</h3>
        <p className="text-xs text-content-quaternary text-center py-4">{t("noLeadData")}</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
      <h3 className="text-sm font-semibold text-content-primary mb-4">{t("leadSources")}</h3>

      {/* Bar chart */}
      <div className="space-y-3">
        {data.map((bucket) => {
          const pct = total > 0 ? Math.round((bucket.count / total) * 100) : 0;
          const color = SOURCE_COLORS[bucket.source] ?? SOURCE_COLORS.unknown;
          const label = t(`leadSource.${bucket.source}`);

          return (
            <div key={bucket.source}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-content-secondary">{label}</span>
                <span className="text-xs text-content-quaternary">{bucket.count} ({pct}%)</span>
              </div>
              <div className="w-full h-2 bg-surface-tertiary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${color} transition-all duration-500`}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="mt-4 pt-3 border-t border-edge-secondary flex items-center justify-between">
        <span className="text-xs text-content-quaternary">{t("totalJobs")}</span>
        <span className="text-sm font-semibold text-content-primary">{total}</span>
      </div>
    </div>
  );
}
