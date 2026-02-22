"use client";

import { useTranslations } from "next-intl";
import type { DealData } from "@/lib/deal-analysis-types";
import type { DealCalcResult } from "@/lib/deal-analysis-calc";
import { DealInputField } from "./deal-input-field";
import { DealCalcField } from "./deal-calc-field";
import { DealSection } from "./deal-section";

interface Props {
  d: DealData;
  calc: DealCalcResult;
  set: <K extends keyof DealData>(key: K, val: DealData[K]) => void;
}

export function TabFlip({ d, calc, set }: Props) {
  const t = useTranslations("dealAnalysis");

  return (
    <div>
      <h2 className="text-lg font-bold text-content-primary mb-4">{t("tabs.flip")}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Flip Inputs */}
        <div className="bg-surface-primary rounded-lg border border-edge-primary overflow-hidden">
          <DealSection title={t("sections.flipInputs")} color="gold">
            <DealInputField label={t("flipFields.arv")} value={d.flipARV} onChange={(v) => set("flipARV", v as number)} />
            <DealInputField label={t("flipFields.purchase")} value={d.flipPurchase} onChange={(v) => set("flipPurchase", v as number)} />
            <DealInputField label={t("flipFields.repairs")} value={d.flipRepairs} onChange={(v) => set("flipRepairs", v as number)} />
            <DealInputField label={t("flipFields.months")} value={d.flipMonths} onChange={(v) => set("flipMonths", v as number)} type="number" />
            <DealInputField label={t("flipFields.loan")} value={d.flipLoan} onChange={(v) => set("flipLoan", v as number)} />
            <DealInputField label={t("flipFields.rate")} value={d.flipRate} onChange={(v) => set("flipRate", v as number)} type="pct" />
            <DealInputField label={t("flipFields.carrying")} value={d.flipCarrying} onChange={(v) => set("flipCarrying", v as number)} />
            <DealInputField label={t("flipFields.commission")} value={d.flipCommission} onChange={(v) => set("flipCommission", v as number)} type="pct" />
            <DealInputField label={t("flipFields.buyClose")} value={d.flipBuyClose} onChange={(v) => set("flipBuyClose", v as number)} />
            <DealInputField label={t("flipFields.sellClose")} value={d.flipSellClose} onChange={(v) => set("flipSellClose", v as number)} />
            <DealInputField label={t("flipFields.points")} value={d.flipPoints} onChange={(v) => set("flipPoints", v as number)} />
            <DealInputField label={t("flipFields.otherFees")} value={d.flipOtherFees} onChange={(v) => set("flipOtherFees", v as number)} />
          </DealSection>
        </div>

        {/* Flip Returns */}
        <div className="bg-surface-primary rounded-lg border border-edge-primary overflow-hidden">
          <DealSection title={t("sections.flipReturns")} color="green">
            <DealCalcField label={t("flipCalc.interest")} value={calc.flipInterest} />
            <DealCalcField label={t("flipCalc.totalCarry")} value={calc.flipTotalCarry} />
            <DealCalcField label={t("flipCalc.commDollar")} value={calc.flipCommDollar} />
            <DealCalcField label={t("flipCalc.totalExp")} value={calc.flipTotalExp} bold />
            <DealCalcField label={t("flipCalc.allIn")} value={calc.flipAllIn} bold />
            <DealCalcField label={t("flipCalc.cashInvested")} value={calc.flipCashInvested} />
            <DealCalcField label={t("flipCalc.profit")} value={calc.flipProfit} bold highlight />
            <DealCalcField label={t("flipCalc.roiTotal")} value={calc.flipROI} type="pct" />
            <DealCalcField label={t("flipCalc.roiCash")} value={calc.flipROICash} type="pct" highlight />
            <DealCalcField label={t("flipCalc.annROI")} value={calc.flipAnnROI} type="pct" highlight />
            <DealCalcField label={t("flipCalc.arvRule")} value={calc.flipARVRule} type="pct" />
            <div className="py-2 px-2">
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                  calc.flipARVRule <= 0.70
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    calc.flipARVRule <= 0.70 ? "bg-green-400" : "bg-red-400"
                  }`}
                />
                {calc.flipARVRule <= 0.70
                  ? t("flipCalc.within70")
                  : t("flipCalc.exceeds70")}
              </span>
            </div>
          </DealSection>
        </div>
      </div>
    </div>
  );
}
