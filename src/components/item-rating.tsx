"use client";

import { useState } from "react";
import { updateSectionItemField } from "@/app/actions/section-items";
import { CONDITION_LABELS, type ConditionRating } from "@/lib/types";

interface ItemRatingProps {
  itemId: string;
  projectId: string;
  projectSectionId: string;
  initialRating: number | null;
}

export function ItemRating({
  itemId,
  projectId,
  projectSectionId,
  initialRating,
}: ItemRatingProps) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [saving, setSaving] = useState(false);

  const handleRate = async (value: ConditionRating) => {
    const newValue = value === rating ? null : value; // tap again to clear
    const previousValue = rating;
    setRating(newValue); // optimistic
    setSaving(true);

    try {
      await updateSectionItemField(
        itemId,
        projectId,
        projectSectionId,
        "condition_rating",
        newValue
      );
    } catch (err) {
      console.error("Item rating save failed:", err);
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
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Condition Rating
        {rating && (
          <span className="ml-2 text-xs font-normal text-gray-400">
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
                  : "bg-gray-100 text-gray-400 hover:bg-gray-200"
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
