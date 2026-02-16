"use client";

import { useState } from "react";
import { AddUnitForm } from "@/components/add-unit-form";

interface NextUnitButtonProps {
  projectId: string;
  projectSectionId: string;
  currentBuilding: string;
}

export function NextUnitButton({
  projectId,
  projectSectionId,
  currentBuilding,
}: NextUnitButtonProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 px-6 h-14 bg-green-600 text-white
                   rounded-full shadow-lg hover:bg-green-700 active:bg-green-800
                   flex items-center justify-center gap-2
                   transition-colors text-sm font-semibold"
        aria-label="Add next unit"
      >
        + Next Unit
      </button>

      {showForm && (
        <AddUnitForm
          projectId={projectId}
          projectSectionId={projectSectionId}
          lastBuilding={currentBuilding}
          onClose={() => setShowForm(false)}
        />
      )}
    </>
  );
}
