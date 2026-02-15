"use client";

import { useState, useCallback } from "react";
import {
  updateInspectionSectionRating,
  updateInspectionSectionRul,
  updateInspectionSectionNotes,
} from "@/app/actions/inspections";
import {
  INSPECTION_CONDITION_LABELS,
  RUL_OPTIONS,
  RUL_COLORS,
} from "@/lib/inspection-constants";
import type {
  InspectionProjectSectionWithDetails,
  InspectionType,
  RulBucket,
} from "@/lib/inspection-types";

interface InspectionSectionFieldsProps {
  projectSection: InspectionProjectSectionWithDetails;
  projectId: string;
  inspectionType: InspectionType;
}

export function InspectionSectionFields({
  projectSection,
  projectId,
  inspectionType,
}: InspectionSectionFieldsProps) {
  const [rating, setRating] = useState<number | null>(
    projectSection.condition_rating
  );
  const [rul, setRul] = useState<string | null>(projectSection.rul_bucket);
  const [notes, setNotes] = useState(projectSection.notes ?? "");
  const [savingRating, setSavingRating] = useState(false);
  const [savingRul, setSavingRul] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  const isBankReady = inspectionType === "bank_ready";

  const handleRating = useCallback(
    async (val: number) => {
      const newVal = val === rating ? null : val;
      setRating(newVal);
      setSavingRating(true);
      try {
        await updateInspectionSectionRating(
          projectSection.id,
          projectId,
          newVal
        );
      } catch {
        setRating(rating);
      } finally {
        setSavingRating(false);
      }
    },
    [rating, projectSection.id, projectId]
  );

  const handleRul = useCallback(
    async (val: string) => {
      const newVal = val === rul ? null : val;
      setRul(newVal);
      setSavingRul(true);
      try {
        await updateInspectionSectionRul(projectSection.id, projectId, newVal);
      } catch {
        setRul(rul);
      } finally {
        setSavingRul(false);
      }
    },
    [rul, projectSection.id, projectId]
  );

  const handleNotesBlur = useCallback(async () => {
    if (notes === (projectSection.notes ?? "")) return;
    setSavingNotes(true);
    try {
      await updateInspectionSectionNotes(
        projectSection.id,
        projectId,
        notes
      );
    } finally {
      setSavingNotes(false);
    }
  }, [notes, projectSection.id, projectSection.notes, projectId]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 space-y-4">
      {/* Condition Rating */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Condition Rating
          {isBankReady && (
            <span className="text-red-500 ml-1">*</span>
          )}
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((val) => (
            <button
              key={val}
              onClick={() => handleRating(val)}
              disabled={savingRating}
              className={`flex-1 px-2 py-1.5 text-sm rounded-md border transition-colors ${
                rating === val
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              } disabled:opacity-50`}
            >
              {val} - {INSPECTION_CONDITION_LABELS[val]}
            </button>
          ))}
        </div>
      </div>

      {/* Remaining Useful Life (RUL) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Remaining Useful Life
          {isBankReady && (
            <span className="text-red-500 ml-1">*</span>
          )}
        </label>
        <div className="flex flex-wrap gap-2">
          {RUL_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => handleRul(option)}
              disabled={savingRul}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                rul === option
                  ? RUL_COLORS[option as RulBucket] +
                    " border-current font-medium"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              } disabled:opacity-50`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Section Notes
          {savingNotes && (
            <span className="text-xs text-gray-400 ml-2">Saving...</span>
          )}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          rows={3}
          placeholder="General notes about this section..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
    </div>
  );
}
