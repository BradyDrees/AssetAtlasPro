"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { UnitCard } from "@/components/unit-card";
import { AddUnitForm } from "@/components/add-unit-form";
import { NextSectionButton } from "@/components/next-section-button";
import type { DDUnit } from "@/lib/types";

interface UnitListPageProps {
  projectId: string;
  projectSectionId: string;
  projectName: string;
  sectionName: string;
  units: DDUnit[];
  captureCounts: Record<string, number>;
  nextSectionId?: string | null;
  nextSectionName?: string | null;
}

export function UnitListPage({
  projectId,
  projectSectionId,
  projectName,
  sectionName,
  units,
  captureCounts,
  nextSectionId,
  nextSectionName,
}: UnitListPageProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteStart = useCallback(() => setIsDeleting(true), []);
  const handleDeleteEnd = useCallback(() => setIsDeleting(false), []);

  // Remember last building for quick unit add
  const lastBuilding =
    units.length > 0
      ? units[units.length - 1].building
      : "";

  // Sort by building then unit number
  const sortedUnits = [...units].sort((a, b) => {
    const buildingCompare = a.building.localeCompare(b.building, undefined, {
      numeric: true,
    });
    if (buildingCompare !== 0) return buildingCompare;
    return a.unit_number.localeCompare(b.unit_number, undefined, {
      numeric: true,
    });
  });

  return (
    <div className="pb-24">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4 flex-wrap">
        <Link
          href="/dashboard"
          className="hover:text-brand-600 transition-colors"
        >
          Projects
        </Link>
        <span>/</span>
        <Link
          href={`/projects/${projectId}`}
          className="hover:text-brand-600 transition-colors"
        >
          {projectName}
        </Link>
        <span>/</span>
        <span className="text-gray-900">{sectionName}</span>
      </div>

      {/* Back button + Section header */}
      <div className="mb-6">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-1.5 text-sm text-brand-600 font-medium mb-2 hover:text-brand-800 transition-colors"
        >
          <span>&larr;</span> Back to {projectName}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{sectionName}</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {units.length} unit{units.length !== 1 ? "s" : ""} inspected
        </p>
      </div>

      {/* Unit list */}
      {sortedUnits.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500 text-sm">
            No units inspected yet. Tap the + button to add your first unit.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedUnits.map((unit) => (
            <UnitCard
              key={unit.id}
              unit={unit}
              projectId={projectId}
              captureCount={captureCounts[unit.id] ?? 0}
              isListBusy={isDeleting}
              onDeleteStart={handleDeleteStart}
              onDeleteEnd={handleDeleteEnd}
            />
          ))}
        </div>
      )}

      {/* Floating add button */}
      <button
        onClick={() => setShowAddForm(true)}
        className="fixed bottom-6 right-6 z-40 w-16 h-16 bg-brand-600 text-white
                   rounded-full shadow-lg hover:bg-brand-700 active:bg-brand-800
                   flex items-center justify-center transition-colors text-3xl font-light"
        aria-label="Add unit"
      >
        +
      </button>

      {/* Next section button */}
      {nextSectionId && nextSectionName && (
        <NextSectionButton
          projectId={projectId}
          nextSectionId={nextSectionId}
          nextSectionName={nextSectionName}
        />
      )}

      {/* Add unit modal */}
      {showAddForm && (
        <AddUnitForm
          projectId={projectId}
          projectSectionId={projectSectionId}
          lastBuilding={lastBuilding}
          onClose={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
}
