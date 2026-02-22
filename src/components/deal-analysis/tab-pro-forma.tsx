"use client";

import { useTranslations } from "next-intl";
import type { DealData } from "@/lib/deal-analysis-types";
import type { DealCalcResult } from "@/lib/deal-analysis-calc";
import { fmt } from "@/lib/deal-analysis-calc";
import { DealSection } from "./deal-section";

interface Props {
  d: DealData;
  calc: DealCalcResult;
  setArr: <K extends keyof DealData>(key: K, idx: number, val: number) => void;
}

export function TabProForma({ d, calc, setArr }: Props) {
  const t = useTranslations("dealAnalysis");

  const rows: {
    label: string;
    key: string;
    type?: "pct" | "x";
    bold?: boolean;
    highlight?: boolean;
    section?: boolean;
  }[] = [
    { label: t("proFormaRows.gpr"), key: "gpr", section: true },
    { label: t("proFormaRows.totalLoss"), key: "totalLoss", type: "pct" },
    { label: t("proFormaRows.netRental"), key: "netRental", bold: true },
    { label: t("proFormaRows.rubs"), key: "rubs" },
    { label: t("proFormaRows.otherIncome"), key: "other" },
    { label: t("proFormaRows.egi"), key: "egi", bold: true, highlight: true },
    { label: t("proFormaRows.reTax"), key: "tax", section: true },
    { label: t("proFormaRows.insurance"), key: "ins" },
    { label: t("proFormaRows.otherExp"), key: "otherExp" },
    { label: t("proFormaRows.totalExp"), key: "totalExp", bold: true },
    { label: t("proFormaRows.reserves"), key: "reserves" },
    { label: t("proFormaRows.noi"), key: "noi", bold: true, highlight: true },
    { label: t("proFormaRows.ds"), key: "ds", section: true },
    { label: t("proFormaRows.cf"), key: "cf", bold: true, highlight: true },
    { label: t("proFormaRows.dcr"), key: "dcr", type: "x" },
    { label: t("proFormaRows.coc"), key: "coc", type: "pct" },
    { label: t("proFormaRows.expRatio"), key: "expRatio", type: "pct" },
  ];

  return (
    <div>
      <h2 className="text-lg font-bold text-content-primary mb-4">{t("tabs.proforma")}</h2>

      {/* Adjustable loss rates */}
      <div className="bg-surface-primary rounded-lg border border-edge-primary overflow-hidden mb-4">
        <DealSection title={t("sections.lossAssumptions")} color="gold">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left py-2 px-1 sm:px-2 text-content-muted"></th>
                  {calc.years.map((y) => (
                    <th key={y.year} className="text-right py-2 px-1 sm:px-2 text-content-muted font-medium whitespace-nowrap">
                      <span className="hidden sm:inline">{t("year")} </span>{y.year}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    [t("proFormaRates.vacancy"), "vacRates"],
                    [t("proFormaRates.ltl"), "ltlRates"],
                    [t("proFormaRates.concessions"), "concRates"],
                  ] as [string, keyof DealData][]
                ).map(([label, key]) => (
                  <tr key={key}>
                    <td className="py-1 px-1 sm:px-2 text-content-tertiary whitespace-nowrap">{label}</td>
                    {(d[key] as number[]).map((v, i) => (
                      <td key={i} className="py-1 px-0.5 sm:px-2 text-right">
                        <input
                          className="w-12 sm:w-14 px-1 py-1 text-xs text-right bg-surface-secondary border border-edge-secondary rounded font-mono text-brand-400"
                          value={(v * 100).toFixed(1)}
                          onChange={(e) => {
                            const nv = parseFloat(e.target.value);
                            if (!isNaN(nv)) setArr(key, i, nv / 100);
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DealSection>
      </div>

      {/* Pro Forma Table */}
      <div className="bg-surface-primary rounded-lg border border-edge-primary overflow-hidden">
        <div className="overflow-x-auto p-2 sm:p-4">
          <table className="w-full text-[11px] sm:text-xs">
            <thead>
              <tr>
                <th className="text-left py-2 px-1.5 sm:px-3 text-content-primary font-semibold border-b-2 border-brand-500 whitespace-nowrap">
                  {t("proFormaHeaders.metric")}
                </th>
                {calc.years.map((y) => (
                  <th
                    key={y.year}
                    className="text-right py-2 px-1.5 sm:px-3 text-content-primary font-semibold border-b-2 border-brand-500 whitespace-nowrap"
                  >
                    {t("year")} {y.year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr
                  key={ri}
                  className={
                    row.highlight
                      ? "bg-brand-500/5"
                      : row.section
                      ? "bg-surface-secondary/50"
                      : ""
                  }
                >
                  <td
                    className={`py-1.5 px-1.5 sm:px-3 border-b border-edge-tertiary whitespace-nowrap ${
                      row.bold
                        ? "text-content-primary font-semibold"
                        : "text-content-tertiary"
                    }`}
                  >
                    {row.label}
                  </td>
                  {calc.years.map((y) => (
                    <td
                      key={y.year}
                      className={`text-right py-1.5 px-1.5 sm:px-3 font-mono border-b border-edge-tertiary whitespace-nowrap ${
                        row.highlight
                          ? "text-brand-400 font-semibold"
                          : row.bold
                          ? "text-content-primary font-semibold"
                          : "text-content-secondary"
                      }`}
                    >
                      {fmt(
                        y[row.key as keyof typeof y] as number,
                        row.type || "currency"
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
