"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { DealAnalysis } from "@/lib/deal-analysis-types";
import { DealCard } from "./deal-card";
import { DealForm } from "./deal-form";

interface DealAnalysisListClientProps {
  deals: DealAnalysis[];
}

export function DealAnalysisListClient({ deals }: DealAnalysisListClientProps) {
  const [showCreate, setShowCreate] = useState(false);
  const t = useTranslations();

  return (
    <>
      {/* Create button */}
      <div className="mb-6">
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          {t("dealAnalysis.newDeal")}
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-primary rounded-xl border border-edge-primary shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-content-primary mb-4">
              {t("dealAnalysis.newDealTitle")}
            </h2>
            <DealForm onClose={() => setShowCreate(false)} />
          </div>
        </div>
      )}

      {/* Deal list */}
      {deals.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-content-tertiary">
            {t("dealAnalysis.noDeals")}
          </p>
          <p className="text-sm text-content-muted mt-1">
            {t("dealAnalysis.createFirst")}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      )}
    </>
  );
}
