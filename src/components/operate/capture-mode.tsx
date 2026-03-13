"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CaptureModeTagForm, type CaptureFormValues } from "./capture-mode-tag-form";
import { compressAndUpload } from "@/lib/offline/upload-to-storage";
import { addCaptureOffline } from "@/lib/offline/actions";
import { createQuickFinding, addCaptureToFinding } from "@/app/actions/inspection-findings";
import type { InspectionFinding } from "@/lib/inspection-types";

type Phase = "idle" | "tagging" | "saving";
type FlashMessage = "saved" | "offlineSaved" | null;

interface CaptureModeProps {
  projectId: string;
  projectSectionId: string;
  sectionSlug: string;
  unitId?: string | null;
  currentUserId: string;
  onExit: () => void;
}

/**
 * PWA Capture Mode — owns the full lifecycle loop.
 *
 * State machine: idle → tagging → saving → (loop back to camera)
 * Parent manages: file selection, upload kickoff, awaiting upload,
 * createQuickFinding/addCaptureToFinding, camera reopen, exit.
 * Tag form only collects and returns form values.
 */
export function CaptureMode({
  projectId,
  projectSectionId,
  sectionSlug,
  unitId,
  currentUserId,
  onExit,
}: CaptureModeProps) {
  const t = useTranslations();
  const router = useRouter();

  const fileRef = useRef<HTMLInputElement>(null);

  // State machine
  const [phase, setPhase] = useState<Phase>("idle");
  const [isUploading, setIsUploading] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const uploadPromiseRef = useRef<Promise<string> | null>(null);
  const [lastSessionFinding, setLastSessionFinding] = useState<InspectionFinding | null>(null);
  const [flashMessage, setFlashMessage] = useState<FlashMessage>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  /**
   * Open the camera. Must be called from a user gesture context
   * (Start Capture Mode button, Save button, or Skip button).
   */
  const startCapture = useCallback(() => {
    if (fileRef.current) {
      fileRef.current.value = "";
      fileRef.current.click();
    }
  }, []);

  /**
   * File selected from camera — kick off background upload + show tag form.
   */
  const onFileSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setSaveError(null);
      setCurrentFile(file);
      setIsUploading(true);
      setPhase("tagging");

      // Start background upload — store Promise for later
      const promise = compressAndUpload(file, projectId, projectSectionId);
      uploadPromiseRef.current = promise;

      promise
        .then(() => setIsUploading(false))
        .catch(() => setIsUploading(false));
    },
    [projectId, projectSectionId]
  );

  /**
   * Cleanup between cycles — clear input, reset state.
   * objectURL is managed by the tag form component.
   */
  const cleanup = useCallback(() => {
    if (fileRef.current) fileRef.current.value = "";
    setCurrentFile(null);
    uploadPromiseRef.current = null;
    setIsUploading(false);
    setSaveError(null);
  }, []);

  /**
   * Save handler — parent owns persistence.
   * Called from tag form's onSave callback with structured form values.
   */
  const handleSave = useCallback(
    async (values: CaptureFormValues) => {
      if (!currentFile) return;
      setPhase("saving");
      setSaveError(null);

      try {
        // Await upload if still in progress
        const storagePath = await uploadPromiseRef.current!;

        if (values.addToLast && lastSessionFinding) {
          // Attach to existing finding
          await addCaptureToFinding({
            projectId,
            projectSectionId,
            findingId: lastSessionFinding.id,
            storagePath,
            unitId: unitId ?? null,
          });
          // Don't update lastSessionFinding — it's the same finding
        } else {
          // Create new finding with metadata
          const findingId = await createQuickFinding({
            projectId,
            projectSectionId,
            storagePath,
            category: values.category,
            location: values.location,
            priority: values.priority,
            riskFlags: values.riskFlags,
            tags: values.tags,
            notes: values.notes,
            unitId: unitId ?? null,
          });

          // Only server-confirmed findings become lastSessionFinding
          setLastSessionFinding({
            id: findingId,
            title: values.category,
            location: values.location,
          } as InspectionFinding);
        }

        // Success flash → cleanup → reopen camera
        setFlashMessage("saved");
        router.refresh();
        setTimeout(() => {
          setFlashMessage(null);
          cleanup();
          setPhase("idle");
          // Chain camera reopen (this setTimeout runs synchronously from user gesture chain)
          startCapture();
        }, 400);
      } catch (err) {
        // Determine if this is a network error or server validation error
        const isNetworkError =
          !navigator.onLine ||
          (err instanceof Error &&
            (err.message.includes("fetch") ||
              err.message.includes("network") ||
              err.message.includes("Failed to fetch") ||
              err.message.includes("NetworkError")));

        if (isNetworkError) {
          // Network failure → offline fallback with full metadata
          try {
            await addCaptureOffline({
              file: currentFile,
              projectId,
              projectSectionId,
              sectionSlug,
              unitId: unitId ?? null,
              createdBy: currentUserId,
              metadata: values.addToLast && lastSessionFinding
                ? {
                    category: values.category,
                    location: values.location,
                    notes: values.notes,
                    priority: values.priority,
                    riskFlags: values.riskFlags,
                    tags: values.tags,
                    targetFindingId: lastSessionFinding.id,
                  }
                : {
                    category: values.category,
                    location: values.location,
                    notes: values.notes,
                    priority: values.priority,
                    riskFlags: values.riskFlags,
                    tags: values.tags,
                  },
            });

            // Offline success flash → cleanup → reopen
            setFlashMessage("offlineSaved");
            setTimeout(() => {
              setFlashMessage(null);
              cleanup();
              setPhase("idle");
              startCapture();
            }, 800);
          } catch (offlineErr) {
            console.error("[capture-mode] Offline fallback failed:", offlineErr);
            setSaveError(t("inspection.captureMode.saveError"));
            setPhase("tagging");
          }
        } else {
          // Server validation error → show error, stay on form
          console.error("[capture-mode] Save error:", err);
          setSaveError(t("inspection.captureMode.saveError"));
          setPhase("tagging");
        }
      }
    },
    [
      currentFile,
      lastSessionFinding,
      projectId,
      projectSectionId,
      sectionSlug,
      unitId,
      currentUserId,
      router,
      cleanup,
      startCapture,
      t,
    ]
  );

  /**
   * Skip — discard photo, continue loop.
   */
  const handleSkip = useCallback(() => {
    cleanup();
    setPhase("idle");
    startCapture();
  }, [cleanup, startCapture]);

  /**
   * Cancel — dismiss tag form, stop loop, return to idle.
   */
  const handleCancel = useCallback(() => {
    cleanup();
    setPhase("idle");
  }, [cleanup]);

  /**
   * Exit capture mode entirely.
   */
  const handleExit = useCallback(() => {
    cleanup();
    setPhase("idle");
    onExit();
  }, [cleanup, onExit]);

  return (
    <div className="relative">
      {/* Hidden file input for camera */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFileSelected}
        className="hidden"
      />

      {/* Exit button — always visible */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-content-primary flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          {t("inspection.captureMode.start")}
        </h3>
        <button
          type="button"
          onClick={handleExit}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-content-secondary hover:text-content-primary bg-surface-secondary hover:bg-surface-tertiary rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          {t("inspection.captureMode.exit")}
        </button>
      </div>

      {/* Flash message overlay */}
      {flashMessage && (
        <div className="mb-3 px-4 py-2.5 rounded-xl text-center text-sm font-medium animate-fade-in">
          {flashMessage === "saved" ? (
            <div className="bg-green-50 text-green-700 border border-green-200 rounded-xl px-4 py-2.5">
              {t("inspection.captureMode.saved")}
            </div>
          ) : (
            <div className="bg-amber-50 text-amber-700 border border-amber-200 rounded-xl px-4 py-2.5">
              {t("inspection.captureMode.offlineSaved")}
            </div>
          )}
        </div>
      )}

      {/* Save error */}
      {saveError && (
        <div className="mb-3 px-4 py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-center text-sm">
          {saveError}
        </div>
      )}

      {/* Idle state — prompt to open camera */}
      {phase === "idle" && !flashMessage && (
        <div className="text-center py-8">
          <button
            type="button"
            onClick={startCapture}
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {t("inspection.captureMode.start")}
          </button>
        </div>
      )}

      {/* Tagging / Saving state — show tag form */}
      {(phase === "tagging" || phase === "saving") && currentFile && (
        <CaptureModeTagForm
          file={currentFile}
          isUploading={isUploading}
          lastSessionFinding={lastSessionFinding}
          onSave={handleSave}
          onSkip={handleSkip}
          onCancel={handleCancel}
          isSaving={phase === "saving"}
        />
      )}
    </div>
  );
}
