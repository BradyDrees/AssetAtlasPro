"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { approveEstimate } from "@/app/actions/home-work-orders";
import { SignaturePad } from "@/components/vendor/signature-pad";

type EstimateTier = "good" | "better" | "best";

interface TierSection {
  id: string;
  title: string;
  tier: string | null;
  subtotal: number;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
}

interface EstimateApprovalProps {
  woId: string;
  estimate: {
    id: string;
    estimate_number: string;
    total: number;
    status: string;
    tier_mode?: string;
    selected_tier?: string | null;
    sections?: TierSection[];
  };
  poolBalance: number;
}

const TIER_COLORS: Record<string, { bg: string; border: string; text: string; ring: string }> = {
  good: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", ring: "ring-blue-500/50" },
  better: { bg: "bg-brand-500/10", border: "border-brand-500/30", text: "text-brand-400", ring: "ring-brand-500/50" },
  best: { bg: "bg-gold-500/10", border: "border-gold-500/30", text: "text-gold-400", ring: "ring-gold-500/50" },
};

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
  const [selectedTier, setSelectedTier] = useState<EstimateTier | null>(
    (estimate.selected_tier as EstimateTier) ?? null
  );
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [showSignature, setShowSignature] = useState(false);

  const isTiered = Boolean(estimate.tier_mode && estimate.tier_mode !== "none");

  // Compute tier totals from sections
  const tierTotals: Record<string, number> = {};
  if (isTiered && estimate.sections) {
    for (const section of estimate.sections) {
      const tier = section.tier ?? "good";
      tierTotals[tier] = (tierTotals[tier] || 0) + (Number(section.subtotal) || 0);
    }
  }

  // Use selected tier total or full estimate total
  const displayTotal = isTiered && selectedTier
    ? (tierTotals[selectedTier] || 0)
    : Number(estimate.total) || 0;

  const poolUsed = Math.min(poolBalance, displayTotal);
  const cardCharged = displayTotal - poolUsed;

  const handleApprove = () => {
    setError(null);
    if (isTiered && !selectedTier) {
      setError(wt("selectTierRequired"));
      return;
    }
    if (!signatureDataUrl) {
      setShowSignature(true);
      return;
    }
    startTransition(async () => {
      const result = await approveEstimate({
        woId,
        estimateId: estimate.id,
        ...(selectedTier ? { selectedTier } : {}),
        signatureDataUrl: signatureDataUrl ?? undefined,
        signedBy: "Homeowner",
      });
      if (result.success) {
        setApproved(true);
      } else {
        setError(result.error ?? "Failed to approve estimate");
      }
    });
  };

  const handleSignatureSave = (dataUrl: string) => {
    setSignatureDataUrl(dataUrl);
    setShowSignature(false);
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
        {isTiered && estimate.selected_tier && (
          <p className="text-sm text-green-600 mt-1">
            {wt("selectedTierLabel")}: {wt(`tier_${estimate.selected_tier}`)}
          </p>
        )}
        <p className="text-lg font-bold text-green-700 mt-1">
          ${displayTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-primary border border-edge-primary rounded-xl p-5">
      <h3 className="text-lg font-semibold text-content-primary mb-3">
        {t("reviewEstimate")}
      </h3>

      {/* Tier Selector for tiered estimates */}
      {isTiered && (
        <div className="mb-4">
          <p className="text-sm font-medium text-content-secondary mb-2">{wt("selectTier")}</p>
          <div className="grid grid-cols-3 gap-2">
            {(["good", "better", "best"] as const).map((tier) => {
              const colors = TIER_COLORS[tier];
              const tierTotal = tierTotals[tier] || 0;
              const isSelected = selectedTier === tier;

              return (
                <button
                  key={tier}
                  onClick={() => setSelectedTier(tier)}
                  className={`rounded-lg border-2 p-3 text-center transition-all ${
                    isSelected
                      ? `${colors.border} ${colors.bg} ring-2 ${colors.ring}`
                      : "border-edge-secondary bg-surface-secondary hover:border-edge-primary"
                  }`}
                >
                  <span className={`text-xs font-semibold uppercase ${isSelected ? colors.text : "text-content-tertiary"}`}>
                    {wt(`tier_${tier}`)}
                  </span>
                  <p className={`text-lg font-bold mt-1 ${isSelected ? colors.text : "text-content-primary"}`}>
                    ${tierTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Estimate summary — show selected tier items or all items */}
      <div className="bg-surface-secondary rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-content-tertiary">
            {wt("estimateNumber")}: #{estimate.estimate_number}
          </span>
          <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
            {t("pendingApproval")}
          </span>
        </div>

        {/* Line items — filter by selected tier if tiered */}
        {estimate.sections
          ?.filter((s) => !isTiered || !selectedTier || (s.tier ?? "good") === selectedTier)
          .map((section, si) => (
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
            ${displayTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
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

      {/* Signature section */}
      {showSignature && !signatureDataUrl && (
        <div className="mb-4">
          <p className="text-sm font-medium text-content-secondary mb-2">
            {wt("signatureRequired")}
          </p>
          <SignaturePad
            onSave={handleSignatureSave}
            onCancel={() => setShowSignature(false)}
            width={400}
            height={160}
          />
        </div>
      )}

      {signatureDataUrl && (
        <div className="mb-4 bg-surface-secondary rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-green-500">{wt("signatureCaptured")}</span>
            <button
              onClick={() => { setSignatureDataUrl(null); setShowSignature(true); }}
              className="text-xs text-content-quaternary hover:text-content-primary"
            >
              {wt("resignButton")}
            </button>
          </div>
          <img
            src={signatureDataUrl}
            alt="Signature"
            className="h-12 object-contain"
          />
        </div>
      )}

      {/* Financing option — only if amount is eligible */}
      {displayTotal >= 500 && displayTotal <= 25000 && (
        <div className="mb-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
            <span className="text-xs font-medium text-emerald-400">
              {wt("financingAvailable")}
            </span>
          </div>
          <p className="text-[10px] text-content-quaternary ml-6">
            {wt("financingDesc")}
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 mb-3">{error}</p>
      )}

      <button
        onClick={handleApprove}
        disabled={isPending || (isTiered && !selectedTier)}
        className="w-full py-2.5 rounded-lg text-sm font-medium bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-50 transition-colors"
      >
        {isPending
          ? t("approving")
          : signatureDataUrl
            ? t("approveEstimate")
            : wt("signAndApprove")}
      </button>
    </div>
  );
}
