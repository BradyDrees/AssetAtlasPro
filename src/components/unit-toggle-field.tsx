"use client";

import { useState } from "react";
import { updateUnitField } from "@/app/actions/units";

interface UnitToggleFieldProps {
  unitId: string;
  projectId: string;
  projectSectionId: string;
  field: string;
  label: string;
  initialValue: boolean;
  /** When true, Yes = green and No = red (good thing to have). Default: Yes = red, No = green (bad thing to have). */
  yesIsGood?: boolean;
}

export function UnitToggleField({
  unitId,
  projectId,
  projectSectionId,
  field,
  label,
  initialValue,
  yesIsGood = false,
}: UnitToggleFieldProps) {
  const [value, setValue] = useState<boolean>(initialValue);
  const [saving, setSaving] = useState(false);

  const handleSelect = async (selected: boolean) => {
    const previousValue = value;
    setValue(selected);
    setSaving(true);

    try {
      await updateUnitField(unitId, projectId, projectSectionId, field, selected);
    } catch (err) {
      console.error("Toggle save failed:", err);
      setValue(previousValue);
    } finally {
      setSaving(false);
    }
  };

  // Colors depend on whether "Yes" is a good or bad thing
  const yesColor = yesIsGood ? "bg-green-500 text-white" : "bg-red-500 text-white";
  const noColor = yesIsGood ? "bg-red-500 text-white" : "bg-green-500 text-white";

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="flex gap-2">
        <button
          onClick={() => handleSelect(true)}
          disabled={saving}
          className={`px-5 h-10 rounded-lg font-bold text-sm transition-all
            disabled:opacity-50 ${
              value === true
                ? yesColor
                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
            }`}
        >
          Yes
        </button>
        <button
          onClick={() => handleSelect(false)}
          disabled={saving}
          className={`px-5 h-10 rounded-lg font-bold text-sm transition-all
            disabled:opacity-50 ${
              value === false
                ? noColor
                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
            }`}
        >
          No
        </button>
      </div>
    </div>
  );
}
