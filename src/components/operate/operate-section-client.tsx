"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePwaStandalone } from "@/hooks/use-pwa-standalone";
import { OperatePhotoStream } from "./operate-photo-stream";
import { OperateCaptureFlow } from "./operate-capture-flow";
import { CaptureModeEntry } from "./capture-mode-entry";
import { CaptureMode } from "./capture-mode";
import type { InspectionFinding, InspectionCapture } from "@/lib/inspection-types";

interface OperateSectionClientProps {
  findings: InspectionFinding[];
  captures: InspectionCapture[];
  projectId: string;
  projectSectionId: string;
  sectionSlug: string;
  currentUserId: string;
  unitId?: string | null;
}

/**
 * Client wrapper that composes OperatePhotoStream + capture UI.
 * PWA standalone → CaptureMode (entry button + capture loop).
 * Desktop/browser → OperateCaptureFlow (FAB).
 */
export function OperateSectionClient({
  findings,
  captures,
  projectId,
  projectSectionId,
  sectionSlug,
  currentUserId,
  unitId,
}: OperateSectionClientProps) {
  const router = useRouter();
  const isPwa = usePwaStandalone();
  const [captureActive, setCaptureActive] = useState(false);

  // Track the most recent finding for "Add to last" (desktop FAB flow)
  const lastFinding = findings.length > 0 ? findings[findings.length - 1] : null;

  const handleCaptureSaved = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <>
      {/* PWA capture mode */}
      {isPwa && (
        <div className="mb-4">
          {!captureActive ? (
            <CaptureModeEntry onStart={() => setCaptureActive(true)} />
          ) : (
            <CaptureMode
              projectId={projectId}
              projectSectionId={projectSectionId}
              sectionSlug={sectionSlug}
              unitId={unitId}
              currentUserId={currentUserId}
              onExit={() => setCaptureActive(false)}
            />
          )}
        </div>
      )}

      <OperatePhotoStream
        findings={findings}
        captures={captures}
        projectId={projectId}
        projectSectionId={projectSectionId}
      />

      {/* Desktop: keep existing FAB */}
      {!isPwa && (
        <OperateCaptureFlow
          projectId={projectId}
          projectSectionId={projectSectionId}
          sectionSlug={sectionSlug}
          unitId={unitId}
          currentUserId={currentUserId}
          lastFinding={lastFinding}
          onCaptureSaved={handleCaptureSaved}
        />
      )}
    </>
  );
}
