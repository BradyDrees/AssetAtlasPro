"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { approveEstimate } from "@/app/actions/home-work-orders";

interface EstimateApprovalProps {
  woId: string;
  estimate: {
    id: string;
    estimate_number: string;
    total: number;
    status: string;
    sections?: Array<{
      title: string;
      items: Array<{
        description: string;
        quantity: number;
        unit_price: number;
        total: number;
      }>;
    }>;
  };
  poolBalance: number;
}

export function EstimateApproval({
  woId,
  estimate,
  poolBalance,
}: EstimateApprovalProps) {
  const t = useTranslations("home.subscription");
  const wt = useTranslations("home.workOrders");
  const [isPending, startTransition] = useTransition();
  const [approved, setApproved] = useState(estimate.status === "approved");
  const [error, setError] = useState<string | null>(null);

  const total = Number(estimate.total) || 0;
  const poolUsed = Math.min(poolBalance, total);
  const cardCharged = total - poolUsed;

  const handleApprove = () => {
    setError(null);
    startTransition(async () => {
      const result = await approveEstimate({
        woId,
        estimateId: estimate.id,
      });
      if (result.success) {
        setApproved(true);
      } else {
        setError(result.error ?? "Failed to approve estimate");
      }
    });
  };

  if (approved) {
    return (
      <div className="bg-green-50/30 border border-green-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <h3 className="font-semibold text-green-700">{t("estimateApproved")}</h3>
        </div>
        <p className="text-sm text-green-600">
          {wt("estimateNumber")}: #{estimate.estimate_number}
        </p>
        <p className="text-lg font-bold text-green-700 mt-1">
          ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-primary border border-edge-primary rounded-xl p-5">
      <h3 className="text-lg font-semibold text-content-primary mb-3">
        {t("reviewEstimate")}
      </h3>

      {/* Estimate summary */}
      <div className="bg-surface-secondary rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-content-tertiary">
            {wt("estimateNumber")}: #{estimate.estimate_number}
          </span>
          <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
            {t("pendingApproval")}
          </span>
        </div>

        {/* Line items if available */}
        {estimate.sections?.map((section, si) => (
          <div key={si} className="mb-3">
            <p className="text-sm font-medium text-content-secondary mb-1">
              {section.title}
            </p>
            {section.items.map((item, ii) => (
              <div
                key={ii}
                className="flex items-center justify-between text-xs text-content-tertiary py-0.5"
              >
                <span>
                  {item.description} ({item.quantity} × ${item.unit_price})
                </span>
                <span>${item.total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        ))}

        <div className="border-t border-edge-secondary pt-2 mt-2 flex items-center justify-between">
          <span className="font-semibold text-content-primary">{t("estimateTotal")}</span>
          <span className="text-xl font-bold text-content-primary">
            ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Payment breakdown */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-content-tertiary">{t("fromPool")}</span>
          <span className="text-green-500 font-medium">
            -${poolUsed.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        </div>
        {cardCharged > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-content-tertiary">{t("chargedToCard")}</span>
            <span className="text-content-primary font-medium">
              ${cardCharged.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm">
          <span className="text-content-tertiary">{t("poolAfter")}</span>
          <span className="text-content-quaternary">
            ${Math.max(0, poolBalance - poolUsed).toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 mb-3">{error}</p>
      )}

      <button
        onClick={handleApprove}
        disabled={isPending}
        className="w-full py-2.5 rounded-lg text-sm font-medium bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-50 transition-colors"
      >
        {isPending ? t("approving") : t("approveEstimate")}
      </button>
    </div>
  );
}
