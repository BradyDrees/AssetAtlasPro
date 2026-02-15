"use client";

import { useState } from "react";
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
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Appliances
        {saving && (
          <span className="ml-2 text-xs font-normal text-gray-400">Saving...</span>
        )}
      </label>
      <div className="flex flex-wrap gap-2">
        {APPLIANCE_OPTIONS.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <button
              key={option}
              onClick={() => handleToggle(option)}
              disabled={saving}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all
                disabled:opacity-50 border-2 ${
                  isSelected
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-brand-400"
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
