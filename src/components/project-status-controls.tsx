"use client";

import { useState } from "react";
import { updateProjectStatus } from "@/app/actions/projects";
import { CompleteProjectModal } from "@/components/complete-project-modal";
import type { ProjectStatus } from "@/lib/types";

interface Warning {
  label: string;
  href: string;
}

interface ProjectStatusControlsProps {
  projectId: string;
  currentStatus: ProjectStatus;
  warnings?: Warning[];
}

export function ProjectStatusControls({
  projectId,
  currentStatus,
  warnings = [],
}: ProjectStatusControlsProps) {
  const [loading, setLoading] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    setLoading(true);
    try {
      await updateProjectStatus(projectId, newStatus);
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setLoading(false);
    }
  };

  if (currentStatus === "DRAFT") {
    return (
      <button
        onClick={() => handleStatusChange("IN_PROGRESS")}
        disabled={loading}
        className="px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg
                   hover:bg-green-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Starting..." : "Start Inspection"}
      </button>
    );
  }

  if (currentStatus === "IN_PROGRESS") {
    return (
      <>
        <button
          onClick={() => setShowCompleteModal(true)}
          disabled={loading}
          className="px-5 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-lg
                     hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          Mark Complete
        </button>
        {showCompleteModal && (
          <CompleteProjectModal
            projectId={projectId}
            warnings={warnings}
            onClose={() => setShowCompleteModal(false)}
          />
        )}
      </>
    );
  }

  // COMPLETE
  return (
    <button
      onClick={() => handleStatusChange("IN_PROGRESS")}
      disabled={loading}
      className="px-5 py-2.5 bg-gray-200 text-content-secondary text-sm font-semibold rounded-lg
                 hover:bg-gray-300 disabled:opacity-50 transition-colors"
    >
      {loading ? "Reopening..." : "Reopen Project"}
    </button>
  );
}
