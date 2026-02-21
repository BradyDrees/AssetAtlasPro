"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
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
import { useLocalUnitCaptures } from "@/lib/offline/use-local-data";
import {
  saveUnitCheckOffline,
  addCaptureOffline,
  deleteCaptureOffline,
  deleteInspectionUnitOffline,
  provisionTurnChecklistOffline,
  createInspectionUnitOffline,
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
  const t = useTranslations();
  const { isFieldMode, refreshPending, bumpRevision } = useOffline();
  const { captures: localCaptures, urlMap: localUrlMap } = useLocalUnitCaptures(unit.id);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
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
        bumpRevision();
        setSavedToast(true);
        setTimeout(() => setSavedToast(false), 2000);
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
    if (!confirm(t("unit.deleteUnitConfirm"))) return;
    setDeleting(true);
    try {
      if (isFieldMode) {
        await deleteInspectionUnitOffline({
          unitId: unit.id,
          projectId,
          projectSectionId,
        });
        await refreshPending();
      } else {
        await deleteInspectionUnit(unit.id, projectId, projectSectionId);
      }
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
          if (isFieldMode) {
            const localTurnId = await provisionTurnChecklistOffline({
              inspectionUnitId: unit.id,
              projectId,
              building: unit.building,
              unitNumber: unit.unit_number,
              createdBy: currentUserId ?? "",
            });
            setTurnUnitId(localTurnId);
            await refreshPending();
            router.refresh();
          } else {
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
      if (isFieldMode) {
        const localTurnId = await provisionTurnChecklistOffline({
          inspectionUnitId: unit.id,
          projectId,
          building: unit.building,
          unitNumber: unit.unit_number,
          createdBy: currentUserId ?? "",
        });
        setTurnUnitId(localTurnId);
        await refreshPending();
        router.refresh();
      } else {
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
      }
    } catch (err) {
      console.error("Failed to provision turn checklist:", err);
    } finally {
      setProvisioning(false);
    }
  }, [turnUnitId, unit.id, unit.building, unit.unit_number, projectId, router, isFieldMode, currentUserId, refreshPending]);

  return (
    <div className="space-y-6">
      {saving && (
        <div className="text-xs text-content-muted text-right">{t("common.saving")}</div>
      )}

      {/* Occupancy & Walk Status */}
      <div className="bg-surface-primary rounded-lg border border-edge-primary p-4 space-y-4">
        <h3 className="text-sm font-semibold text-content-secondary">
          {t("unit.occupancyWalkStatus")}
        </h3>

        {/* Occupancy Status */}
        <div>
          <label className="block text-xs font-medium text-content-tertiary mb-1.5">
            {t("unit.occupancyStatusLabel")}
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
                  {t(`inspection.occupancyStatus.${opt}`)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Days Vacant (only for vacant/down) */}
        {(occupancyStatus === "VACANT" || occupancyStatus === "DOWN") && (
          <div>
            <label className="block text-xs font-medium text-content-tertiary mb-1.5">
                          {t("unit.daysVacant")}
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
                          {t("unit.rentReady")}
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
                          if (isFieldMode) {
                            const localTurnId = await provisionTurnChecklistOffline({
                              inspectionUnitId: unit.id,
                              projectId,
                              building: unit.building,
                              unitNumber: unit.unit_number,
                              createdBy: currentUserId ?? "",
                            });
                            setTurnUnitId(localTurnId);
                            await refreshPending();
                            router.refresh();
                          } else {
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
                    {val === "Yes" ? t("common.yes") : t("common.no")}
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
              {t("unit.unitNotes")}
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
              placeholder={t("notes.unitObservationsPlaceholder")}
              className="w-full px-3 py-2 border border-edge-secondary rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Photos */}
          <div className="bg-surface-primary rounded-lg border border-edge-primary p-4">
            <label className="block text-sm font-medium text-content-secondary mb-2">
              {t("unit.photosCount", { count: captures.length + localCaptures.length })}
              {localCaptures.length > 0 && (
                <span className="ml-1.5 text-xs text-amber-600 font-normal">
                  {t("unit.pendingSyncCount", { count: localCaptures.length })}
                </span>
              )}
            </label>
            {(captures.length > 0 || localCaptures.length > 0) && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {/* Server captures */}
                {captures
                  .filter((c) => c.file_type === "image")
                  .map((capture) => (
                    <div key={capture.id} className="relative group">
                      <img
                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/dd-captures/${capture.image_path}`}
                        alt={capture.caption || t("unit.unitPhoto")}
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
                {/* Local pending captures */}
                {localCaptures
                  .filter((c) => c.fileType === "image")
                  .map((capture) => {
                    const url = localUrlMap.get(capture.localId);
                    return (
                      <div key={capture.localId} className="relative">
                        {url && (
                          <img
                            src={url}
                            alt={t("unit.pendingPhoto")}
                            className="w-full h-28 object-cover rounded-md border-2 border-dashed border-amber-400 opacity-80"
                          />
                        )}
                        <span className="absolute bottom-1 left-1 text-[10px] bg-amber-500 text-white px-1 py-0.5 rounded font-medium">
                          {t("inspection.pending")}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
            <div className="flex items-center gap-2">
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
                {uploading ? t("inspection.uploading") : t("inspection.addPhoto")}
              </label>
              {savedToast && (
                <span className="text-xs text-brand-600 font-medium animate-pulse">
                  {t("inspection.savedOffline")}
                </span>
              )}
            </div>
          </div>
        </>
      )}

      {/* Rent Ready = No → Unit Turn Checklist */}
      {rentReady === false && (
        <>
          {provisioning ? (
            <div className="bg-surface-primary rounded-lg border border-edge-primary p-6 text-center">
              <p className="text-sm text-content-muted">{t("unit.settingUpChecklist")}</p>
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
                  <h2 className="text-sm font-bold text-content-quaternary uppercase tracking-wider mb-3">{t("unitTurn.categories.paint")}</h2>
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
          ) : turnUnitId && isFieldMode ? (
            <div className="bg-surface-primary rounded-lg border border-amber-200 p-6 text-center">
              <svg className="w-8 h-8 text-amber-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-amber-700 font-medium">{t("unit.checklistQueuedForSync")}</p>
              <p className="text-xs text-content-muted mt-1">
                {t("unit.connectToInternet")}
              </p>
            </div>
          ) : (
            <div className="bg-surface-primary rounded-lg border border-edge-primary p-6 text-center">
              {provisionError ? (
                <p className="text-sm text-red-500">{t("common.error")}: {provisionError}</p>
              ) : (
                <p className="text-sm text-content-muted">{t("unit.settingUpChecklist")}</p>
              )}
            </div>
          )}
        </>
      )}

      {/* Add Unit inline */}
      <AddUnitInline
        projectId={projectId}
        projectSectionId={projectSectionId}
        currentUserId={currentUserId}
      />

      {/* Delete unit */}
      <div className="flex justify-end">
        <button
          onClick={handleDeleteUnit}
          disabled={deleting}
          className="text-sm text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
        >
          {deleting ? t("inspection.deleting") : t("unit.deleteUnit")}
        </button>
      </div>
    </div>
  );
}

/* ── Add Unit Inline (inspection-specific) ── */
function AddUnitInline({
  projectId,
  projectSectionId,
  currentUserId,
}: {
  projectId: string;
  projectSectionId: string;
  currentUserId?: string;
}) {
  const router = useFieldRouter();
  const t = useTranslations();
  const { isFieldMode, refreshPending } = useOffline();
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
      if (isFieldMode) {
        await createInspectionUnitOffline({
          projectId,
          projectSectionId,
          building: building.trim(),
          unitNumber: unitNumber.trim(),
          createdBy: currentUserId ?? "",
        });
        await refreshPending();
        // Stay on section page — local unit appears in merged list
        router.push(
          `/inspections/${projectId}/sections/${projectSectionId}`
        );
      } else {
        const newId = await createInspectionUnit({
          project_id: projectId,
          project_section_id: projectSectionId,
          building: building.trim(),
          unit_number: unitNumber.trim(),
        });
        router.push(
          `/inspections/${projectId}/sections/${projectSectionId}/units/${newId}`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("forms.validation.failedToCreate"));
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 bg-surface-primary border-2 border-dashed border-brand-300 text-brand-600 text-sm font-medium rounded-lg hover:bg-brand-50 hover:border-brand-400 transition-colors"
      >
        {t("unit.addUnit")}
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface-primary rounded-lg border border-brand-200 p-4"
    >
      <h3 className="text-sm font-semibold text-content-secondary mb-3">
        {t("forms.addUnit")}
      </h3>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-content-quaternary mb-1">
                        {t("forms.building")}
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
                        {t("forms.unitNumber")}
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
          {t("common.cancel")}
        </button>
        <button
          type="submit"
          disabled={!building.trim() || !unitNumber.trim() || loading}
          className="px-4 py-1.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {loading ? t("forms.creating") : t("forms.createAndOpen")}
        </button>
      </div>
    </form>
  );
}

