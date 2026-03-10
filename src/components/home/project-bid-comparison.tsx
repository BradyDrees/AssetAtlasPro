"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { acceptBid, declineBid } from "@/app/actions/home-project-bids";
import type { BidInvitation } from "@/app/actions/home-project-bids";

interface ProjectBidComparisonProps {
  bids: BidInvitation[];
  trade: string;
  onClose: () => void;
  onAction: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  invited: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  bid_submitted: "bg-green-500/10 text-green-400 border-green-500/30",
  accepted: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  declined: "bg-red-500/10 text-red-400 border-red-500/30",
  expired: "bg-charcoal-500/10 text-charcoal-400 border-charcoal-500/30",
};

export function ProjectBidComparison({
  bids,
  trade,
  onClose,
  onAction,
}: ProjectBidComparisonProps) {
  const t = useTranslations("home.projects");
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const handleAccept = (bidId: string) => {
    setActionError(null);
    startTransition(async () => {
      const result = await acceptBid(bidId);
      if (result.error) {
        setActionError(result.error);
        return;
      }
      onAction();
    });
  };

  const handleDecline = (bidId: string) => {
    setActionError(null);
    startTransition(async () => {
      const result = await declineBid(bidId);
      if (result.error) {
        setActionError(result.error);
        return;
      }
      onAction();
    });
  };

  const submittedBids = bids.filter((b) => b.status === "bid_submitted");
  const lowestBid = submittedBids.length > 0
    ? submittedBids.reduce((min, b) =>
        (b.estimate_total ?? Infinity) < (min.estimate_total ?? Infinity) ? b : min
      )
    : null;

  const hasAccepted = bids.some((b) => b.status === "accepted");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface-primary rounded-xl border border-edge-primary w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-edge-primary">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-content-primary">
                {t("bidComparison")}
              </h2>
              <p className="text-xs text-content-tertiary mt-0.5">
                {trade.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} — {t("bidsCount", { count: bids.length })}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-content-tertiary hover:text-content-primary transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Bid cards */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {actionError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-xs text-red-400">{actionError}</p>
            </div>
          )}

          {bids.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-content-tertiary">{t("noBidsYet")}</p>
            </div>
          ) : (
            bids.map((bid) => {
              const isLowest =
                lowestBid && bid.id === lowestBid.id && submittedBids.length > 1;
              const statusColor =
                STATUS_COLORS[bid.status] ?? STATUS_COLORS.invited;

              return (
                <div
                  key={bid.id}
                  className={`border rounded-xl p-4 ${
                    bid.status === "accepted"
                      ? "border-emerald-500/50 bg-emerald-500/5"
                      : "border-edge-secondary"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-content-primary">
                        {bid.vendor_name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${statusColor}`}
                        >
                          {t(`bidStatus.${bid.status}`)}
                        </span>
                        {isLowest && (
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-green-500/10 text-green-400 border border-green-500/30">
                            {t("lowestBid")}
                          </span>
                        )}
                      </div>
                    </div>

                    {bid.estimate_total !== null && bid.estimate_total !== undefined && (
                      <div className="text-right">
                        <p className="text-lg font-bold text-content-primary">
                          ${bid.estimate_total.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                        <p className="text-[10px] text-content-quaternary">
                          {t("estimateTotal")}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Timeline */}
                  <div className="flex items-center gap-4 text-[10px] text-content-quaternary mb-3">
                    <span>
                      {t("invited")}: {new Date(bid.invited_at).toLocaleDateString()}
                    </span>
                    {bid.responded_at && (
                      <span>
                        {t("responded")}: {new Date(bid.responded_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  {bid.status === "bid_submitted" && !hasAccepted && (
                    <div className="flex items-center gap-2 pt-2 border-t border-edge-secondary">
                      <button
                        onClick={() => handleAccept(bid.id)}
                        disabled={isPending}
                        className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        {t("acceptBid")}
                      </button>
                      <button
                        onClick={() => handleDecline(bid.id)}
                        disabled={isPending}
                        className="px-3 py-1.5 text-xs text-content-quaternary hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        {t("declineBid")}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-edge-primary">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-content-tertiary hover:text-content-primary transition-colors"
          >
            {t("back")}
          </button>
        </div>
      </div>
    </div>
  );
}
