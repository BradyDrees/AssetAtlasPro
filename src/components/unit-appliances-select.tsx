"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { updateUnitField } from "@/app/actions/units";
import { APPLIANCE_OPTIONS } from "@/lib/unit-constants";

interface UnitAppliancesSelectProps {
  unitId: string;
  projectId: string;
  projectSectionId: string;
  initialValue: string[];
}

export function UnitAppliancesSelect({
  unitId,
  projectId,
  projectSectionId,
  initialValue,
}: UnitAppliancesSelectProps) {
  const t = useTranslations("unit");
  const tc = useTranslations("common");
  const [selected, setSelected] = useState<string[]>(initialValue);
  const [saving, setSaving] = useState(false);

  const handleToggle = async (option: string) => {
    const newSelected = selected.includes(option)
      ? selected.filter((s) => s !== option)
      : [...selected, option];

    const previousSelected = selected;
    setSelected(newSelected); // optimistic
    setSaving(true);

    try {
      await updateUnitField(
        unitId,
        projectId,
        projectSectionId,
        "appliances",
        newSelected
      );
    } catch (err) {
      console.error("Appliances save failed:", err);
      setSelected(previousSelected); // revert
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-content-secondary mb-2">
        {t("appliances")}
        {saving && (
          <span className="ml-2 text-xs font-normal text-content-muted">{tc("saving")}</span>
        )}
      </label>
      <div className="flex flex-wrap gap-2">
        {APPLIANCE_OPTIONS.map((option) => {
          const isSelected = selected.includes(option);
          const labelMap: Record<string, string> = {
            "Black": "black",
            "White": "white",
            "Stainless Steel": "stainlessSteel",
          };
          return (
            <button
              key={option}
              onClick={() => handleToggle(option)}
              disabled={saving}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all
                disabled:opacity-50 border-2 ${
                  isSelected
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-surface-primary text-content-tertiary border-edge-secondary hover:border-brand-400"
                }`}
            >
              {t(`appliances.${labelMap[option] ?? option}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
