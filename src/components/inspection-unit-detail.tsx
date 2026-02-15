"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  updateInspectionUnitField,
  deleteInspectionUnit,
} from "@/app/actions/inspection-units";
import {
  uploadInspectionCapture,
  deleteInspectionCapture,
} from "@/app/actions/inspection-captures";
import {
  createInspectionFinding,
  updateInspectionFindingField,
  deleteInspectionFinding,
} from "@/app/actions/inspection-findings";
import { InspectionFindingsList } from "@/components/inspection-findings-list";
import {
  INSPECTION_UNIT_GRADES,
  OVERALL_CONDITION_LABELS,
  INSPECTION_YES_NO,
  INSPECTION_APPLIANCE_OPTIONS,
  OCCUPANCY_STATUS_LABELS,
  OCCUPANCY_OPTIONS,
  WALK_STATUS_LABELS,
  WALK_STATUS_OPTIONS,
  TURN_STAGE_LABELS,
  TURN_STAGE_OPTIONS,
} from "@/lib/inspection-constants";
import type {
  InspectionUnit,
  InspectionCapture,
  InspectionFinding,
  InspectionUnitGrade,
  OccupancyStatus,
  WalkStatus,
  TurnStage,
} from "@/lib/inspection-types";

interface InspectionUnitDetailProps {
  unit: InspectionUnit;
  captures: InspectionCapture[];
  findings: InspectionFinding[];
  projectId: string;
  projectSectionId: string;
  sectionSlug: string;
  inspectionType: string;
}

export function InspectionUnitDetail({
  unit,
  captures,
  findings,
  projectId,
  projectSectionId,
  sectionSlug,
  inspectionType,
}: InspectionUnitDetailProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Local state for all fields
  const [overallCondition, setOverallCondition] = useState<number | null>(
    unit.overall_condition
  );
  const [tenantHousekeeping, setTenantHousekeeping] = useState<string | null>(
    unit.tenant_housekeeping
  );
  const [floors, setFloors] = useState<string | null>(unit.floors);
  const [cabinets, setCabinets] = useState<string | null>(unit.cabinets);
  const [countertops, setCountertops] = useState<string | null>(
    unit.countertops
  );
  const [appliances, setAppliances] = useState<string[]>(
    unit.appliances ?? []
  );
  const [plumbingFixtures, setPlumbingFixtures] = useState<string | null>(
    unit.plumbing_fixtures
  );
  const [electricalFixtures, setElectricalFixtures] = useState<string | null>(
    unit.electrical_fixtures
  );
  const [windowsDoors, setWindowsDoors] = useState<string | null>(
    unit.windows_doors
  );
  const [bathCondition, setBathCondition] = useState<string | null>(
    unit.bath_condition
  );
  const [hasLeakEvidence, setHasLeakEvidence] = useState(
    unit.has_leak_evidence
  );
  const [hasMoldIndicators, setHasMoldIndicators] = useState(
    unit.has_mold_indicators
  );
  const [notes, setNotes] = useState(unit.notes);
  const [occupancyStatus, setOccupancyStatus] = useState<OccupancyStatus>(
    unit.occupancy_status
  );
  const [walkStatus, setWalkStatus] = useState<WalkStatus>(unit.walk_status);
  const [walkRequired, setWalkRequired] = useState(unit.walk_required);
  const [turnStage, setTurnStage] = useState<TurnStage | null>(
    unit.turn_stage
  );

  const updateField = useCallback(
    async (field: string, value: any) => {
      setSaving(true);
      try {
        await updateInspectionUnitField(
          unit.id,
          projectId,
          projectSectionId,
          field,
          value
        );
      } catch (err) {
        console.error("Failed to update unit field:", err);
      } finally {
        setSaving(false);
      }
    },
    [unit.id, projectId, projectSectionId]
  );

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("projectSectionId", projectSectionId);
      formData.set("projectId", projectId);
      formData.set("sectionSlug", sectionSlug);
      formData.set("unitId", unit.id);

      await uploadInspectionCapture(formData);
      router.refresh();
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteCapture = async (capture: InspectionCapture) => {
    try {
      await deleteInspectionCapture(
        capture.id,
        capture.image_path,
        projectId,
        projectSectionId
      );
      router.refresh();
    } catch (err) {
      console.error("Delete capture failed:", err);
    }
  };

  const handleDeleteUnit = async () => {
    if (!confirm("Delete this unit and all its photos?")) return;
    setDeleting(true);
    try {
      await deleteInspectionUnit(unit.id, projectId, projectSectionId);
      router.push(
        `/inspections/${projectId}/sections/${projectSectionId}`
      );
    } catch (err) {
      console.error("Delete unit failed:", err);
      setDeleting(false);
    }
  };

  // Grade selector helper
  const GradeSelector = ({
    label,
    value,
    onChange,
    field,
  }: {
    label: string;
    value: string | null;
    onChange: (v: string | null) => void;
    field: string;
  }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}
      </label>
      <div className="flex flex-wrap gap-1">
        {(Object.entries(INSPECTION_UNIT_GRADES) as [InspectionUnitGrade, any][]).map(
          ([grade, info]) => (
            <button
              key={grade}
              onClick={() => {
                const newVal = grade === value ? null : grade;
                onChange(newVal);
                updateField(field, newVal);
              }}
              className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                value === grade
                  ? info.color + " " + info.border
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {grade}
            </button>
          )
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {saving && (
        <div className="text-xs text-gray-400 text-right">Saving...</div>
      )}

      {/* Occupancy & Walk Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">
          Occupancy & Walk Status
        </h3>

        {/* Occupancy Status */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Occupancy Status
          </label>
          <div className="flex flex-wrap gap-1.5">
            {OCCUPANCY_OPTIONS.map((opt) => {
              const info = OCCUPANCY_STATUS_LABELS[opt];
              return (
                <button
                  key={opt}
                  onClick={() => {
                    setOccupancyStatus(opt as OccupancyStatus);
                    updateField("occupancy_status", opt);
                  }}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                    occupancyStatus === opt
                      ? info.color + " border-current font-medium"
                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {info.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Walk Required toggle (only for vacant/down) */}
        {(occupancyStatus === "VACANT" || occupancyStatus === "DOWN") && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Walk Required
            </label>
            <div className="flex gap-2">
              {(["Yes", "No"] as const).map((val) => {
                const boolVal = val === "Yes";
                return (
                  <button
                    key={val}
                    onClick={() => {
                      setWalkRequired(boolVal);
                      updateField("walk_required", boolVal);
                    }}
                    className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                      walkRequired === boolVal
                        ? boolVal
                          ? "bg-brand-600 text-white border-brand-600"
                          : "bg-gray-600 text-white border-gray-600"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Walk Status (only for vacant/down units that require a walk) */}
        {(occupancyStatus === "VACANT" || occupancyStatus === "DOWN") &&
          walkRequired && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Walk Status
              </label>
              <div className="flex flex-wrap gap-1.5">
                {WALK_STATUS_OPTIONS.map((opt) => {
                  const info = WALK_STATUS_LABELS[opt];
                  return (
                    <button
                      key={opt}
                      onClick={() => {
                        setWalkStatus(opt as WalkStatus);
                        updateField("walk_status", opt);
                      }}
                      className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                        walkStatus === opt
                          ? info.color + " border-current font-medium"
                          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {info.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        {/* Turn Stage (only for vacant/down) */}
        {(occupancyStatus === "VACANT" || occupancyStatus === "DOWN") && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Turn Stage
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TURN_STAGE_OPTIONS.map((opt) => {
                const info = TURN_STAGE_LABELS[opt];
                return (
                  <button
                    key={opt}
                    onClick={() => {
                      const newVal = turnStage === opt ? null : (opt as TurnStage);
                      setTurnStage(newVal);
                      updateField("turn_stage", newVal);
                    }}
                    className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                      turnStage === opt
                        ? info.color + " border-current font-medium"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {info.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Overall Condition */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Overall Condition
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((val) => {
            const info = OVERALL_CONDITION_LABELS[val];
            return (
              <button
                key={val}
                onClick={() => {
                  const newVal = val === overallCondition ? null : val;
                  setOverallCondition(newVal);
                  updateField("overall_condition", newVal);
                }}
                className={`flex-1 px-2 py-1.5 text-sm rounded-md border transition-colors ${
                  overallCondition === val
                    ? info.color + " border-current font-medium"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {val} - {info.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Component Grades */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">
          Component Grades
        </h3>
        <GradeSelector
          label="Tenant Housekeeping"
          value={tenantHousekeeping}
          onChange={setTenantHousekeeping}
          field="tenant_housekeeping"
        />
        <GradeSelector
          label="Floors"
          value={floors}
          onChange={setFloors}
          field="floors"
        />
        <GradeSelector
          label="Cabinets"
          value={cabinets}
          onChange={setCabinets}
          field="cabinets"
        />
        <GradeSelector
          label="Countertops"
          value={countertops}
          onChange={setCountertops}
          field="countertops"
        />
        <GradeSelector
          label="Plumbing Fixtures"
          value={plumbingFixtures}
          onChange={setPlumbingFixtures}
          field="plumbing_fixtures"
        />
        <GradeSelector
          label="Electrical Fixtures"
          value={electricalFixtures}
          onChange={setElectricalFixtures}
          field="electrical_fixtures"
        />
        <GradeSelector
          label="Windows & Doors"
          value={windowsDoors}
          onChange={setWindowsDoors}
          field="windows_doors"
        />
        <GradeSelector
          label="Bath Condition"
          value={bathCondition}
          onChange={setBathCondition}
          field="bath_condition"
        />
      </div>

      {/* Appliances */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Appliances
        </label>
        <div className="flex flex-wrap gap-2">
          {INSPECTION_APPLIANCE_OPTIONS.map((option) => {
            const isActive = appliances.includes(option);
            return (
              <button
                key={option}
                onClick={() => {
                  const newVal = isActive
                    ? appliances.filter((a) => a !== option)
                    : [...appliances, option];
                  setAppliances(newVal);
                  updateField("appliances", newVal);
                }}
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                  isActive
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      {/* Toggles */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Indicators</h3>
        <div className="flex gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Evidence of Leaks
            </label>
            <div className="flex gap-2">
              {(["Yes", "No"] as const).map((val) => {
                const boolVal = val === "Yes";
                return (
                  <button
                    key={val}
                    onClick={() => {
                      setHasLeakEvidence(boolVal);
                      updateField("has_leak_evidence", boolVal);
                    }}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                      hasLeakEvidence === boolVal
                        ? INSPECTION_YES_NO[val].color + " border-current"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Mold Indicators
            </label>
            <div className="flex gap-2">
              {(["Yes", "No"] as const).map((val) => {
                const boolVal = val === "Yes";
                return (
                  <button
                    key={val}
                    onClick={() => {
                      setHasMoldIndicators(boolVal);
                      updateField("has_mold_indicators", boolVal);
                    }}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                      hasMoldIndicators === boolVal
                        ? INSPECTION_YES_NO[val].color + " border-current"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Unit Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            if (notes !== unit.notes) {
              updateField("notes", notes);
            }
          }}
          rows={3}
          placeholder="Notes about this unit..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Photos */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Photos ({captures.length})
        </label>
        {captures.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {captures
              .filter((c) => c.file_type === "image")
              .map((capture) => (
                <div key={capture.id} className="relative group">
                  <img
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/dd-captures/${capture.image_path}`}
                    alt={capture.caption || "Unit photo"}
                    className="w-full h-28 object-cover rounded-md"
                  />
                  <button
                    onClick={() => handleDeleteCapture(capture)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
          </div>
        )}
        <label
          className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors ${
            uploading ? "opacity-50" : ""
          }`}
        >
          <input
            type="file"
            accept="image/*,video/*"
            capture="environment"
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
          {uploading ? "Uploading..." : "+ Add Photo"}
        </label>
      </div>

      {/* Unit Findings */}
      <UnitFindings
        findings={findings}
        captures={captures}
        projectId={projectId}
        projectSectionId={projectSectionId}
        sectionSlug={sectionSlug}
        unitId={unit.id}
        inspectionType={inspectionType}
      />

      {/* Delete unit */}
      <div className="flex justify-end">
        <button
          onClick={handleDeleteUnit}
          disabled={deleting}
          className="text-sm text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete Unit"}
        </button>
      </div>
    </div>
  );
}

// --- Unit-level Findings sub-component ---

function UnitFindings({
  findings,
  captures,
  projectId,
  projectSectionId,
  sectionSlug,
  unitId,
  inspectionType,
}: {
  findings: InspectionFinding[];
  captures: InspectionCapture[];
  projectId: string;
  projectSectionId: string;
  sectionSlug: string;
  unitId: string;
  inspectionType: string;
}) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);

  // Filter findings for this unit
  const unitFindings = findings.filter((f) => f.unit_id === unitId);
  // Filter captures for this unit's findings
  const findingIds = new Set(unitFindings.map((f) => f.id));
  const unitFindingCaptures = captures.filter(
    (c) => c.finding_id && findingIds.has(c.finding_id)
  );

  const handleAddFinding = async () => {
    if (!title.trim()) return;
    setAdding(true);
    try {
      await createInspectionFinding({
        project_id: projectId,
        project_section_id: projectSectionId,
        checklist_item_id: null,
        unit_id: unitId,
        title: title.trim(),
      });
      setTitle("");
      setShowAdd(false);
      router.refresh();
    } catch (err) {
      console.error("Failed to create unit finding:", err);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">
          Unit Findings ({unitFindings.length})
        </h3>
        <button
          onClick={() => setShowAdd(true)}
          className="px-3 py-1.5 bg-orange-600 text-white text-xs rounded-md hover:bg-orange-700 transition-colors"
        >
          + Add Finding
        </button>
      </div>

      {showAdd && (
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Finding title..."
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && title.trim()) handleAddFinding();
              if (e.key === "Escape") {
                setShowAdd(false);
                setTitle("");
              }
            }}
          />
          <button
            onClick={handleAddFinding}
            disabled={!title.trim() || adding}
            className="px-3 py-1.5 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50"
          >
            {adding ? "..." : "Add"}
          </button>
          <button
            onClick={() => {
              setShowAdd(false);
              setTitle("");
            }}
            className="px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )}

      {unitFindings.length > 0 ? (
        <InspectionFindingsList
          findings={unitFindings}
          captures={unitFindingCaptures}
          projectId={projectId}
          projectSectionId={projectSectionId}
          sectionSlug={sectionSlug}
          inspectionType={inspectionType as any}
        />
      ) : (
        !showAdd && (
          <p className="text-sm text-gray-400">
            No findings for this unit yet.
          </p>
        )
      )}
    </div>
  );
}
