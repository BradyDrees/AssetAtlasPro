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

export function TabDealInputs({ d, calc, set }: Props) {
  const t = useTranslations("dealAnalysis");

  return (
    <div>
      <h2 className="text-lg font-bold text-content-primary mb-4">{t("tabs.inputs")}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Property Information */}
        <div className="bg-surface-primary rounded-lg border border-edge-primary overflow-hidden">
          <DealSection title={t("sections.propertyInfo")} color="brand">
            <DealInputField label={t("fields.propType")} value={d.propType} onChange={(v) => set("propType", v as string)} type="text" />
            <DealInputField label={t("fields.propClass")} value={d.propClass} onChange={(v) => set("propClass", v as string)} type="text" />
            <DealInputField label={t("fields.yearBuilt")} value={d.yearBuilt} onChange={(v) => set("yearBuilt", v as number)} type="number" />
            <DealInputField label={t("fields.totalUnits")} value={d.units} onChange={(v) => set("units", v as number)} type="number" />
            <DealInputField label={t("fields.rentableSF")} value={d.rentableSF} onChange={(v) => set("rentableSF", v as number)} type="number" />
            <DealInputField label={t("fields.occupancy")} value={d.occupancy} onChange={(v) => set("occupancy", v as number)} type="pct" />
          </DealSection>
        </div>

        {/* Deal Pricing */}
        <div className="bg-surface-primary rounded-lg border border-edge-primary overflow-hidden">
          <DealSection title={t("sections.dealPricing")} color="purple">
            <DealInputField label={t("fields.askingPrice")} value={d.askingPrice} onChange={(v) => set("askingPrice", v as number)} />
            <DealInputField label={t("fields.offerPrice")} value={d.offerPrice} onChange={(v) => set("offerPrice", v as number)} />
            <DealCalcField label={t("fields.pricePerUnitAsk")} value={calc.pricePerUnit} />
            <DealCalcField label={t("fields.pricePerUnitOffer")} value={calc.pricePerUnitOffer} />
            <DealCalcField label={t("fields.pricePerSF")} value={calc.pricePerSF} />
            <DealInputField label={t("fields.emd")} value={d.emd} onChange={(v) => set("emd", v as number)} />
          </DealSection>
        </div>

        {/* Primary Financing */}
        <div className="bg-surface-primary rounded-lg border border-edge-primary overflow-hidden">
          <DealSection title={t("sections.financing")} color="green">
            <DealInputField label={t("fields.ltv")} value={d.ltv} onChange={(v) => set("ltv", v as number)} type="pct" />
            <DealInputField label={t("fields.intRate")} value={d.intRate} onChange={(v) => set("intRate", v as number)} type="pct" />
            <DealInputField label={t("fields.amort")} value={d.amort} onChange={(v) => set("amort", v as number)} type="number" />
            <DealInputField label={t("fields.loanTerm")} value={d.loanTerm} onChange={(v) => set("loanTerm", v as number)} type="number" />
            <DealInputField label={t("fields.ioPeriod")} value={d.ioPeriod} onChange={(v) => set("ioPeriod", v as number)} type="number" />
            <DealCalcField label={t("fields.loanAmount")} value={calc.loanAmt} highlight />
            <DealCalcField label={t("fields.downPayment")} value={calc.downPmt} highlight />
            <DealCalcField label={t("fields.monthlyPI")} value={calc.monthlyPI} />
            <DealCalcField label={t("fields.monthlyIO")} value={calc.monthlyIO} />
            <DealCalcField label={t("fields.annualDSio")} value={calc.annualDSio} bold />
            <DealCalcField label={t("fields.annualDSamort")} value={calc.annualDSamort} />
          </DealSection>
        </div>

        {/* Closing & Acquisition Costs */}
        <div className="bg-surface-primary rounded-lg border border-edge-primary overflow-hidden">
          <DealSection title={t("sections.closing")} color="gold">
            <DealInputField label={t("fields.titleFees")} value={d.titleFees} onChange={(v) => set("titleFees", v as number)} />
            <DealInputField label={t("fields.legalFees")} value={d.legalFees} onChange={(v) => set("legalFees", v as number)} />
            <DealInputField label={t("fields.appraisal")} value={d.appraisal} onChange={(v) => set("appraisal", v as number)} />
            <DealInputField label={t("fields.inspectionFees")} value={d.inspectionFees} onChange={(v) => set("inspectionFees", v as number)} />
            <DealInputField label={t("fields.survey")} value={d.survey} onChange={(v) => set("survey", v as number)} />
            <DealInputField label={t("fields.loanPoints")} value={d.loanPoints} onChange={(v) => set("loanPoints", v as number)} type="pct" />
            <DealCalcField label={t("fields.loanOrigCost")} value={calc.loanOrigCost} />
            <DealInputField label={t("fields.acqFee")} value={d.acqFee} onChange={(v) => set("acqFee", v as number)} type="pct" />
            <DealCalcField label={t("fields.acqFeeDollar")} value={calc.acqFeeDollar} />
            <DealInputField label={t("fields.otherClosing")} value={d.otherClosing} onChange={(v) => set("otherClosing", v as number)} />
            <DealCalcField label={t("fields.totalClosing")} value={calc.totalClosing} bold highlight />
          </DealSection>

          <DealSection title={t("sections.growth")} color="pink">
            <DealInputField label={t("fields.rentGrowth")} value={d.rentGrowth} onChange={(v) => set("rentGrowth", v as number)} type="pct" />
            <DealInputField label={t("fields.expGrowth")} value={d.expGrowth} onChange={(v) => set("expGrowth", v as number)} type="pct" />
            <DealInputField label={t("fields.taxGrowthYr2")} value={d.taxGrowthYr2} onChange={(v) => set("taxGrowthYr2", v as number)} type="pct" />
            <DealInputField label={t("fields.taxGrowthYr3")} value={d.taxGrowthYr3} onChange={(v) => set("taxGrowthYr3", v as number)} type="pct" />
            <DealInputField label={t("fields.insGrowth")} value={d.insGrowth} onChange={(v) => set("insGrowth", v as number)} type="pct" />
            <DealInputField label={t("fields.exitCap")} value={d.exitCap} onChange={(v) => set("exitCap", v as number)} type="pct" />
            <DealInputField label={t("fields.sellCosts")} value={d.sellCosts} onChange={(v) => set("sellCosts", v as number)} type="pct" />
            <DealInputField label={t("fields.holdYears")} value={d.holdYears} onChange={(v) => set("holdYears", v as number)} type="number" />
          </DealSection>
        </div>
      </div>

      {/* Total Capital Summary */}
      <div className="mt-4 bg-surface-primary rounded-lg border border-edge-primary overflow-hidden">
        <DealSection title={t("sections.totalCapital")} color="red">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-0">
            <DealCalcField label={t("fields.downPayment")} value={calc.downPmt} highlight />
            <DealCalcField label={t("fields.closingCosts")} value={calc.totalClosing} />
            <DealInputField label={t("fields.rehabBudget")} value={d.rehabBudget} onChange={(v) => set("rehabBudget", v as number)} />
            <DealCalcField label={t("fields.reserves")} value={calc.reserves} />
            <DealCalcField label={t("fields.totalCapital")} value={calc.totalCapital} bold highlight />
          </div>
        </DealSection>
      </div>
    </div>
  );
}
