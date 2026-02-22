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

export function TabIncomeExpenses({ d, calc, set }: Props) {
  const t = useTranslations("dealAnalysis");

  const expenseItems: [string, keyof DealData][] = [
    [t("expenseFields.reTax"), "reTax"],
    [t("expenseFields.insurance"), "insurance"],
    [t("expenseFields.mgmtFee"), "mgmtFee"],
    [t("expenseFields.payroll"), "payroll"],
    [t("expenseFields.repairsMaint"), "repairsMaint"],
    [t("expenseFields.contractSvc"), "contractSvc"],
    [t("expenseFields.turnover"), "turnover"],
    [t("expenseFields.utilitiesOwner"), "utilitiesOwner"],
    [t("expenseFields.waterSewer"), "waterSewer"],
    [t("expenseFields.landscaping"), "landscaping"],
    [t("expenseFields.pestControl"), "pestControl"],
    [t("expenseFields.advertising"), "advertising"],
    [t("expenseFields.ga"), "ga"],
    [t("expenseFields.legal"), "legal"],
    [t("expenseFields.security"), "security"],
    [t("expenseFields.otherExp"), "otherExp"],
  ];

  return (
    <div>
      <h2 className="text-lg font-bold text-content-primary mb-4">{t("tabs.income")}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Income */}
        <div className="bg-surface-primary rounded-lg border border-edge-primary overflow-hidden">
          <DealSection title={t("sections.income")} color="green">
            <DealInputField label={t("fields.gpr")} value={d.gpr} onChange={(v) => set("gpr", v as number)} />
            <DealInputField label={t("fields.lossToLease")} value={d.lossToLease} onChange={(v) => set("lossToLease", v as number)} indent={1} />
            <DealInputField label={t("fields.vacancyLoss")} value={d.vacancyLoss} onChange={(v) => set("vacancyLoss", v as number)} indent={1} />
            <DealInputField label={t("fields.concessions")} value={d.concessions} onChange={(v) => set("concessions", v as number)} indent={1} />
            <DealInputField label={t("fields.badDebt")} value={d.badDebt} onChange={(v) => set("badDebt", v as number)} indent={1} />
            <DealCalcField label={t("fields.netRental")} value={calc.netRental} bold />
            <DealInputField label={t("fields.rubs")} value={d.rubs} onChange={(v) => set("rubs", v as number)} />
            <DealInputField label={t("fields.otherIncome")} value={d.otherIncome} onChange={(v) => set("otherIncome", v as number)} />
            <DealCalcField label={t("fields.egi")} value={calc.egi} bold highlight />
          </DealSection>
        </div>

        {/* Expenses */}
        <div className="bg-surface-primary rounded-lg border border-edge-primary overflow-hidden">
          <DealSection title={t("sections.expenses")} color="red">
            {expenseItems.map(([label, key]) => (
              <DealInputField
                key={key}
                label={label}
                value={d[key] as number}
                onChange={(v) => set(key, v as number)}
              />
            ))}
            <DealCalcField label={t("fields.totalExp")} value={calc.totalExp} bold highlight />
            <DealCalcField label={t("fields.expRatio")} value={calc.expRatio} type="pct" />
            <DealCalcField label={t("fields.expPerUnit")} value={calc.expPerUnit} />
          </DealSection>
        </div>
      </div>

      {/* NOI Summary */}
      <div className="mt-4 bg-surface-primary rounded-lg border border-edge-primary overflow-hidden">
        <DealSection title={t("sections.noiSummary")} color="brand">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0">
            <DealCalcField label={t("fields.egi")} value={calc.egi} />
            <DealCalcField label={t("fields.totalExpReserves")} value={calc.totalExp + calc.reserves} />
            <DealCalcField label={t("fields.noi")} value={calc.noi} bold highlight />
          </div>
        </DealSection>
      </div>
    </div>
  );
}
