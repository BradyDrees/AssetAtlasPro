"use client";

import { useState, useEffect, useRef } from "react";
import { useOffline } from "@/components/offline-provider";
import {
  getLocalFindings,
  getLocalCaptures,
  createLocalCaptureUrl,
} from "./actions";
import type { LocalFinding, LocalCapture } from "./db";

/**
 * Returns locally-stored findings for a project section.
 * Only returns data when isFieldMode is true.
 * Automatically refreshes when localRevision changes.
 */
export function useLocalFindings(projectSectionId: string): LocalFinding[] {
  const { isFieldMode, localRevision } = useOffline();
  const [localFindings, setLocalFindings] = useState<LocalFinding[]>([]);

  useEffect(() => {
    if (!isFieldMode) {
      setLocalFindings([]);
      return;
    }
    getLocalFindings(projectSectionId).then(setLocalFindings);
  }, [isFieldMode, projectSectionId, localRevision]);

  return localFindings;
}

/**
 * Returns locally-stored captures for a given finding local ID
 * with pre-generated Object URLs (memoized to avoid flicker).
 */
export function useLocalCaptures(
  findingLocalId: string | undefined
): { captures: LocalCapture[]; urlMap: Map<string, string> } {
  const { isFieldMode, localRevision } = useOffline();
  const [localCaptures, setLocalCaptures] = useState<LocalCapture[]>([]);
  const urlMapRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!isFieldMode || !findingLocalId) {
      setLocalCaptures([]);
      return;
    }
    getLocalCaptures(findingLocalId).then(setLocalCaptures);
  }, [isFieldMode, findingLocalId, localRevision]);

  // Generate Object URLs only for new captures (memoized)
  useEffect(() => {
    const currentMap = urlMapRef.current;
    const newIds = new Set(localCaptures.map((c) => c.localId));

    // Add new URLs
    for (const cap of localCaptures) {
      if (!currentMap.has(cap.localId)) {
        currentMap.set(cap.localId, createLocalCaptureUrl(cap.blob));
      }
    }

    // Revoke stale URLs
    for (const [id, url] of currentMap) {
      if (!newIds.has(id)) {
        URL.revokeObjectURL(url);
        currentMap.delete(id);
      }
    }

    return () => {
      // Clean up all URLs on unmount
      for (const url of currentMap.values()) {
        URL.revokeObjectURL(url);
      }
      currentMap.clear();
    };
  }, [localCaptures]);

  return { captures: localCaptures, urlMap: urlMapRef.current };
}
