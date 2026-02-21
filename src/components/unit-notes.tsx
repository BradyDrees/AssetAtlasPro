"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { updateUnitField } from "@/app/actions/units";

interface UnitNotesProps {
  unitId: string;
  projectId: string;
  projectSectionId: string;
  initialNotes: string;
}

export function UnitNotes({
  unitId,
  projectId,
  projectSectionId,
  initialNotes,
}: UnitNotesProps) {
  const t = useTranslations();
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedSave = useCallback(
    (value: string) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(async () => {
        setSaving(true);
        try {
          await updateUnitField(unitId, projectId, projectSectionId, "notes", value);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        } catch (err) {
          console.error("Unit notes save failed:", err);
        } finally {
          setSaving(false);
        }
      }, 1000);
    },
    [unitId, projectId, projectSectionId]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNotes(value);
    debouncedSave(value);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-content-secondary mb-2">
        {t("notes.notes")}
        {saving && (
          <span className="ml-2 text-xs font-normal text-content-muted">
            {t("notes.saving")}
          </span>
        )}
        {saved && !saving && (
          <span className="ml-2 text-xs font-normal text-green-500">{t("notes.saved")}</span>
        )}
      </label>
      <textarea
        value={notes}
        onChange={handleChange}
        placeholder={t("notes.unitObservationsPlaceholder")}
        rows={3}
        className="w-full px-3 py-2 border border-edge-secondary rounded-md text-sm
                   focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
      />
    </div>
  );
}
