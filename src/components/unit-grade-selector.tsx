"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { updateUnitField } from "@/app/actions/units";
import { TENANT_GRADES, UNIT_GRADES, ITEM_GRADES } from "@/lib/unit-constants";

type GradeType = "tenant" | "unit" | "item";

interface UnitGradeSelectorProps {
  unitId: string;
  projectId: string;
  projectSectionId: string;
  type: GradeType;
  field: string;
  label: string;
  initialValue: string | null;
}

function getGradeConfig(type: GradeType) {
  switch (type) {
    case "tenant":
      return TENANT_GRADES;
    case "unit":
      return UNIT_GRADES;
    case "item":
      return ITEM_GRADES;
  }
}

export function UnitGradeSelector({
  unitId,
  projectId,
  projectSectionId,
  type,
  field,
  label,
  initialValue,
}: UnitGradeSelectorProps) {
  const t = useTranslations();
  const [selected, setSelected] = useState<string | null>(initialValue);
  const [saving, setSaving] = useState(false);

  const grades = getGradeConfig(type);
  const gradeKeys = Object.keys(grades) as string[];

  const handleSelect = async (grade: string) => {
    const newValue = grade === selected ? null : grade;
    const previousValue = selected;
    setSelected(newValue); // optimistic
    setSaving(true);

    try {
      await updateUnitField(unitId, projectId, projectSectionId, field, newValue);
    } catch (err) {
      console.error("Grade save failed:", err);
      setSelected(previousValue); // revert
    } finally {
      setSaving(false);
    }
  };

  const selectedInfo = selected
    ? (grades as Record<string, { label: string; desc?: string; color: string }>)[selected]
    : null;

  return (
    <div>
      <label className="block text-sm font-medium text-content-secondary mb-2">
        {label}
        {selectedInfo && selected && (
          <span className="ml-2 text-xs font-normal text-content-muted">
            {type === "tenant" ? t(`unit.tenantGrades.${selected}.label`) : type === "unit" ? t(`unit.unitGrades.${selected}.label`) : t(`unit.itemGrades.${selected}`)}
            {type === "unit" && selected ? ` — ${t(`unit.unitGrades.${selected}.desc`)}` : ""}
          </span>
        )}
      </label>
      <div className="flex flex-wrap gap-2">
        {gradeKeys.map((grade) => {
          const config = (grades as Record<string, { color: string }>)[grade];
          const isSelected = selected === grade;
          return (
            <button
              key={grade}
              onClick={() => handleSelect(grade)}
              disabled={saving}
              className={`min-w-[2.5rem] h-10 px-2 rounded-lg font-bold text-sm transition-all
                disabled:opacity-50 ${
                  isSelected
                    ? config.color
                    : "bg-surface-tertiary text-content-muted hover:bg-gray-200"
                }`}
              aria-label={t("unit.gradeLabel", { grade })}
            >
              {grade}
            </button>
          );
        })}
      </div>
    </div>
  );
}
