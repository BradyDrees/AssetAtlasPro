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
          <div className="bg-surface-primary rounded-xl border border-edge-primary shadow-xl max-w-md w-full p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-content-primary mb-4">
              {t("dealAnalysis.newDealTitle")}
            </h2>
            <DealForm onClose={() => setShowCreate(false)} />
          </div>
        </div>
      )}

      {/* Deal list */}
      {deals.length === 0 ? (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3v18h18M7 16l4-4 4 4 5-6" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-content-primary mb-2">
            {t("dealAnalysis.noDeals")}
          </h3>
          <p className="text-content-quaternary mb-6">
            {t("dealAnalysis.createFirst")}
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t("dealAnalysis.newDeal")}
          </button>
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
