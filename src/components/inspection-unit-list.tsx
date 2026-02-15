"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createInspectionUnit,
  deleteInspectionUnit,
} from "@/app/actions/inspection-units";
import {
  INSPECTION_UNIT_GRADES,
  OVERALL_CONDITION_LABELS,
  OCCUPANCY_STATUS_LABELS,
  WALK_STATUS_LABELS,
} from "@/lib/inspection-constants";
import type {
  InspectionUnit,
  InspectionCapture,
} from "@/lib/inspection-types";

interface InspectionUnitListProps {
  units: InspectionUnit[];
  captures: InspectionCapture[];
  projectId: string;
  projectSectionId: string;
  sectionSlug: string;
}

export function InspectionUnitList({
  units,
  captures,
  projectId,
  projectSectionId,
  sectionSlug,
}: InspectionUnitListProps) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [building, setBuilding] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [adding, setAdding] = useState(false);

  // Count captures per unit
  const capturesByUnit: Record<string, number> = {};
  captures.forEach((c) => {
    if (c.unit_id) {
      capturesByUnit[c.unit_id] = (capturesByUnit[c.unit_id] ?? 0) + 1;
    }
  });

  const handleAddUnit = async () => {
    if (!building.trim() || !unitNumber.trim()) return;
    setAdding(true);
    try {
      const unitId = await createInspectionUnit({
        project_id: projectId,
        project_section_id: projectSectionId,
        building: building.trim(),
        unit_number: unitNumber.trim(),
      });
      setBuilding("");
      setUnitNumber("");
      setShowAdd(false);
      router.refresh();
      // Navigate to the new unit
      router.push(
        `/inspections/${projectId}/sections/${projectSectionId}/units/${unitId}`
      );
    } catch (err) {
      console.error("Failed to create unit:", err);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Units ({units.length})
        </h3>
        <button
          onClick={() => setShowAdd(true)}
          className="px-3 py-1.5 bg-brand-600 text-white text-sm rounded-md hover:bg-brand-700 transition-colors"
        >
          + Add Unit
        </button>
      </div>

      {/* Add unit form */}
      {showAdd && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Building
              </label>
              <input
                type="text"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                placeholder="B1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                autoFocus
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Unit Number
              </label>
              <input
                type="text"
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                placeholder="101"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddUnit();
                  if (e.key === "Escape") {
                    setShowAdd(false);
                    setBuilding("");
                    setUnitNumber("");
                  }
                }}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3 justify-end">
            <button
              onClick={() => {
                setShowAdd(false);
                setBuilding("");
                setUnitNumber("");
              }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleAddUnit}
              disabled={!building.trim() || !unitNumber.trim() || adding}
              className="px-3 py-1.5 bg-brand-600 text-white text-sm rounded-md hover:bg-brand-700 disabled:opacity-50"
            >
              {adding ? "Adding..." : "Add Unit"}
            </button>
          </div>
        </div>
      )}

      {/* Unit list */}
      {units.length > 0 ? (
        <div className="space-y-2">
          {units.map((unit) => {
            const conditionInfo = unit.overall_condition
              ? OVERALL_CONDITION_LABELS[unit.overall_condition]
              : null;
            const photoCount = capturesByUnit[unit.id] ?? 0;

            return (
              <Link
                key={unit.id}
                href={`/inspections/${projectId}/sections/${projectSectionId}/units/${unit.id}`}
                className="block bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">
                      {unit.building} - {unit.unit_number}
                    </span>
                    {/* Occupancy status badge */}
                    {unit.occupancy_status && unit.occupancy_status !== "UNKNOWN" && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                          OCCUPANCY_STATUS_LABELS[unit.occupancy_status]?.color ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {OCCUPANCY_STATUS_LABELS[unit.occupancy_status]?.label ?? unit.occupancy_status}
                      </span>
                    )}
                    {/* Walk status badge (show for vacant/down units) */}
                    {(unit.occupancy_status === "VACANT" || unit.occupancy_status === "DOWN") &&
                      unit.walk_status !== "NOT_STARTED" && (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                            WALK_STATUS_LABELS[unit.walk_status]?.color ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {WALK_STATUS_LABELS[unit.walk_status]?.label ?? unit.walk_status}
                        </span>
                      )}
                    {conditionInfo && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${conditionInfo.color}`}
                      >
                        {conditionInfo.label}
                      </span>
                    )}
                    {unit.has_leak_evidence && (
                      <span className="text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-medium">
                        Leak
                      </span>
                    )}
                    {unit.has_mold_indicators && (
                      <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">
                        Mold
                      </span>
                    )}
                    {photoCount > 0 && (
                      <span className="text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-medium">
                        {photoCount} photo{photoCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <svg
                    className="w-4 h-4 text-gray-400 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 text-center text-sm text-gray-500">
          No units added yet. Click &quot;+ Add Unit&quot; to start.
        </div>
      )}
    </div>
  );
}
