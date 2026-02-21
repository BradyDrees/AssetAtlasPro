"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  createInspectionUnit,
  deleteInspectionUnit,
} from "@/app/actions/inspection-units";
import { useFieldRouter } from "@/lib/offline/use-field-router";
import { useOffline } from "@/components/offline-provider";
import { useLocalUnits } from "@/lib/offline/use-local-data";
import { createInspectionUnitOffline } from "@/lib/offline/actions";
import { BulkUnitUpload } from "@/components/bulk-unit-upload";
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
  currentUserId?: string;
}

export function InspectionUnitList({
  units,
  captures,
  projectId,
  projectSectionId,
  sectionSlug,
  currentUserId,
}: InspectionUnitListProps) {
  const router = useFieldRouter();
  const t = useTranslations();
  const { isFieldMode, refreshPending } = useOffline();
  const localUnits = useLocalUnits(projectSectionId);
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
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

  // Merge server units with local-only units (field mode)
  const mergedUnits: (InspectionUnit & { _isLocal?: boolean })[] = [
    ...units,
    ...localUnits
      .filter((lu) => lu.syncStatus !== "synced")
      .map((lu) => ({
        id: lu.localId,
        project_id: lu.projectId,
        project_section_id: lu.projectSectionId,
        building: lu.building,
        unit_number: lu.unitNumber,
        occupancy_status: lu.occupancyStatus as any,
        walk_status: lu.walkStatus as any,
        walk_required: false,
        turn_stage: null,
        overall_condition: null,
        tenant_housekeeping: null,
        floors: null,
        cabinets: null,
        countertops: null,
        appliances: [],
        plumbing_fixtures: null,
        electrical_fixtures: null,
        windows_doors: null,
        bath_condition: null,
        has_leak_evidence: false,
        has_mold_indicators: false,
        blinds_down: false,
        toilet_seat_down: false,
        rent_ready: lu.rentReady,
        days_vacant: lu.daysVacant,
        turn_unit_id: lu.turnUnitLocalId,
        description: "",
        notes: lu.notes,
        created_at: new Date(lu.createdAt).toISOString(),
        updated_at: new Date(lu.createdAt).toISOString(),
        _isLocal: true,
      })),
  ];

  const handleAddUnit = async () => {
    if (!building.trim() || !unitNumber.trim()) return;
    setAdding(true);
    try {
      if (isFieldMode) {
        await createInspectionUnitOffline({
          projectId,
          projectSectionId,
          building: building.trim(),
          unitNumber: unitNumber.trim(),
          createdBy: currentUserId ?? "",
        });
        await refreshPending();
        setBuilding("");
        setUnitNumber("");
        setShowAdd(false);
        router.refresh();
        // Stay on section page — local unit appears in merged list
      } else {
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
        router.push(
          `/inspections/${projectId}/sections/${projectSectionId}/units/${unitId}`
        );
      }
    } catch (err) {
      console.error("Failed to create unit:", err);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-content-secondary uppercase tracking-wide">
          {t("unit.unitsCount", { count: mergedUnits.length })}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowBulk(true); setShowAdd(false); }}
            className="px-3 py-1.5 text-sm font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-md transition-colors border border-brand-200"
          >
            {t("bulkUpload.importButton")}
          </button>
          <button
            onClick={() => { setShowAdd(true); setShowBulk(false); }}
            className="px-3 py-1.5 bg-brand-600 text-white text-sm rounded-md hover:bg-brand-700 transition-colors"
          >
            {t("forms.addUnit")}
          </button>
        </div>
      </div>

      {/* Bulk import */}
      {showBulk && (
        <BulkUnitUpload
          projectId={projectId}
          projectSectionId={projectSectionId}
          onClose={() => setShowBulk(false)}
        />
      )}

      {/* Add unit form */}
      {showAdd && (
        <div className="bg-surface-primary rounded-lg border border-edge-primary p-4 mb-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-content-tertiary mb-1">
                              {t("forms.building")}
              </label>
              <input
                type="text"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                placeholder="B1"
                className="w-full px-3 py-2 border border-edge-secondary rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                autoFocus
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-content-tertiary mb-1">
                              {t("forms.unitNumber")}
              </label>
              <input
                type="text"
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                placeholder="101"
                className="w-full px-3 py-2 border border-edge-secondary rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
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
              className="px-3 py-1.5 text-sm text-content-tertiary hover:text-content-primary"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={handleAddUnit}
              disabled={!building.trim() || !unitNumber.trim() || adding}
              className="px-3 py-1.5 bg-brand-600 text-white text-sm rounded-md hover:bg-brand-700 disabled:opacity-50"
            >
              {adding ? t("unit.adding") : t("forms.addUnit")}
            </button>
          </div>
        </div>
      )}

      {/* Unit list */}
      {mergedUnits.length > 0 ? (
        <div className="space-y-2">
          {mergedUnits.map((unit) => {
            const conditionInfo = unit.overall_condition
              ? OVERALL_CONDITION_LABELS[unit.overall_condition]
              : null;
            const photoCount = capturesByUnit[unit.id] ?? 0;
            const isLocal = (unit as any)._isLocal;

            return (
              <Link
                key={unit.id}
                href={
                  isLocal
                    ? "#" // Local units can't navigate to server page yet
                    : `/inspections/${projectId}/sections/${projectSectionId}/units/${unit.id}`
                }
                onClick={(e) => {
                  if (isLocal) e.preventDefault();
                }}
                className={`block bg-surface-primary rounded-lg border p-3 transition-shadow ${
                  isLocal
                    ? "border-brand-300 border-dashed opacity-80"
                    : "border-edge-primary hover:shadow-md"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                    <span className="text-sm font-medium text-content-primary">
                      {unit.building} - {unit.unit_number}
                    </span>
                    {/* Pending sync badge for local units */}
                    {isLocal && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        {t("unit.pendingSync")}
                      </span>
                    )}
                    {/* Occupancy status badge */}
                    {unit.occupancy_status && unit.occupancy_status !== "UNKNOWN" && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                          OCCUPANCY_STATUS_LABELS[unit.occupancy_status]?.color ?? "bg-surface-tertiary text-content-tertiary"
                        }`}
                      >
                        {t(`inspection.occupancyStatus.${unit.occupancy_status}`)}
                      </span>
                    )}
                    {/* Walk status badge (show for vacant/down units) */}
                    {(unit.occupancy_status === "VACANT" || unit.occupancy_status === "DOWN") &&
                      unit.walk_status !== "NOT_STARTED" && (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                            WALK_STATUS_LABELS[unit.walk_status]?.color ?? "bg-surface-tertiary text-content-tertiary"
                          }`}
                        >
                          {t(`inspection.walkStatus.${unit.walk_status}`)}
                        </span>
                      )}
                    {conditionInfo && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${conditionInfo.color}`}
                      >
                        {t(`inspection.overallCondition.${unit.overall_condition}`)}
                      </span>
                    )}
                    {unit.has_leak_evidence && (
                      <span className="text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-medium">
                      {t("unit.leak")}
                    </span>
                    )}
                    {unit.has_mold_indicators && (
                      <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">
                      {t("unit.mold")}
                    </span>
                    )}
                    {photoCount > 0 && (
                      <span className="text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-medium">
                        {t("common.photos", { count: photoCount })}
                      </span>
                    )}
                  </div>
                  {!isLocal && (
                    <svg
                      className="w-4 h-4 text-content-muted flex-shrink-0"
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
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="bg-surface-secondary rounded-lg border border-edge-primary p-6 text-center text-sm text-content-quaternary">
          {t("unit.noUnitsYet")}
        </div>
      )}
    </div>
  );
}
