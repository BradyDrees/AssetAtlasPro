"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  getEstimateVersions,
  createEstimateVersion,
  type EstimateVersion,
} from "@/app/actions/vendor-estimate-versions";

interface EstimateVersionHistoryProps {
  estimateId: string;
  isEditable: boolean;
}

export function EstimateVersionHistory({
  estimateId,
  isEditable,
}: EstimateVersionHistoryProps) {
  const t = useTranslations("vendor.estimates");
  const [versions, setVersions] = useState<EstimateVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    const result = await getEstimateVersions(estimateId);
    setVersions(result.data);
    setLoading(false);
  }, [estimateId]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const handleCreateVersion = async () => {
    if (creating) return;
    setCreating(true);
    const result = await createEstimateVersion(estimateId);
    if (!result.error) {
      await loadVersions();
    }
    setCreating(false);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const getSnapshotTotal = (snapshot: Record<string, unknown>): string => {
    const est = snapshot.estimate as Record<string, unknown> | undefined;
    if (!est?.total) return "—";
    return `$${Number(est.total).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getSnapshotSectionCount = (snapshot: Record<string, unknown>): number => {
    const sections = snapshot.sections as unknown[] | undefined;
    return sections?.length ?? 0;
  };

  return (
    <div className="space-y-3">
      {/* Save version button */}
      {isEditable && (
        <button
          onClick={handleCreateVersion}
          disabled={creating}
          className="flex items-center gap-2 px-3 py-2 text-xs bg-surface-secondary border border-edge-secondary rounded-lg text-content-secondary hover:text-content-primary hover:bg-surface-tertiary disabled:opacity-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {creating ? t("versions.saving") : t("versions.saveVersion")}
        </button>
      )}

      {/* Version list */}
      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : versions.length === 0 ? (
        <p className="text-xs text-content-quaternary text-center py-4">
          {t("versions.noVersions")}
        </p>
      ) : (
        <div className="space-y-2">
          {versions.map((v) => (
            <div
              key={v.id}
              className="bg-surface-secondary/50 rounded-lg border border-edge-secondary overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-surface-secondary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-600/20 text-brand-400 text-xs font-bold">
                    v{v.version_number}
                  </span>
                  <div className="text-left">
                    <p className="text-xs font-medium text-content-primary">
                      {t("versions.version")} {v.version_number}
                    </p>
                    <p className="text-[10px] text-content-quaternary">
                      {formatDate(v.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-content-secondary">
                    {getSnapshotTotal(v.snapshot)}
                  </span>
                  <svg
                    className={`w-3.5 h-3.5 text-content-quaternary transition-transform ${
                      expandedId === v.id ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </button>

              {expandedId === v.id && (
                <div className="px-3 pb-3 border-t border-edge-secondary">
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div>
                      <span className="text-content-quaternary">{t("versions.sections")}:</span>
                      <span className="ml-1 text-content-primary font-medium">
                        {getSnapshotSectionCount(v.snapshot)}
                      </span>
                    </div>
                    <div>
                      <span className="text-content-quaternary">{t("versions.total")}:</span>
                      <span className="ml-1 text-content-primary font-medium">
                        {getSnapshotTotal(v.snapshot)}
                      </span>
                    </div>
                  </div>

                  {/* Section breakdown */}
                  {Array.isArray(v.snapshot.sections) && (
                    <div className="mt-2 space-y-1">
                      {(v.snapshot.sections as Array<Record<string, unknown>>).map((section, idx) => {
                        const items = section.vendor_estimate_items as unknown[] | undefined;
                        return (
                          <div key={idx} className="flex items-center justify-between text-[10px] px-2 py-1 bg-surface-primary/50 rounded">
                            <span className="text-content-secondary truncate">
                              {(section.name as string) || `Section ${idx + 1}`}
                            </span>
                            <span className="text-content-quaternary">
                              {items?.length ?? 0} {t("versions.items")}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
