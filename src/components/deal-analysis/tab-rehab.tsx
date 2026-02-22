"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import type { DealData, RehabLineItem } from "@/lib/deal-analysis-types";
import type { DealCalcResult } from "@/lib/deal-analysis-calc";
import { fmt } from "@/lib/deal-analysis-calc";
import { DealSection } from "./deal-section";
import { DealCalcField } from "./deal-calc-field";

interface Props {
  d: DealData;
  set: <K extends keyof DealData>(key: K, val: DealData[K]) => void;
  calc: DealCalcResult;
}

type RehabKey = "rehabInterior" | "rehabExterior" | "rehabMechanical" | "rehabGeneral";

function RehabTable({
  items,
  onUpdate,
  t,
}: {
  items: RehabLineItem[];
  onUpdate: (idx: number, field: keyof RehabLineItem, val: string | number) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-edge-secondary">
            <th className="text-left py-2 px-2 text-content-muted font-medium">{t("rehabHeaders.item")}</th>
            <th className="text-right py-2 px-2 text-content-muted font-medium">{t("rehabHeaders.budget")}</th>
            <th className="text-right py-2 px-2 text-content-muted font-medium">{t("rehabHeaders.unitCost")}</th>
            <th className="text-right py-2 px-2 text-content-muted font-medium">{t("rehabHeaders.qty")}</th>
            <th className="text-right py-2 px-2 text-content-muted font-medium">{t("rehabHeaders.total")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const total = item.budget || item.unitCost * item.qty;
            return (
              <tr key={i} className="border-b border-edge-tertiary">
                <td className="py-1 px-1">
                  <input
                    className="w-full px-2 py-1 text-xs bg-surface-secondary border border-edge-secondary rounded text-content-primary"
                    value={item.name}
                    onChange={(e) => onUpdate(i, "name", e.target.value)}
                  />
                </td>
                <td className="py-1 px-1">
                  <input
                    className="w-24 px-2 py-1 text-xs text-right bg-surface-secondary border border-edge-secondary rounded font-mono text-content-primary"
                    value={item.budget || ""}
                    onChange={(e) => onUpdate(i, "budget", parseFloat(e.target.value) || 0)}
                  />
                </td>
                <td className="py-1 px-1">
                  <input
                    className="w-20 px-2 py-1 text-xs text-right bg-surface-secondary border border-edge-secondary rounded font-mono text-content-primary"
                    value={item.unitCost || ""}
                    onChange={(e) => onUpdate(i, "unitCost", parseFloat(e.target.value) || 0)}
                  />
                </td>
                <td className="py-1 px-1">
                  <input
                    className="w-14 px-2 py-1 text-xs text-right bg-surface-secondary border border-edge-secondary rounded font-mono text-content-primary"
                    value={item.qty || ""}
                    onChange={(e) => onUpdate(i, "qty", parseInt(e.target.value) || 0)}
                  />
                </td>
                <td className="text-right px-2 font-mono text-content-secondary font-semibold">
                  {fmt(total)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function TabRehab({ d, set, calc }: Props) {
  const t = useTranslations("dealAnalysis");

  const updateRehabItem = useCallback(
    (key: RehabKey, idx: number, field: keyof RehabLineItem, val: string | number) => {
      const items = [...d[key]];
      items[idx] = { ...items[idx], [field]: val };
      set(key, items);
    },
    [d, set]
  );

  const categories: { key: RehabKey; title: string; color: string; total: number }[] = [
    { key: "rehabInterior", title: t("rehabCategories.interior"), color: "brand", total: calc.rehabInteriorTotal },
    { key: "rehabExterior", title: t("rehabCategories.exterior"), color: "gold", total: calc.rehabExteriorTotal },
    { key: "rehabMechanical", title: t("rehabCategories.mechanical"), color: "blue", total: calc.rehabMechanicalTotal },
    { key: "rehabGeneral", title: t("rehabCategories.general"), color: "orange", total: calc.rehabGeneralTotal },
  ];

  return (
    <div>
      <h2 className="text-lg font-bold text-content-primary mb-4">{t("tabs.rehab")}</h2>
      <div className="space-y-4">
        {categories.map((cat) => (
          <div key={cat.key} className="bg-surface-primary rounded-lg border border-edge-primary overflow-hidden">
            <DealSection title={cat.title} color={cat.color}>
              <RehabTable
                items={d[cat.key]}
                onUpdate={(idx, field, val) => updateRehabItem(cat.key, idx, field, val)}
                t={t}
              />
              <DealCalcField label={t("subtotal")} value={cat.total} bold />
            </DealSection>
          </div>
        ))}

        {/* Grand Total */}
        <div className="bg-surface-primary rounded-lg border border-edge-primary overflow-hidden">
          <DealSection title={t("sections.rehabTotal")} color="red">
            <DealCalcField label={t("fields.rehabGrandTotal")} value={calc.rehabGrandTotal} bold highlight />
          </DealSection>
        </div>
      </div>
    </div>
  );
}
