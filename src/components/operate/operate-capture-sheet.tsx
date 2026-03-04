"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { TermAutocomplete } from "./term-autocomplete";
import { addCaptureOffline } from "@/lib/offline/actions";
import { createQuickFinding, addCaptureToFinding } from "@/app/actions/inspection-findings";
import { compressPhoto } from "@/lib/offline/photo-compress";
import {
  OPERATE_CATEGORY_SEEDS,
  OPERATE_LOCATION_SEEDS,
  OPERATIONAL_TAG_LABELS,
  OPERATIONAL_TAG_OPTIONS,
  PRIORITY_LABELS,
  RISK_FLAG_LABELS,
  RISK_FLAG_OPTIONS,
} from "@/lib/inspection-constants";
import type { InspectionFinding, PriorityLevel, RiskFlag, OperationalTag } from "@/lib/inspection-types";

interface OperateCaptureSheetProps {
  file: File;
  projectId: string;
  projectSectionId: string;
  sectionSlug: string;
  unitId?: string | null;
  currentUserId: string;
  lastFinding?: InspectionFinding | null;
  onClose: () => void;
  onSaved: () => void;
}

export function OperateCaptureSheet({
  file,
  projectId,
  projectSectionId,
  sectionSlug,
  unitId,
  currentUserId,
  lastFinding,
  onClose,
  onSaved,
}: OperateCaptureSheetProps) {
  const t = useTranslations();
  const [saving, setSaving] = useState(false);
  const [addToLast, setAddToLast] = useState(false);

  // Form state
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [priority, setPriority] = useState<PriorityLevel | null>(null);
  const [riskFlags, setRiskFlags] = useState<RiskFlag[]>([]);
  const [tags, setTags] = useState<OperationalTag[]>([]);
  const [notes, setNotes] = useState("");

  // Photo preview
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

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      if (addToLast && lastFinding) {
        // "Add to last" — attach photo to existing finding
        // Use offline-first: store locally + queue
        await addCaptureOffline({
          file,
          projectId,
          projectSectionId,
          sectionSlug,
          findingServerId: lastFinding.id,
          createdBy: currentUserId,
          unitId: unitId ?? null,
        });
      } else {
        // New finding — compress + upload to storage + create finding+capture
        const compressed = await compressPhoto(file);
        const ext = "jpg";
        const storagePath = `inspections/${projectId}/${projectSectionId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

        // Upload to Supabase Storage
        const { createClient } = await import("@supabase/supabase-js");
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { error: uploadErr } = await supabase.storage
          .from("dd-captures")
          .upload(storagePath, compressed, {
            contentType: "image/jpeg",
            upsert: false,
          });

        if (uploadErr) throw uploadErr;

        // Create finding + capture via server action
        await createQuickFinding({
          projectId,
          projectSectionId,
          storagePath,
          category: category.trim() || "Uncategorized",
          location: location.trim() || "",
          priority,
          riskFlags,
          tags,
          notes: notes.trim(),
          unitId: unitId ?? null,
        });
      }

      onSaved();
    } catch (err) {
      console.error("[operate-capture] Save error:", err);
      // Fallback: try offline-first path
      try {
        await addCaptureOffline({
          file,
          projectId,
          projectSectionId,
          sectionSlug,
          createdBy: currentUserId,
          unitId: unitId ?? null,
        });
        onSaved();
      } catch (offlineErr) {
        console.error("[operate-capture] Offline fallback failed:", offlineErr);
      }
    } finally {
      setSaving(false);
    }
  }, [
    addToLast, lastFinding, file, projectId, projectSectionId, sectionSlug,
    currentUserId, unitId, category, location, priority, riskFlags, tags, notes, onSaved,
  ]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-surface-primary rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto animate-slide-up">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-edge-tertiary rounded-full" />
        </div>

        <div className="px-4 pb-6 space-y-4">
          {/* Photo preview */}
          <div className="relative w-full h-40 rounded-xl overflow-hidden bg-surface-tertiary">
            <img
              src={previewUrl}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Add to last toggle */}
          {lastFinding && (
            <button
              type="button"
              onClick={() => setAddToLast(!addToLast)}
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
                <p className="text-sm font-medium">{t("inspection.capture.addToLast")}</p>
                <p className="text-xs text-content-quaternary truncate">
                  {lastFinding.title || lastFinding.location || "—"}
                </p>
              </div>
              {addToLast && (
                <svg className="w-5 h-5 ml-auto text-brand-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          )}

          {/* Show form fields only when NOT adding to last */}
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

              {/* Tags (operational) */}
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
                  className="w-full px-3 py-2 text-sm border border-edge-secondary rounded-lg bg-surface-primary text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
                  placeholder={t("inspection.capture.notes")}
                />
              </div>
            </>
          )}

          {/* Save button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t("common.saving")}
              </span>
            ) : (
              t("inspection.capture.save")
            )}
          </button>
        </div>
      </div>
    </>
  );
}
