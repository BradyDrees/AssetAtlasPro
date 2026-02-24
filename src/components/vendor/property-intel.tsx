"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { getPropertyIntel, type PropertyIntel } from "@/lib/vendor/property-intel-queries";
import { WO_STATUS_COLORS } from "@/lib/vendor/work-order-types";
import type { WoStatus } from "@/lib/vendor/types";

interface PropertyIntelProps {
  workOrderId: string;
}

export function PropertyIntelPanel({ workOrderId }: PropertyIntelProps) {
  const t = useTranslations("vendor.jobs");
  const [intel, setIntel] = useState<PropertyIntel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await getPropertyIntel(workOrderId);
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setIntel(result.data);
    }
    setLoading(false);
  }, [workOrderId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error === "Migration required") {
    return null; // Silently hide if migration hasn't been run
  }

  if (error || !intel) {
    return null;
  }

  if (intel.total_past_jobs === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-content-quaternary">{t("intel.noHistory")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-secondary/50 rounded-lg p-3">
          <p className="text-[10px] text-content-quaternary uppercase">{t("intel.pastJobs")}</p>
          <p className="text-xl font-bold text-content-primary">{intel.total_past_jobs}</p>
        </div>
        <div className="bg-surface-secondary/50 rounded-lg p-3">
          <p className="text-[10px] text-content-quaternary uppercase">{t("intel.totalInvoiced")}</p>
          <p className="text-xl font-bold text-brand-400">
            ${Number(intel.total_invoiced).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Past work orders */}
      {intel.past_work_orders.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-content-tertiary uppercase">
            {t("intel.previousWork")}
          </h4>
          {intel.past_work_orders.map((wo) => {
            const statusColor = WO_STATUS_COLORS[wo.status as WoStatus] ?? "";
            return (
              <Link
                key={wo.id}
                href={`/vendor/jobs/${wo.id}`}
                className="block bg-surface-secondary/30 rounded-lg px-3 py-2.5 hover:bg-surface-secondary transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-content-primary truncate">
                      {wo.description || "—"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {wo.trade && (
                        <span className="text-[10px] text-content-quaternary">{wo.trade}</span>
                      )}
                      <span className="text-[10px] text-content-quaternary">
                        {wo.completed_at
                          ? new Date(wo.completed_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : new Date(wo.created_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                      </span>
                    </div>
                  </div>
                  <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${statusColor}`}>
                    {wo.status.replace(/_/g, " ")}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
