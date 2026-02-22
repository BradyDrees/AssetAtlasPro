"use client";

import { useTranslations } from "next-intl";
import type { DealData } from "@/lib/deal-analysis-types";
import type { DealCalcResult } from "@/lib/deal-analysis-calc";
import { fmt } from "@/lib/deal-analysis-calc";
import { DealCalcField } from "./deal-calc-field";
import { DealSection } from "./deal-section";

interface Props {
  d: DealData;
  calc: DealCalcResult;
}

export function TabReturnsExit({ d, calc }: Props) {
  const t = useTranslations("dealAnalysis");

  return (
    <div>
      <h2 className="text-lg font-bold text-content-primary mb-4">{t("tabs.returns")}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Exit Analysis */}
        <div className="bg-surface-primary rounded-lg border border-edge-primary overflow-hidden">
          <DealSection title={t("sections.exitAnalysis", { year: d.holdYears })} color="red">
            <DealCalcField label={t("fields.yr5NOI")} value={calc.yr5NOI} />
            <DealCalcField label={t("fields.exitCap")} value={d.exitCap} type="pct" />
            <DealCalcField label={t("fields.grossSalePrice")} value={calc.grossSalePrice} highlight />
            <DealCalcField label={t("fields.sellingCostsDollar")} value={calc.sellingCosts} />
            <DealCalcField label={t("fields.netSaleProceeds")} value={calc.netSaleProceeds} />
            <DealCalcField label={t("fields.loanBalExit")} value={calc.loanBalExit} />
            <DealCalcField label={t("fields.netEquity")} value={calc.netEquity} bold highlight />
          </DealSection>
        </div>

        {/* Returns Summary */}
        <div className="bg-surface-primary rounded-lg border border-edge-primary overflow-hidden">
          <DealSection title={t("sections.returnsSummary")} color="brand">
            <DealCalcField label={t("fields.totalCapital")} value={calc.totalCapital} />
            <DealCalcField label={t("fields.totalCF")} value={calc.totalCF} />
            <DealCalcField label={t("fields.netEquity")} value={calc.netEquity} />
            <DealCalcField label={t("fields.totalProfit")} value={calc.totalProfit} bold highlight />
            <DealCalcField label={t("fields.equityMultiple")} value={calc.equityMultiple} type="x" highlight />
            <DealCalcField label={t("fields.avgAnnualReturn")} value={calc.avgAnnualReturn} type="pct" highlight />
            <DealCalcField label={t("fields.avgCOC")} value={calc.avgCOC} type="pct" />
          </DealSection>
        </div>

        {/* Refi Scenario */}
        <div className="md:col-span-2 bg-surface-primary rounded-lg border border-edge-primary overflow-hidden">
          <DealSection title={t("sections.refiScenario", { year: d.refiYear })} color="purple">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-0">
              <DealCalcField label={t("fields.refiYearNOI", { year: d.refiYear })} value={calc.refiYearNOI} />
              <DealCalcField label={t("fields.appraisedValue")} value={calc.refiAppraisedVal} />
              <DealCalcField label={t("fields.newLoan", { ltv: fmt(d.refiLTV, "pct") })} value={calc.refiLoanAmt} />
              <DealCalcField label={t("fields.cashOutRefi")} value={calc.cashOut} bold highlight />
            </div>
            <DealCalcField label={t("fields.pctCapReturned")} value={calc.pctCapReturned} type="pct" bold highlight />
          </DealSection>
        </div>
      </div>
    </div>
  );
}
