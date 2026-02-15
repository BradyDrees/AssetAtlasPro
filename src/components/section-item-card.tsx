"use client";

import { useState } from "react";
import Link from "next/link";
import { deleteSectionItem } from "@/app/actions/section-items";
import { CONDITION_LABELS, type ConditionRating } from "@/lib/types";
import type { DDSectionItem } from "@/lib/types";

interface SectionItemCardProps {
  item: DDSectionItem;
  projectId: string;
  projectSectionId: string;
  captureCount: number;
  isListBusy?: boolean;
  onDeleteStart?: () => void;
  onDeleteEnd?: () => void;
}

const ratingColors: Record<number, string> = {
  1: "bg-red-500 text-white",
  2: "bg-orange-500 text-white",
  3: "bg-yellow-500 text-white",
  4: "bg-lime-500 text-white",
  5: "bg-green-500 text-white",
};

export function SectionItemCard({
  item,
  projectId,
  projectSectionId,
  captureCount,
  isListBusy = false,
  onDeleteStart,
  onDeleteEnd,
}: SectionItemCardProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isListBusy) return; // another delete is in-flight
    if (!confirm(`Delete "${item.name}"? All photos will be removed.`))
      return;

    setDeleting(true);
    onDeleteStart?.();
    try {
      await deleteSectionItem(item.id, projectId, projectSectionId);
    } catch (err) {
      console.error("Delete failed:", err);
      setDeleting(false);
    } finally {
      onDeleteEnd?.();
    }
  };

  return (
    <Link
      href={`/projects/${projectId}/sections/${projectSectionId}/items/${item.id}`}
      className={`block bg-white rounded-lg border border-gray-200 p-3 hover:bg-gray-50
                  transition-colors ${deleting ? "opacity-50 pointer-events-none" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          {/* Item name */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900 text-sm">
              {item.name}
            </span>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mb-1">
            {item.condition_rating && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  ratingColors[item.condition_rating]
                }`}
              >
                {item.condition_rating}/5{" "}
                {CONDITION_LABELS[item.condition_rating as ConditionRating]}
              </span>
            )}
          </div>

          {/* Photo count */}
          {captureCount > 0 && (
            <span className="text-xs text-gray-400">
              {captureCount} photo{captureCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Delete button */}
        <button
          onClick={handleDelete}
          disabled={deleting || isListBusy}
          className="text-gray-300 hover:text-red-500 transition-colors p-1 flex-shrink-0 disabled:opacity-30"
          aria-label="Delete item"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </Link>
  );
}
