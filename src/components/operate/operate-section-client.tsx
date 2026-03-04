"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { OperatePhotoStream } from "./operate-photo-stream";
import { OperateCaptureFlow } from "./operate-capture-flow";
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
 * Client wrapper that composes OperatePhotoStream + OperateCaptureFlow.
 * Manages the "last finding" state for the "Add to last" feature.
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

  // Track the most recent finding for "Add to last"
  const lastFinding = findings.length > 0 ? findings[findings.length - 1] : null;

  const handleCaptureSaved = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <>
      <OperatePhotoStream
        findings={findings}
        captures={captures}
        projectId={projectId}
        projectSectionId={projectSectionId}
      />

      <OperateCaptureFlow
        projectId={projectId}
        projectSectionId={projectSectionId}
        sectionSlug={sectionSlug}
        unitId={unitId}
        currentUserId={currentUserId}
        lastFinding={lastFinding}
        onCaptureSaved={handleCaptureSaved}
      />
    </>
  );
}
