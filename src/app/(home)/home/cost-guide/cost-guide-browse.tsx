"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CostGuideCard } from "@/components/home/cost-guide-card";
import { COST_GUIDES, getCostGuideTrades, getCostGuidesForTrade } from "@/lib/home/cost-guide-data";

export function CostGuideBrowse() {
  const t = useTranslations("home.costGuide");
  const trades = getCostGuideTrades();
  const [selectedTrade, setSelectedTrade] = useState<string>("");

  const guides = selectedTrade
    ? getCostGuidesForTrade(selectedTrade)
    : COST_GUIDES;

  return (
    <div className="space-y-4">
      {/* Trade filter */}
      <select
        value={selectedTrade}
        onChange={(e) => setSelectedTrade(e.target.value)}
        className="w-full px-3 py-2.5 bg-surface-primary border border-edge-primary rounded-lg text-content-primary text-sm"
      >
        <option value="">{t("allTrades")}</option>
        {trades.map((trade) => (
          <option key={trade} value={trade} className="capitalize">
            {trade}
          </option>
        ))}
      </select>

      <div className="bg-surface-primary rounded-xl border border-edge-primary p-5">
        <CostGuideCard guides={guides} />
      </div>
    </div>
  );
}
