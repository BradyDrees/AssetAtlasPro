"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { TermAutocomplete } from "./term-autocomplete";
import {
  OPERATE_CATEGORY_SEEDS,
  OPERATE_LOCATION_SEEDS,
  OPERATIONAL_TAG_LABELS,
  OPERATIONAL_TAG_OPTIONS,
  PRIORITY_LABELS,
  RISK_FLAG_LABELS,
  RISK_FLAG_OPTIONS,
} from "@/lib/inspection-constants";
import type {
  InspectionFinding,
  PriorityLevel,
  RiskFlag,
  OperationalTag,
} from "@/lib/inspection-types";

export interface CaptureFormValues {
  addToLast: boolean;
  category: string;
  location: string;
  priority: PriorityLevel | null;
  riskFlags: RiskFlag[];
  tags: OperationalTag[];
  notes: string;
}

interface CaptureModTagFormProps {
  file: File;
  isUploading: boolean;
  lastSessionFinding: InspectionFinding | null;
  onSave: (values: CaptureFormValues) => void;
  onSkip: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

/**
 * Tag form for capture mode — collects form values only.
 * Parent handles persistence. This component owns its own preview objectURL.
 */
export function CaptureModeTagForm({
  file,
  isUploading,
  lastSessionFinding,
  onSave,
  onSkip,
  onCancel,
  isSaving,
}: CaptureModTagFormProps) {
  const t = useTranslations();

  // Form state
  const [addToLast, setAddToLast] = useState(false);
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [priority, setPriority] = useState<PriorityLevel | null>(null);
  const [riskFlags, setRiskFlags] = useState<RiskFlag[]>([]);
  const [tags, setTags] = useState<OperationalTag[]>([]);
  const [notes, setNotes] = useState("");

  // Photo preview — objectURL created and revoked here
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => {
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const toggleRiskFlag = (flag: RiskFlag) => {
    setRiskFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]
    );
  };

  const toggleTag = (tag: OperationalTag) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = () => {
    onSave({
      addToLast,
      category: category.trim() || "Uncategorized",
      location: location.trim(),
      priority,
      riskFlags,
      tags,
      notes: notes.trim(),
    });
  };

  const disabled = isSaving;

  return (
    <div className="space-y-4">
      {/* Photo preview with upload indicator */}
      <div className="relative w-full h-40 rounded-xl overflow-hidden bg-surface-tertiary">
        <img
          src={previewUrl}
          alt="Captured"
          className="w-full h-full object-cover"
        />
        {isUploading && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="flex items-center gap-2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {t("inspection.captureMode.uploading")}
            </div>
          </div>
        )}
      </div>

      {/* Hint text */}
      {isUploading && (
        <p className="text-xs text-content-quaternary text-center">
          {t("inspection.captureMode.readyToTag")}
        </p>
      )}

      {/* Add to previous finding toggle */}
      {lastSessionFinding && (
        <button
          type="button"
          onClick={() => setAddToLast(!addToLast)}
          disabled={disabled}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
            addToLast
              ? "border-brand-500 bg-brand-50 text-brand-700"
              : "border-edge-secondary bg-surface-secondary text-content-secondary hover:bg-surface-tertiary"
          }`}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <div className="text-left">
            <p className="text-sm font-medium">{t("inspection.captureMode.addToLast")}</p>
            <p className="text-xs text-content-quaternary truncate">
              {lastSessionFinding.title || lastSessionFinding.location || "—"}
            </p>
          </div>
          {addToLast && (
            <svg className="w-5 h-5 ml-auto text-brand-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      )}

      {/* Form fields — hidden when "add to last" is active */}
      {!addToLast && (
        <>
          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">
              {t("inspection.capture.category")}
            </label>
            <TermAutocomplete
              termType="category"
              seedList={OPERATE_CATEGORY_SEEDS}
              value={category}
              onChange={setCategory}
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">
              {t("inspection.capture.location")}
            </label>
            <TermAutocomplete
              termType="location"
              seedList={OPERATE_LOCATION_SEEDS}
              value={location}
              onChange={setLocation}
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">
              {t("inspection.capture.priority")}
            </label>
            <div className="flex gap-2">
              {([1, 2, 3, 4, 5] as PriorityLevel[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(priority === p ? null : p)}
                  disabled={disabled}
                  className={`flex-1 px-2 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    priority === p
                      ? PRIORITY_LABELS[p].bgColor + " border-transparent"
                      : "border-edge-secondary text-content-secondary hover:bg-surface-secondary"
                  }`}
                >
                  {PRIORITY_LABELS[p].label}
                </button>
              ))}
            </div>
          </div>

          {/* Risk Flags */}
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">
              {t("inspection.capture.riskFlags")}
            </label>
            <div className="flex flex-wrap gap-2">
              {RISK_FLAG_OPTIONS.map((flag) => (
                <button
                  key={flag}
                  type="button"
                  onClick={() => toggleRiskFlag(flag)}
                  disabled={disabled}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                    riskFlags.includes(flag)
                      ? RISK_FLAG_LABELS[flag].color + " border-transparent"
                      : "border-edge-secondary text-content-secondary hover:bg-surface-secondary"
                  }`}
                >
                  {RISK_FLAG_LABELS[flag].label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">
              {t("inspection.capture.tags")}
            </label>
            <div className="flex flex-wrap gap-2">
              {OPERATIONAL_TAG_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  disabled={disabled}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                    tags.includes(tag)
                      ? OPERATIONAL_TAG_LABELS[tag].color + " border-transparent"
                      : "border-edge-secondary text-content-secondary hover:bg-surface-secondary"
                  }`}
                >
                  {OPERATIONAL_TAG_LABELS[tag].label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">
              {t("inspection.capture.notes")}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              disabled={disabled}
              className="w-full px-3 py-2 text-sm border border-edge-secondary rounded-lg bg-surface-primary text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
              placeholder={t("inspection.capture.notes")}
            />
          </div>
        </>
      )}

      {/* Primary button: Save & Next */}
      <button
        type="button"
        onClick={handleSave}
        disabled={disabled}
        className="w-full py-3 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        {isSaving ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {t("inspection.captureMode.saving")}
          </span>
        ) : (
          t("inspection.captureMode.saveAndNext")
        )}
      </button>

      {/* Secondary row: Skip + Cancel */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onSkip}
          disabled={disabled}
          className="text-sm text-content-quaternary hover:text-content-secondary transition-colors px-2 py-1"
        >
          {t("inspection.captureMode.skip")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          className="text-sm text-content-quaternary hover:text-content-secondary transition-colors px-2 py-1"
        >
          {t("inspection.captureMode.cancel")}
        </button>
      </div>
    </div>
  );
}
