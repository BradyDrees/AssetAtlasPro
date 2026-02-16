"use client";

import { useState } from "react";
import { updateUnitStatus } from "@/app/actions/unit-turns";
import { UNIT_STATUS_LABELS } from "@/lib/unit-turn-constants";

const STATUS_OPTIONS = ["NOT_STARTED", "IN_PROGRESS", "COMPLETE"] as const;

interface UnitStatusBarProps {
  unitId: string;
  batchId: string;
  currentStatus: string;
}

export function UnitStatusBar({ unitId, batchId, currentStatus }: UnitStatusBarProps) {
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);

  const handleChange = async (newStatus: string) => {
    setStatus(newStatus);
    setSaving(true);
    await updateUnitStatus(unitId, batchId, newStatus);
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-500">Unit Status</label>
        {saving && <span className="text-xs text-gray-400">Saving...</span>}
      </div>
      <div className="flex gap-2 mt-2">
        {STATUS_OPTIONS.map((opt) => {
          const info = UNIT_STATUS_LABELS[opt];
          return (
            <button
              key={opt}
              onClick={() => handleChange(opt)}
              className={`flex-1 px-3 py-2.5 text-sm rounded-md border transition-colors ${
                status === opt
                  ? info.color + " border-current font-medium"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {info.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
