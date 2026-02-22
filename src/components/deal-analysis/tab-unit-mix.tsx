"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import type { DealData, UnitMixRow } from "@/lib/deal-analysis-types";
import type { DealCalcResult } from "@/lib/deal-analysis-calc";
import { fmt } from "@/lib/deal-analysis-calc";
import { DealSection } from "./deal-section";

interface Props {
  d: DealData;
  set: <K extends keyof DealData>(key: K, val: DealData[K]) => void;
  calc: DealCalcResult;
}

export function TabUnitMix({ d, set, calc }: Props) {
  const t = useTranslations("dealAnalysis");

  const updateRow = useCallback(
    (idx: number, field: keyof UnitMixRow, val: string | number) => {
      const rows = [...d.unitMix];
      rows[idx] = { ...rows[idx], [field]: val };
      set("unitMix", rows);
    },
    [d.unitMix, set]
  );

  const addRow = useCallback(() => {
    set("unitMix", [
      ...d.unitMix,
      { type: "", sf: 0, count: 0, currentRent: 0, marketRent: 0 },
    ]);
  }, [d.unitMix, set]);

  const removeRow = useCallback(
    (idx: number) => {
      set(
        "unitMix",
        d.unitMix.filter((_, i) => i !== idx)
      );
    },
    [d.unitMix, set]
  );

  return (
    <div>
      <h2 className="text-lg font-bold text-content-primary mb-4">{t("tabs.unitMix")}</h2>
      <div className="bg-surface-primary rounded-lg border border-edge-primary overflow-hidden">
        <DealSection title={t("sections.unitMix")} color="brand">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] sm:text-xs">
              <thead>
                <tr className="border-b border-edge-secondary">
                  <th className="text-left py-2 px-1 sm:px-2 text-content-muted font-medium">{t("unitMixHeaders.type")}</th>
                  <th className="text-right py-2 px-1 sm:px-2 text-content-muted font-medium">{t("unitMixHeaders.sf")}</th>
                  <th className="text-right py-2 px-1 sm:px-2 text-content-muted font-medium">{t("unitMixHeaders.count")}</th>
                  <th className="text-right py-2 px-1 sm:px-2 text-content-muted font-medium">{t("unitMixHeaders.currentRent")}</th>
                  <th className="text-right py-2 px-1 sm:px-2 text-content-muted font-medium">{t("unitMixHeaders.marketRent")}</th>
                  <th className="text-right py-2 px-1 sm:px-2 text-content-muted font-medium">{t("unitMixHeaders.monthly")}</th>
                  <th className="text-right py-2 px-1 sm:px-2 text-content-muted font-medium">{t("unitMixHeaders.annual")}</th>
                  <th className="text-right py-2 px-1 sm:px-2 text-content-muted font-medium">{t("unitMixHeaders.upside")}</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {d.unitMix.map((row, i) => {
                  const monthly = row.currentRent * row.count;
                  const annual = monthly * 12;
                  const upside = (row.marketRent - row.currentRent) * row.count * 12;
                  return (
                    <tr key={i} className="border-b border-edge-tertiary">
                      <td className="py-1 px-0.5 sm:px-1">
                        <input
                          className="w-full px-1.5 sm:px-2 py-1 text-xs bg-surface-secondary border border-edge-secondary rounded text-content-primary"
                          value={row.type}
                          onChange={(e) => updateRow(i, "type", e.target.value)}
                        />
                      </td>
                      <td className="py-1 px-0.5 sm:px-1">
                        <input
                          className="w-14 sm:w-16 px-1.5 sm:px-2 py-1 text-xs text-right bg-surface-secondary border border-edge-secondary rounded font-mono text-content-primary"
                          value={row.sf || ""}
                          onChange={(e) => updateRow(i, "sf", parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="py-1 px-0.5 sm:px-1">
                        <input
                          className="w-12 sm:w-14 px-1.5 sm:px-2 py-1 text-xs text-right bg-surface-secondary border border-edge-secondary rounded font-mono text-content-primary"
                          value={row.count || ""}
                          onChange={(e) => updateRow(i, "count", parseInt(e.target.value) || 0)}
                        />
                      </td>
                      <td className="py-1 px-0.5 sm:px-1">
                        <input
                          className="w-16 sm:w-20 px-1.5 sm:px-2 py-1 text-xs text-right bg-surface-secondary border border-edge-secondary rounded font-mono text-content-primary"
                          value={row.currentRent || ""}
                          onChange={(e) => updateRow(i, "currentRent", parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="py-1 px-0.5 sm:px-1">
                        <input
                          className="w-16 sm:w-20 px-1.5 sm:px-2 py-1 text-xs text-right bg-surface-secondary border border-edge-secondary rounded font-mono text-content-primary"
                          value={row.marketRent || ""}
                          onChange={(e) => updateRow(i, "marketRent", parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="text-right px-1 sm:px-2 font-mono text-content-secondary whitespace-nowrap">{fmt(monthly)}</td>
                      <td className="text-right px-1 sm:px-2 font-mono text-content-secondary whitespace-nowrap">{fmt(annual)}</td>
                      <td className="text-right px-1 sm:px-2 font-mono text-brand-400 whitespace-nowrap">{fmt(upside)}</td>
                      <td className="px-0.5 sm:px-1">
                        <button
                          onClick={() => removeRow(i)}
                          className="text-red-400 hover:text-red-300 text-xs px-1"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-edge-secondary font-semibold">
                  <td className="py-2 px-1 sm:px-2 text-content-primary">{t("unitMixHeaders.totals")}</td>
                  <td className="text-right px-1 sm:px-2 font-mono text-content-primary">{fmt(calc.unitMixAvgSF, "num")}</td>
                  <td className="text-right px-1 sm:px-2 font-mono text-content-primary">{calc.unitMixTotalUnits}</td>
                  <td></td>
                  <td></td>
                  <td className="text-right px-1 sm:px-2 font-mono text-content-primary whitespace-nowrap">{fmt(calc.unitMixMonthlyIncome)}</td>
                  <td className="text-right px-1 sm:px-2 font-mono text-content-primary whitespace-nowrap">{fmt(calc.unitMixAnnualIncome)}</td>
                  <td className="text-right px-1 sm:px-2 font-mono text-brand-400 whitespace-nowrap">{fmt(calc.unitMixTotalUpside)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <button
            onClick={addRow}
            className="mt-2 text-xs text-brand-400 hover:text-brand-300 font-medium"
          >
            + {t("addRow")}
          </button>
        </DealSection>
      </div>
    </div>
  );
}
