"use client";

import { useState, useCallback, useEffect } from "react";
import {
  updateInspectionUnitField,
  deleteInspectionUnit,
  provisionTurnChecklist,
  createInspectionUnit,
} from "@/app/actions/inspection-units";
import {
  uploadInspectionCapture,
  deleteInspectionCapture,
} from "@/app/actions/inspection-captures";
import { useFieldRouter } from "@/lib/offline/use-field-router";
import { useOffline } from "@/components/offline-provider";
import {
  saveUnitCheckOffline,
  addCaptureOffline,
  deleteCaptureOffline,
} from "@/lib/offline/actions";
import { CategorySection } from "@/components/unit-turn/category-section";
import {
  OCCUPANCY_STATUS_LABELS,
  OCCUPANCY_OPTIONS,
} from "@/lib/inspection-constants";
import type {
  InspectionUnit,
  InspectionCapture,
  OccupancyStatus,
} from "@/lib/inspection-types";
import type { UnitTurnCategoryData } from "@/lib/unit-turn-types";

interface InspectionUnitDetailProps {
  unit: InspectionUnit;
  captures: InspectionCapture[];
  projectId: string;
  projectSectionId: string;
  sectionSlug: string;
  inspectionType: string;
  currentUserId?: string;
  turnCategoryData?: UnitTurnCategoryData[];
  supabaseUrl?: string;
}

export function InspectionUnitDetail({
  unit,
  captures,
  projectId,
  projectSectionId,
  sectionSlug,
  inspectionType,
  currentUserId,
  turnCategoryData = [],
  supabaseUrl = "",
}: InspectionUnitDetailProps) {
  const router = useFieldRouter();
  const { isFieldMode, refreshPending } = useOffline();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [provisioning, setProvisioning] = useState(false);

  const [rentReady, setRentReady] = useState<boolean | null>(unit.rent_ready);
  const [daysVacant, setDaysVacant] = useState<number | null>(unit.days_vacant);
  const [notes, setNotes] = useState(unit.notes);
  const [occupancyStatus, setOccupancyStatus] = useState<OccupancyStatus>(
    unit.occupancy_status
  );
  const [turnUnitId, setTurnUnitId] = useState<string | null>(unit.turn_unit_id);

  const updateField = useCallback(
    async (field: string, value: any) => {
      setSaving(true);
      try {
        if (isFieldMode) {
          await saveUnitCheckOffline({
            unitId: unit.id,
            projectId,
            projectSectionId,
            field,
            value,
          });
          await refreshPending();
        } else {
          await updateInspectionUnitField(
            unit.id,
            projectId,
            projectSectionId,
            field,
            value
          );
        }
      } catch (err) {
        console.error("Failed to update unit field:", err);
      } finally {
        setSaving(false);
      }
    },
    [unit.id, projectId, projectSectionId, isFieldMode, refreshPending]
  );

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      if (isFieldMode) {
        await addCaptureOffline({
          file,
          projectId,
          projectSectionId,
          sectionSlug,
          unitId: unit.id,
          createdBy: currentUserId ?? "",
        });
        await refreshPending();
      } else {
        const formData = new FormData();
        formData.set("file", file);
        formData.set("projectSectionId", projectSectionId);
        formData.set("projectId", projectId);
        formData.set("sectionSlug", sectionSlug);
        formData.set("unitId", unit.id);

        await uploadInspectionCapture(formData);
      }
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
      if (isFieldMode) {
        await deleteCaptureOffline({
          captureId: capture.id,
          imagePath: capture.image_path,
          projectId,
          projectSectionId,
        });
        await refreshPending();
      } else {
        await deleteInspectionCapture(
          capture.id,
          capture.image_path,
          projectId,
          projectSectionId
        );
      }
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

  // Auto-provision on mount if rent_ready is false but no checklist yet
  const [provisionError, setProvisionError] = useState("");
  useEffect(() => {
    if (rentReady === false && !turnUnitId && !provisioning) {
      (async () => {
        setProvisioning(true);
        setProvisionError("");
        try {
          const res = await provisionTurnChecklist(
            unit.id,
            projectId,
            unit.building,
            unit.unit_number
          );
          if (res.error) {
            console.error("Provision error:", res.error);
            setProvisionError(res.error);
          } else if (res.turnUnitId) {
            setTurnUnitId(res.turnUnitId);
            router.refresh();
          }
        } catch (err) {
          console.error("Failed to provision turn checklist:", err);
          setProvisionError(String(err));
        } finally {
          setProvisioning(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProvisionChecklist = useCallback(async () => {
    if (turnUnitId) return; // already provisioned
    setProvisioning(true);
    try {
      const res = await provisionTurnChecklist(
        unit.id,
        projectId,
        unit.building,
        unit.unit_number
      );
      if (res.turnUnitId) {
        setTurnUnitId(res.turnUnitId);
        router.refresh(); // reload page to get checklist data from server
      }
    } catch (err) {
      console.error("Failed to provision turn checklist:", err);
    } finally {
      setProvisioning(false);
    }
  }, [turnUnitId, unit.id, unit.building, unit.unit_number, projectId, router]);

  return (
    <div className="space-y-6">
      {saving && (
        <div className="text-xs text-content-muted text-right">Saving...</div>
      )}

      {/* Occupancy & Walk Status */}
      <div className="bg-surface-primary rounded-lg border border-edge-primary p-4 space-y-4">
        <h3 className="text-sm font-semibold text-content-secondary">
          Occupancy & Walk Status
        </h3>

        {/* Occupancy Status */}
        <div>
          <label className="block text-xs font-medium text-content-tertiary mb-1.5">
            Occupancy Status
          </label>
          <div className="flex flex-wrap gap-1.5">
            {OCCUPANCY_OPTIONS.filter((opt) =>
              inspectionType === "internal" ? opt !== "MODEL" && opt !== "UNKNOWN" : true
            ).map((opt) => {
              const info = OCCUPANCY_STATUS_LABELS[opt];
              return (
                <button
                  key={opt}
                  onClick={() => {
                    setOccupancyStatus(opt as OccupancyStatus);
                    updateField("occupancy_status", opt);
                  }}
                  className={`px-3 py-2.5 text-sm rounded-md border transition-colors ${
                    occupancyStatus === opt
                      ? info.color + " border-current font-medium"
                      : "bg-surface-primary text-content-tertiary border-edge-secondary hover:bg-surface-secondary"
                  }`}
                >
                  {info.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Days Vacant (only for vacant/down) */}
        {(occupancyStatus === "VACANT" || occupancyStatus === "DOWN") && (
          <div>
            <label className="block text-xs font-medium text-content-tertiary mb-1.5">
              Days Vacant
            </label>
            <input
              type="number"
              value={daysVacant ?? ""}
              onChange={(e) =>
                setDaysVacant(e.target.value ? parseInt(e.target.value) : null)
              }
              onBlur={() => {
                if (daysVacant !== unit.days_vacant) {
                  updateField("days_vacant", daysVacant);
                }
              }}
              min={0}
              placeholder="e.g. 30"
              className="w-32 px-3 py-2 text-sm border border-edge-secondary rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        )}

        {/* Rent Ready toggle (only for vacant/down) */}
        {(occupancyStatus === "VACANT" || occupancyStatus === "DOWN") && (
          <div>
            <label className="block text-xs font-medium text-content-tertiary mb-1.5">
              Rent Ready
            </label>
            <div className="flex gap-2">
              {(["Yes", "No"] as const).map((val) => {
                const boolVal = val === "Yes";
                const isActive = rentReady === boolVal;
                return (
                  <button
                    key={val}
                    onClick={async () => {
                      const newVal = rentReady === boolVal ? null : boolVal;
                      setRentReady(newVal);
                      updateField("rent_ready", newVal);
                      // Auto-provision checklist when switching to No
                      if (newVal === false && !turnUnitId) {
                        setProvisioning(true);
                        try {
                          const res = await provisionTurnChecklist(
                            unit.id,
                            projectId,
                            unit.building,
                            unit.unit_number
                          );
                          if (res.turnUnitId) {
                            setTurnUnitId(res.turnUnitId);
                            router.refresh();
                          }
                        } catch (err) {
                          console.error("Failed to provision turn checklist:", err);
                        } finally {
                          setProvisioning(false);
                        }
                      }
                    }}
                    className={`px-3 py-2.5 text-sm rounded-md border transition-colors ${
                      isActive
                        ? boolVal
                          ? "bg-green-500 text-white border-green-500 font-medium"
                          : "bg-red-500 text-white border-red-500 font-medium"
                        : "bg-surface-primary text-content-tertiary border-edge-secondary hover:bg-surface-secondary"
                    }`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Rent Ready = Yes → Notes + Photos only */}
      {rentReady === true && (
        <>
          {/* Notes */}
          <div className="bg-surface-primary rounded-lg border border-edge-primary p-4">
            <label className="block text-sm font-medium text-content-secondary mb-1">
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
              className="w-full px-3 py-2 border border-edge-secondary rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Photos */}
          <div className="bg-surface-primary rounded-lg border border-edge-primary p-4">
            <label className="block text-sm font-medium text-content-secondary mb-2">
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
                        className="absolute top-1 right-1 w-7 h-7 bg-red-500 text-white rounded-full text-xs opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
              </div>
            )}
            <label
              className={`inline-flex items-center gap-1 px-3 py-2.5 text-sm border border-edge-secondary rounded-md cursor-pointer hover:bg-surface-secondary transition-colors ${
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
        </>
      )}

      {/* Rent Ready = No → Unit Turn Checklist */}
      {rentReady === false && (
        <>
          {provisioning ? (
            <div className="bg-surface-primary rounded-lg border border-edge-primary p-6 text-center">
              <p className="text-sm text-content-muted">Setting up checklist...</p>
            </div>
          ) : turnCategoryData.length > 0 ? (
            <div className="space-y-5">
              {/* Standard categories */}
              {turnCategoryData
                .filter((cd) => cd.category.category_type === "standard")
                .map((cd) => (
                  <div key={cd.category.id} id={`cat-${cd.category.slug}`}>
                    <CategorySection
                      data={cd}
                      batchId=""
                      unitId={turnUnitId ?? ""}
                      supabaseUrl={supabaseUrl}
                      currentUserId={currentUserId}
                    />
                  </div>
                ))}

              {/* Paint section */}
              {turnCategoryData.filter((cd) => cd.category.category_type === "paint").length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-content-quaternary uppercase tracking-wider mb-3">Paint</h2>
                  <div className="space-y-5">
                    {turnCategoryData
                      .filter((cd) => cd.category.category_type === "paint")
                      .map((cd) => (
                        <div key={cd.category.id} id={`cat-${cd.category.slug}`}>
                          <CategorySection
                            data={cd}
                            batchId=""
                            unitId={turnUnitId ?? ""}
                            supabaseUrl={supabaseUrl}
                            currentUserId={currentUserId}
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-surface-primary rounded-lg border border-edge-primary p-6 text-center">
              {provisionError ? (
                <p className="text-sm text-red-500">Error: {provisionError}</p>
              ) : (
                <p className="text-sm text-content-muted">Setting up checklist...</p>
              )}
            </div>
          )}
        </>
      )}

      {/* Add Unit inline */}
      <AddUnitInline
        projectId={projectId}
        projectSectionId={projectSectionId}
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

/* ── Add Unit Inline (inspection-specific) ── */
function AddUnitInline({
  projectId,
  projectSectionId,
}: {
  projectId: string;
  projectSectionId: string;
}) {
  const router = useFieldRouter();
  const [open, setOpen] = useState(false);
  const [building, setBuilding] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!building.trim() || !unitNumber.trim()) return;

    setLoading(true);
    setError("");
    try {
      const newId = await createInspectionUnit({
        project_id: projectId,
        project_section_id: projectSectionId,
        building: building.trim(),
        unit_number: unitNumber.trim(),
      });
      router.push(
        `/inspections/${projectId}/sections/${projectSectionId}/units/${newId}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create unit");
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 bg-surface-primary border-2 border-dashed border-brand-300 text-brand-600 text-sm font-medium rounded-lg hover:bg-brand-50 hover:border-brand-400 transition-colors"
      >
        + Add Unit
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface-primary rounded-lg border border-brand-200 p-4"
    >
      <h3 className="text-sm font-semibold text-content-secondary mb-3">
        Add Unit
      </h3>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-content-quaternary mb-1">
            Building
          </label>
          <input
            type="text"
            value={building}
            onChange={(e) => setBuilding(e.target.value)}
            placeholder="e.g. A"
            className="w-full px-3 py-2 border border-edge-secondary rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-content-quaternary mb-1">
            Unit #
          </label>
          <input
            type="text"
            value={unitNumber}
            onChange={(e) => setUnitNumber(e.target.value)}
            placeholder="e.g. 102"
            className="w-full px-3 py-2 border border-edge-secondary rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            autoFocus
            required
          />
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-3">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3 mt-3">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError("");
            setBuilding("");
            setUnitNumber("");
          }}
          className="px-3 py-1.5 text-sm text-content-quaternary hover:text-content-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!building.trim() || !unitNumber.trim() || loading}
          className="px-4 py-1.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Creating..." : "Create & Open"}
        </button>
      </div>
    </form>
  );
}

