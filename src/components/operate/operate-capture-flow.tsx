"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { OperateCaptureSheet } from "./operate-capture-sheet";
import type { InspectionFinding } from "@/lib/inspection-types";

interface OperateCaptureFlowProps {
  projectId: string;
  projectSectionId: string;
  sectionSlug: string;
  unitId?: string | null;
  currentUserId: string;
  lastFinding?: InspectionFinding | null;
  onCaptureSaved: () => void;
}

/**
 * Floating Action Button that opens the camera, then slides up
 * a tagging sheet for the captured photo.
 */
export function OperateCaptureFlow({
  projectId,
  projectSectionId,
  sectionSlug,
  unitId,
  currentUserId,
  lastFinding,
  onCaptureSaved,
}: OperateCaptureFlowProps) {
  const t = useTranslations();
  const fileRef = useRef<HTMLInputElement>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleCapture = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setCapturedFile(file);
      setSheetOpen(true);
      // Reset input so same file can be captured again
      e.target.value = "";
    },
    []
  );

  const handleSheetClose = useCallback(() => {
    setSheetOpen(false);
    setCapturedFile(null);
  }, []);

  const handleSaved = useCallback(() => {
    setSheetOpen(false);
    setCapturedFile(null);
    onCaptureSaved();
  }, [onCaptureSaved]);

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCapture}
      />

      {/* FAB — camera button, fixed bottom-right */}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="fixed bottom-6 right-6 z-40 w-16 h-16 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-full shadow-lg flex items-center justify-center transition-all"
        aria-label={t("inspection.capture.addPhoto")}
      >
        <svg
          className="w-7 h-7"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      {/* Bottom Sheet */}
      {sheetOpen && capturedFile && (
        <OperateCaptureSheet
          file={capturedFile}
          projectId={projectId}
          projectSectionId={projectSectionId}
          sectionSlug={sectionSlug}
          unitId={unitId}
          currentUserId={currentUserId}
          lastFinding={lastFinding}
          onClose={handleSheetClose}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
