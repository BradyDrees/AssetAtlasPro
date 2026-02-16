"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUnit } from "@/app/actions/units";
import { Modal } from "@/components/modal";

interface AddUnitFormProps {
  projectId: string;
  projectSectionId: string;
  lastBuilding?: string;
  onClose: () => void;
}

export function AddUnitForm({
  projectId,
  projectSectionId,
  lastBuilding = "",
  onClose,
}: AddUnitFormProps) {
  const router = useRouter();
  const [building, setBuilding] = useState(lastBuilding);
  const [unitNumber, setUnitNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!building.trim() || !unitNumber.trim()) {
      setError("Both fields are required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const unitId = await createUnit({
        project_id: projectId,
        project_section_id: projectSectionId,
        building: building.trim(),
        unit_number: unitNumber.trim(),
      });
      router.push(
        `/projects/${projectId}/sections/${projectSectionId}/units/${unitId}`
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create unit";
      if (message.includes("duplicate")) {
        setError("This building + unit number already exists in this section");
      } else {
        setError(message);
      }
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Add Unit">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-content-secondary mb-1">
            Building
          </label>
          <input
            type="text"
            value={building}
            onChange={(e) => setBuilding(e.target.value)}
            placeholder="e.g. 1, A, Building 1"
            className="w-full px-3 py-2 border border-edge-secondary rounded-md text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-500"
            autoFocus={!lastBuilding}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-content-secondary mb-1">
            Unit Number
          </label>
          <input
            type="text"
            value={unitNumber}
            onChange={(e) => setUnitNumber(e.target.value)}
            placeholder="e.g. 101, 201A"
            className="w-full px-3 py-2 border border-edge-secondary rounded-md text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-500"
            autoFocus={!!lastBuilding}
          />
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-content-tertiary hover:text-content-primary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-brand-600 text-white text-sm rounded-md
                       hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create & Open"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
