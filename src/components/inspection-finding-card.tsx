"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateInspectionFindingField,
  deleteInspectionFinding,
} from "@/app/actions/inspection-findings";
import {
  uploadInspectionCapture,
  deleteInspectionCapture,
} from "@/app/actions/inspection-captures";
import {
  PRIORITY_LABELS,
  GOOD_LABEL,
  EXPOSURE_LABELS,
  EXPOSURE_OPTIONS,
  RISK_FLAG_LABELS,
  RISK_FLAG_OPTIONS,
} from "@/lib/inspection-constants";
import type {
  InspectionFinding,
  InspectionCapture,
  InspectionType,
  PriorityLevel,
  ExposureBucket,
  ProjectRole,
} from "@/lib/inspection-types";

export interface FindingCardProps {
  finding: InspectionFinding;
  captures: InspectionCapture[];
  projectId: string;
  projectSectionId: string;
  sectionSlug: string;
  inspectionType: InspectionType;
  defaultExpanded?: boolean;
  /** Current user's role on this project */
  role?: ProjectRole;
  /** Current user's ID (for checking ownership of findings) */
  currentUserId?: string;
  /** Called when priority changes so parent can recalculate health scores */
  onPriorityChange?: (findingId: string, newPriority: number | null) => void;
  /** Called when finding is deleted so parent can update state */
  onDeleted?: (findingId: string) => void;
  /** Called when "Add Finding" is clicked — parent creates a sibling finding */
  onAddFinding?: () => void;
}

export function FindingCard({
  finding,
  captures,
  projectId,
  projectSectionId,
  sectionSlug,
  inspectionType,
  defaultExpanded = true,
  role = "owner",
  currentUserId,
  onPriorityChange,
  onDeleted,
  onAddFinding,
}: FindingCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [priority, setPriority] = useState<number | null>(finding.priority);
  const [exposureBucket, setExposureBucket] = useState<string | null>(
    finding.exposure_bucket
  );
  const [exposureCustom, setExposureCustom] = useState<number | null>(
    finding.exposure_custom
  );
  const [riskFlags, setRiskFlags] = useState<string[]>(
    finding.risk_flags ?? []
  );
  const [location, setLocation] = useState(finding.location ?? "");
  const [notes, setNotes] = useState(finding.notes);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isBankReady = inspectionType === "bank_ready";

  // Permission checks: owner can do everything, collaborator only their own
  const isOwner = role === "owner";
  const isCreator = currentUserId === finding.created_by;
  const canEdit = isOwner || isCreator;
  const canDelete = isOwner || isCreator;

  const updateField = async (field: string, value: any) => {
    setSaving(true);
    try {
      await updateInspectionFindingField(
        finding.id,
        projectId,
        projectSectionId,
        field,
        value
      );
    } catch (err) {
      console.error("Failed to update finding:", err);
    } finally {
      setSaving(false);
    }
  };

  const handlePriority = async (val: number | null) => {
    const newVal = val === priority ? null : val;
    setPriority(newVal);
    await updateField("priority", newVal);
    onPriorityChange?.(finding.id, newVal);
  };

  const handleExposure = async (val: string) => {
    const newVal = val === exposureBucket ? null : val;
    setExposureBucket(newVal);
    await updateField("exposure_bucket", newVal);
  };

  const handleExposureCustom = async () => {
    await updateField("exposure_custom", exposureCustom);
  };

  const handleRiskFlag = async (flag: string) => {
    const newFlags = riskFlags.includes(flag)
      ? riskFlags.filter((f) => f !== flag)
      : [...riskFlags, flag];
    setRiskFlags(newFlags);
    await updateField("risk_flags", newFlags);
  };

  const handleLocationBlur = async () => {
    if (location !== (finding.location ?? "")) {
      await updateField("location", location);
    }
  };

  const handleNotesBlur = async () => {
    if (notes !== finding.notes) {
      await updateField("notes", notes);
    }
  };

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
      formData.set("findingId", finding.id);

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

  const handleDeleteFinding = async () => {
    if (!confirm("Delete this finding and all its photos?")) return;
    setDeleting(true);
    try {
      await deleteInspectionFinding(finding.id, projectId, projectSectionId);
      onDeleted?.(finding.id);
      router.refresh();
    } catch (err) {
      console.error("Delete finding failed:", err);
      setDeleting(false);
    }
  };

  const priorityInfo = priority
    ? PRIORITY_LABELS[priority as PriorityLevel]
    : null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Finding header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className={`text-xs transition-transform ${
              isExpanded ? "rotate-90" : ""
            }`}
          >
            ▶
          </span>
          <span className="text-sm font-medium text-gray-900">
            {finding.title || "Untitled Finding"}
          </span>
          {finding.location && (
            <span className="text-xs text-gray-400 truncate max-w-[120px]">
              📍 {finding.location}
            </span>
          )}
          {priorityInfo ? (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityInfo.bgColor}`}
            >
              {priorityInfo.label}
            </span>
          ) : (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${GOOD_LABEL.bgColor}`}
            >
              {GOOD_LABEL.label}
            </span>
          )}
          {exposureBucket && (
            <span className="text-xs text-gray-500">
              {exposureBucket === "custom" && exposureCustom
                ? `$${exposureCustom.toLocaleString()}`
                : EXPOSURE_LABELS[exposureBucket as ExposureBucket]}
            </span>
          )}
          {captures.length > 0 && (
            <span className="text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-medium">
              {captures.length}
            </span>
          )}
        </div>
        {saving && (
          <span className="text-xs text-gray-400 mr-2">Saving...</span>
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {/* Location */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onBlur={handleLocationBlur}
              placeholder="e.g. South of Building 24, Kitchen, North parking lot..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              readOnly={!canEdit}
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Priority
              {isBankReady && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4, 5].map((val) => {
                const info = PRIORITY_LABELS[val as PriorityLevel];
                return (
                  <button
                    key={val}
                    onClick={() => canEdit && handlePriority(val)}
                    disabled={!canEdit}
                    className={`px-2.5 py-2 text-xs rounded-md border transition-colors ${
                      priority === val
                        ? info.bgColor + " border-current font-medium"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                    } ${!canEdit ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    {val} - {info.label}
                  </button>
                );
              })}
              <button
                onClick={() => canEdit && handlePriority(null)}
                disabled={!canEdit}
                className={`px-2.5 py-2 text-xs rounded-md border transition-colors ${
                  priority === null
                    ? GOOD_LABEL.bgColor + " border-current font-medium"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                } ${!canEdit ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                Good
              </button>
            </div>
          </div>

          {/* Exposure (show when priority 1-3 or always for bank-ready) */}
          {(priority !== null && priority <= 3) || isBankReady ? (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Exposure Estimate
                {isBankReady && priority !== null && priority <= 3 && (
                  <span className="text-red-500 ml-0.5">*</span>
                )}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {EXPOSURE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => canEdit && handleExposure(option)}
                    disabled={!canEdit}
                    className={`px-2.5 py-2 text-xs rounded-md border transition-colors ${
                      exposureBucket === option
                        ? "bg-brand-600 text-white border-brand-600"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                    } ${!canEdit ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    {EXPOSURE_LABELS[option]}
                  </button>
                ))}
              </div>
              {exposureBucket === "custom" && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-gray-500">$</span>
                  <input
                    type="number"
                    value={exposureCustom ?? ""}
                    onChange={(e) =>
                      setExposureCustom(
                        e.target.value ? parseInt(e.target.value) : null
                      )
                    }
                    onBlur={handleExposureCustom}
                    placeholder="Enter amount"
                    className="w-32 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              )}
            </div>
          ) : null}

          {/* Risk Flags */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Risk Flags
              {isBankReady && (
                <span className="text-xs text-gray-400 ml-1">
                  (select all that apply)
                </span>
              )}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {RISK_FLAG_OPTIONS.map((flag) => {
                const info = RISK_FLAG_LABELS[flag];
                const isActive = riskFlags.includes(flag);
                return (
                  <button
                    key={flag}
                    onClick={() => canEdit && handleRiskFlag(flag)}
                    disabled={!canEdit}
                    className={`px-2.5 py-2 text-xs rounded-md border transition-colors ${
                      isActive
                        ? info.color + " border-current font-medium"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                    } ${!canEdit ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    {info.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              rows={2}
              placeholder="Describe the finding..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              readOnly={!canEdit}
            />
          </div>

          {/* Photos */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Photos
              {isBankReady && priority !== null && priority <= 2 && (
                <span className="text-red-500 ml-0.5">*</span>
              )}
            </label>
            {captures.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {captures
                  .filter((c) => c.file_type === "image")
                  .map((capture) => (
                    <div key={capture.id} className="relative group">
                      <img
                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/dd-captures/${capture.image_path}`}
                        alt={capture.caption || "Finding photo"}
                        className="w-full h-24 object-cover rounded-md"
                      />
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteCapture(capture)}
                          className="absolute top-1 right-1 w-7 h-7 bg-red-500 text-white rounded-full text-xs opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            )}
            <label
              className={`inline-flex items-center gap-1 px-3 py-2.5 text-sm border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors ${
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

          {/* Add Finding / Delete Finding */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            {onAddFinding ? (
              <button
                onClick={onAddFinding}
                className="text-xs text-brand-600 hover:text-brand-800 font-medium transition-colors"
              >
                + Add Finding
              </button>
            ) : (
              <span />
            )}
            {canDelete && (
              <button
                onClick={handleDeleteFinding}
                disabled={deleting}
                className="text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Finding"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
