"use client";

import { useTranslations } from "next-intl";
import type { DealData } from "@/lib/deal-analysis-types";
import type { DealCalcResult } from "@/lib/deal-analysis-calc";
import { DealCalcField } from "./deal-calc-field";
import { DealSection } from "./deal-section";

interface Props {
  d: DealData;
  calc: DealCalcResult;
}

export function TabQuickAnalysis({ d, calc }: Props) {
  const t = useTranslations("dealAnalysis");

  return (
    <div>
      <h2 className="text-lg font-bold text-content-primary mb-4">{t("tabs.quick")}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* KPIs */}
        <div className="bg-surface-primary rounded-lg border border-edge-primary overflow-hidden">
          <DealSection title={t("sections.kpis")} color="brand">
            <DealCalcField label={t("fields.capRateAsk")} value={calc.capRateAsk} type="pct" />
            <DealCalcField label={t("fields.capRateOffer")} value={calc.capRateOffer} type="pct" highlight />
            <DealCalcField label={t("fields.grm")} value={calc.grm} type="x" />
            <DealCalcField label={t("fields.twoPctRule")} value={calc.twoPctRule} type="pct" />
            <DealCalcField label={t("fields.pricePerUnit")} value={calc.pricePerUnit} />
            <DealCalcField label={t("fields.noiPerUnit")} value={calc.noiPerUnit} />
            <DealCalcField label={t("fields.expPerUnit")} value={calc.expPerUnit} />
            <DealCalcField label={t("fields.expRatio")} value={calc.expRatio} type="pct" />
            <DealCalcField label={t("fields.dcr")} value={calc.dcr} type="x" highlight />
            <DealCalcField label={t("fields.cashFlow")} value={calc.cashFlow} bold />
            <DealCalcField label={t("fields.coc")} value={calc.coc} type="pct" highlight />
          </DealSection>
        </div>

        {/* Go / No-Go */}
        <div className="bg-surface-primary rounded-lg border border-edge-primary overflow-hidden">
          <DealSection title={t("sections.goNoGo")} color="green">
            <div className="space-y-2 py-2">
              {calc.quickChecks.map((c) => (
                <div
                  key={c.key}
                  className="flex items-center justify-between px-2 py-2 rounded-lg border"
                  style={{
                    background: c.pass ? "rgba(34,197,94,0.05)" : "rgba(239,68,68,0.05)",
                    borderColor: c.pass ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.pass
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          c.pass ? "bg-green-400" : "bg-red-400"
                        }`}
                      />
                      {c.pass ? "PASS" : "FAIL"}
                    </span>
                    <span className="text-xs text-content-secondary">
                      {t(`checks.${c.key}`)}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-mono font-semibold ${
                      c.pass ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {c.value}
                  </span>
                </div>
              ))}
            </div>
          </DealSection>

          <DealSection title={t("sections.quickNoi")} color="purple">
            <DealCalcField label={t("fields.gpr")} value={d.gpr} />
            <DealCalcField label={t("fields.egi")} value={calc.egi} />
            <DealCalcField label={t("fields.totalExp")} value={calc.totalExp} />
            <DealCalcField label={t("fields.reserves")} value={calc.reserves} />
            <DealCalcField label={t("fields.noi")} value={calc.noi} bold highlight />
          </DealSection>
        </div>
      </div>
    </div>
  );
}
