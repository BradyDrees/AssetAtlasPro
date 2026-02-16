"use client";

import { useState } from "react";
import { updateUnitField } from "@/app/actions/units";
import { BD_BA_OPTIONS } from "@/lib/unit-constants";

interface UnitBdBaSelectProps {
  unitId: string;
  projectId: string;
  projectSectionId: string;
  initialValue: string | null;
}

export function UnitBdBaSelect({
  unitId,
  projectId,
  projectSectionId,
  initialValue,
}: UnitBdBaSelectProps) {
  const [value, setValue] = useState(initialValue ?? "");
  const [saving, setSaving] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value || null;
    const previousValue = value;
    setValue(e.target.value);
    setSaving(true);

    try {
      await updateUnitField(unitId, projectId, projectSectionId, "bd_ba", newValue);
    } catch (err) {
      console.error("BD/BA save failed:", err);
      setValue(previousValue);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-content-secondary mb-2">
        BD / BA
        {saving && (
          <span className="ml-2 text-xs font-normal text-content-muted">Saving...</span>
        )}
      </label>
      <select
        value={value}
        onChange={handleChange}
        disabled={saving}
        className="w-full px-3 py-2 border border-edge-secondary rounded-md text-sm
                   focus:outline-none focus:ring-2 focus:ring-brand-500
                   disabled:opacity-50 bg-surface-primary"
      >
        <option value="">Select BD/BA...</option>
        {BD_BA_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
