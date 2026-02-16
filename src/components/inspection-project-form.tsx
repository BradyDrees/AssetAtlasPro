"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createInspectionProject,
  updateInspectionProject,
} from "@/app/actions/inspections";
import {
  INSPECTION_TYPE_LABELS,
  ASSET_ARCHETYPE_LABELS,
} from "@/lib/inspection-constants";
import type {
  InspectionProject,
  InspectionType,
  AssetArchetype,
} from "@/lib/inspection-types";

interface InspectionProjectFormProps {
  project?: InspectionProject;
  onClose: () => void;
}

export function InspectionProjectForm({
  project,
  onClose,
}: InspectionProjectFormProps) {
  const [name, setName] = useState(project?.name ?? "");
  const [propertyName, setPropertyName] = useState(
    project?.property_name ?? ""
  );
  const [address, setAddress] = useState(project?.address ?? "");
  const [inspectionType, setInspectionType] = useState<InspectionType>(
    project?.inspection_type ?? "internal"
  );
  const [assetArchetype, setAssetArchetype] = useState<AssetArchetype>(
    project?.asset_archetype ?? "garden"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isEditing = !!project;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditing) {
        await updateInspectionProject(project.id, {
          name,
          property_name: propertyName,
          address,
          inspection_type: inspectionType,
          asset_archetype: assetArchetype,
        });
        onClose();
      } else {
        const result = await createInspectionProject({
          name,
          property_name: propertyName,
          address,
          inspection_type: inspectionType,
          asset_archetype: assetArchetype,
        });
        if (result.error) {
          setError(result.error);
          setLoading(false);
          return;
        }
        onClose();
        router.push(`/inspections/${result.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
          {error}
        </div>
      )}

      {/* Inspection Type Toggle */}
      <div>
        <label className="block text-sm font-medium text-content-secondary mb-2">
          Inspection Type
        </label>
        <div className="flex gap-2">
          {(Object.entries(INSPECTION_TYPE_LABELS) as [InspectionType, string][]).map(
            ([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setInspectionType(value)}
                className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors ${
                  inspectionType === value
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-surface-primary text-content-secondary border-edge-secondary hover:bg-surface-secondary"
                }`}
              >
                {label}
              </button>
            )
          )}
        </div>
        {inspectionType === "bank_ready" && (
          <p className="text-xs text-amber-600 mt-1">
            Bank-Ready mode requires priority, exposure, RUL, and condition
            ratings on all sections and findings.
          </p>
        )}
      </div>

      {/* Asset Archetype Toggle */}
      <div>
        <label className="block text-sm font-medium text-content-secondary mb-2">
          Asset Type
        </label>
        <div className="flex gap-2">
          {(Object.entries(ASSET_ARCHETYPE_LABELS) as [AssetArchetype, { label: string; unitLabel: string }][]).map(
            ([value, info]) => (
              <button
                key={value}
                type="button"
                onClick={() => setAssetArchetype(value)}
                className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors ${
                  assetArchetype === value
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-surface-primary text-content-secondary border-edge-secondary hover:bg-surface-secondary"
                }`}
              >
                {info.label}
              </button>
            )
          )}
        </div>
        {assetArchetype === "sfr" && (
          <p className="text-xs text-brand-600 mt-1">
            SFR mode labels unit sections as &quot;Homes&quot; instead of
            &quot;Units&quot;.
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-content-secondary mb-1"
        >
          Project Code
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.toUpperCase())}
          required
          placeholder="VERIDIAN"
          className="w-full px-3 py-2 border border-edge-secondary rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase"
        />
        <p className="text-xs text-content-quaternary mt-1">
          Short identifier used in exports
        </p>
      </div>

      <div>
        <label
          htmlFor="propertyName"
          className="block text-sm font-medium text-content-secondary mb-1"
        >
          Property Name
        </label>
        <input
          id="propertyName"
          type="text"
          value={propertyName}
          onChange={(e) => setPropertyName(e.target.value)}
          required
          placeholder="Veridian Residences"
          className="w-full px-3 py-2 border border-edge-secondary rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div>
        <label
          htmlFor="address"
          className="block text-sm font-medium text-content-secondary mb-1"
        >
          Address
        </label>
        <input
          id="address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="123 Main St, Denver CO 80202"
          className="w-full px-3 py-2 border border-edge-secondary rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm text-content-tertiary hover:text-content-primary transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-brand-600 text-white text-sm rounded-md hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {loading
            ? isEditing
              ? "Saving..."
              : "Creating..."
            : isEditing
            ? "Save Changes"
            : "Create Inspection"}
        </button>
      </div>
    </form>
  );
}
