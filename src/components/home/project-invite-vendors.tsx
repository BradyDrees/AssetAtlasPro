"use client";

import { useState, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  getVendorsForBidding,
  inviteVendorsToBid,
} from "@/app/actions/home-project-bids";

interface VendorOption {
  id: string;
  name: string;
  avg_rating: number | null;
  response_time_hours: number | null;
  trades: string[];
}

interface ProjectInviteVendorsProps {
  workOrderId: string;
  projectId: string;
  trade: string;
  onClose: () => void;
  onInvited: () => void;
}

export function ProjectInviteVendors({
  workOrderId,
  projectId,
  trade,
  onClose,
  onInvited,
}: ProjectInviteVendorsProps) {
  const t = useTranslations("home.projects");
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const result = await getVendorsForBidding(trade);
      setVendors(result.data);
      setLoading(false);
    }
    load();
  }, [trade]);

  const toggleVendor = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleInvite = () => {
    if (selected.size === 0) return;
    setError(null);

    startTransition(async () => {
      const result = await inviteVendorsToBid(
        workOrderId,
        projectId,
        Array.from(selected)
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      onInvited();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface-primary rounded-xl border border-edge-primary w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-edge-primary">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-content-primary">
              {t("inviteVendors")}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 text-content-tertiary hover:text-content-primary transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-content-tertiary mt-1">
            {t("inviteVendorsDesc", { trade: trade.replace(/_/g, " ") })}
          </p>
        </div>

        {/* Vendor list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-surface-secondary rounded-lg p-3">
                  <div className="h-4 bg-surface-tertiary rounded w-1/2 mb-2" />
                  <div className="h-3 bg-surface-tertiary rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : vendors.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-content-tertiary">{t("noVendorsForTrade")}</p>
            </div>
          ) : (
            vendors.map((vendor) => {
              const isSelected = selected.has(vendor.id);
              return (
                <button
                  key={vendor.id}
                  onClick={() => toggleVendor(vendor.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                    isSelected
                      ? "border-rose-500 bg-rose-500/10"
                      : "border-edge-secondary bg-surface-secondary hover:border-edge-primary"
                  }`}
                >
                  {/* Checkbox */}
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? "bg-rose-500 text-white"
                        : "border border-edge-primary"
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  {/* Vendor info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-content-primary truncate">
                      {vendor.name}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {vendor.avg_rating !== null && (
                        <span className="text-xs text-content-quaternary flex items-center gap-1">
                          <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          {vendor.avg_rating.toFixed(1)}
                        </span>
                      )}
                      {vendor.response_time_hours !== null && (
                        <span className="text-xs text-content-quaternary">
                          {t("responseTime", { hours: Math.round(vendor.response_time_hours) })}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-edge-primary">
          {error && (
            <p className="text-xs text-red-400 mb-2">{error}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-content-quaternary">
              {t("vendorsSelected", { count: selected.size })}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-content-tertiary hover:text-content-primary transition-colors"
              >
                {t("back")}
              </button>
              <button
                onClick={handleInvite}
                disabled={selected.size === 0 || isPending}
                className="px-4 py-2 text-sm font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? t("sending") : t("sendInvitations")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
