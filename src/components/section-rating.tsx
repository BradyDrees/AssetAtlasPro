"use client";

import { useState } from "react";
import { updateSectionRating } from "@/app/actions/captures";
import { CONDITION_LABELS, type ConditionRating } from "@/lib/types";

interface SectionRatingProps {
  projectSectionId: string;
  projectId: string;
  initialRating: number | null;
}

export function SectionRating({
  projectSectionId,
  projectId,
  initialRating,
}: SectionRatingProps) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [saving, setSaving] = useState(false);

  const handleRate = async (value: ConditionRating) => {
    const newValue = value === rating ? null : value; // tap again to clear
    const previousValue = rating;
    setRating(newValue); // optimistic
    setSaving(true);

    try {
      await updateSectionRating(projectSectionId, projectId, newValue);
    } catch (err) {
      console.error("Section rating save failed:", err);
      setRating(previousValue); // revert
    } finally {
      setSaving(false);
    }
  };

  const ratingColors: Record<number, string> = {
    1: "bg-red-500 text-white",
    2: "bg-orange-500 text-white",
    3: "bg-yellow-500 text-white",
    4: "bg-lime-500 text-white",
    5: "bg-green-500 text-white",
  };

  return (
    <div>
      <label className="block text-sm font-medium text-content-secondary mb-2">
        Condition Rating
        {rating && (
          <span className="ml-2 text-xs font-normal text-content-muted">
            {CONDITION_LABELS[rating as ConditionRating]}
          </span>
        )}
      </label>
      <div className="flex gap-2">
        {([1, 2, 3, 4, 5] as ConditionRating[]).map((value) => (
          <button
            key={value}
            onClick={() => handleRate(value)}
            disabled={saving}
            className={`w-12 h-12 rounded-lg font-bold text-lg transition-all
              disabled:opacity-50 ${
                rating === value
                  ? ratingColors[value]
                  : "bg-surface-tertiary text-content-muted hover:bg-gray-200"
              }`}
            aria-label={`Rate ${value} - ${CONDITION_LABELS[value]}`}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}
