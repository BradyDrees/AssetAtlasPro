"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { updateUnitField } from "@/app/actions/units";
import { CABINET_OPTIONS } from "@/lib/unit-constants";

interface UnitCabinetSelectProps {
  unitId: string;
  projectId: string;
  projectSectionId: string;
  field: string;
  label: string;
  initialValue: string | null;
}

const optionKeys = Object.keys(CABINET_OPTIONS) as (keyof typeof CABINET_OPTIONS)[];

export function UnitCabinetSelect({
  unitId,
  projectId,
  projectSectionId,
  field,
  label,
  initialValue,
}: UnitCabinetSelectProps) {
  const t = useTranslations();
  const [selected, setSelected] = useState<string | null>(initialValue);
  const [saving, setSaving] = useState(false);

  const handleSelect = async (option: string) => {
    const newValue = option === selected ? null : option;
    const previousValue = selected;
    setSelected(newValue);
    setSaving(true);

    try {
      await updateUnitField(unitId, projectId, projectSectionId, field, newValue);
    } catch (err) {
      console.error("Cabinet save failed:", err);
      setSelected(previousValue);
    } finally {
      setSaving(false);
    }
  };

  const selectedInfo = selected
    ? CABINET_OPTIONS[selected as keyof typeof CABINET_OPTIONS]
    : null;

  return (
    <div>
      <label className="block text-sm font-medium text-content-secondary mb-2">
        {label}
        {selectedInfo && selected && (
          <span className="ml-2 text-xs font-normal text-content-muted">
            {t(`unit.cabinetOptions.${selected}`)}
          </span>
        )}
      </label>
      <div className="flex flex-wrap gap-2">
        {optionKeys.map((option) => {
          const config = CABINET_OPTIONS[option];
          const isSelected = selected === option;
          return (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              disabled={saving}
              className={`px-4 h-10 rounded-lg font-bold text-sm transition-all
                disabled:opacity-50 ${
                  isSelected
                    ? config.color
                    : "bg-surface-tertiary text-content-muted hover:bg-gray-200"
                }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
