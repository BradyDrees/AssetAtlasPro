"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import type { DealData, DDChecklistItem } from "@/lib/deal-analysis-types";
import type { DealCalcResult } from "@/lib/deal-analysis-calc";
import { DealSection } from "./deal-section";

interface Props {
  d: DealData;
  calc: DealCalcResult;
  set: <K extends keyof DealData>(key: K, val: DealData[K]) => void;
}

const checklistStatuses = ["not_started", "in_progress", "complete", "na"] as const;

export function TabScorecard({ d, calc, set }: Props) {
  const t = useTranslations("dealAnalysis");

  const updateChecklist = useCallback(
    (idx: number, field: keyof DDChecklistItem, val: string) => {
      const items = [...d.ddChecklist];
      items[idx] = { ...items[idx], [field]: val };
      set("ddChecklist", items);
    },
    [d.ddChecklist, set]
  );

  return (
    <div>
      <h2 className="text-lg font-bold text-content-primary mb-4">{t("tabs.scorecard")}</h2>

      {/* Financial Scorecard */}
      <div className="bg-surface-primary rounded-lg border border-edge-primary overflow-hidden mb-4">
        <DealSection title={t("sections.financialChecks")} color="green">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
            {calc.fullChecks.map((c) => (
              <div
                key={c.key}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg border"
                style={{
                  background: c.pass ? "rgba(34,197,94,0.05)" : "rgba(239,68,68,0.05)",
                  borderColor: c.pass ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
                }}
              >
                <div>
                  <div className="text-xs font-semibold text-content-primary">
                    {t(`checks.${c.key}`)}
                  </div>
                  <div className="text-[10px] text-content-muted mt-0.5">
                    {t("target")}: {c.target}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-sm font-bold font-mono ${
                      c.pass ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {c.value}
                  </div>
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
                </div>
              </div>
            ))}
          </div>
        </DealSection>
      </div>

      {/* DD Checklist */}
      <div className="bg-surface-primary rounded-lg border border-edge-primary overflow-hidden">
        <DealSection title={t("sections.ddChecklist")} color="gold">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-edge-secondary">
                  <th className="text-left py-2 px-2 text-content-muted font-medium">{t("checklistHeaders.item")}</th>
                  <th className="text-left py-2 px-2 text-content-muted font-medium w-28">{t("checklistHeaders.status")}</th>
                  <th className="text-left py-2 px-2 text-content-muted font-medium w-28">{t("checklistHeaders.date")}</th>
                  <th className="text-left py-2 px-2 text-content-muted font-medium">{t("checklistHeaders.notes")}</th>
                </tr>
              </thead>
              <tbody>
                {d.ddChecklist.map((item, i) => (
                  <tr key={i} className="border-b border-edge-tertiary">
                    <td className="py-1 px-2 text-content-secondary">{item.name}</td>
                    <td className="py-1 px-1">
                      <select
                        className="w-full px-1 py-1 text-xs bg-surface-secondary border border-edge-secondary rounded text-content-primary"
                        value={item.status}
                        onChange={(e) => updateChecklist(i, "status", e.target.value)}
                      >
                        {checklistStatuses.map((s) => (
                          <option key={s} value={s}>
                            {t(`checklistStatus.${s}`)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 px-1">
                      <input
                        type="date"
                        className="w-full px-1 py-1 text-xs bg-surface-secondary border border-edge-secondary rounded text-content-primary"
                        value={item.date}
                        onChange={(e) => updateChecklist(i, "date", e.target.value)}
                      />
                    </td>
                    <td className="py-1 px-1">
                      <input
                        className="w-full px-2 py-1 text-xs bg-surface-secondary border border-edge-secondary rounded text-content-primary"
                        value={item.notes}
                        onChange={(e) => updateChecklist(i, "notes", e.target.value)}
                        placeholder={t("notesPlaceholder")}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DealSection>
      </div>
    </div>
  );
}
