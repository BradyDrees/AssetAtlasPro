"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { updateUnitStatus } from "@/app/actions/unit-turns";
import { UNIT_STATUS_LABELS } from "@/lib/unit-turn-constants";

const STATUS_OPTIONS = ["NOT_STARTED", "IN_PROGRESS", "COMPLETE"] as const;

interface UnitStatusBarProps {
  unitId: string;
  batchId: string;
  currentStatus: string;
}

export function UnitStatusBar({ unitId, batchId, currentStatus }: UnitStatusBarProps) {
  const t = useTranslations();
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);

  const handleChange = async (newStatus: string) => {
    setStatus(newStatus);
    setSaving(true);
    await updateUnitStatus(unitId, batchId, newStatus);
    setSaving(false);
  };

  return (
    <div className="bg-surface-primary rounded-lg border border-edge-primary p-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-content-quaternary">{t("unitTurn.unitStatusLabel")}</label>
        {saving && <span className="text-xs text-content-muted">{t("common.saving")}</span>}
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
                  : "bg-surface-primary text-content-tertiary border-edge-secondary hover:bg-surface-secondary"
              }`}
            >
              {t(`unitTurn.unitStatus.${opt}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
