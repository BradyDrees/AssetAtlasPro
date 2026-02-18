"use client";

import { useState, useEffect, useRef } from "react";
import { useOffline } from "@/components/offline-provider";
import {
  getLocalFindings,
  getLocalCaptures,
  getLocalCapturesForUnit,
  getLocalCapturesForFinding,
  getLocalUnits,
  createLocalCaptureUrl,
} from "./actions";
import type { LocalFinding, LocalCapture, LocalUnit } from "./db";

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

/**
 * Returns locally-stored captures for a unit (unit-level, not linked to a finding).
 * Includes pre-generated Object URLs.
 */
export function useLocalUnitCaptures(
  unitId: string | undefined
): { captures: LocalCapture[]; urlMap: Map<string, string> } {
  const { isFieldMode, localRevision } = useOffline();
  const [localCaptures, setLocalCaptures] = useState<LocalCapture[]>([]);
  const urlMapRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!isFieldMode || !unitId) {
      setLocalCaptures([]);
      return;
    }
    getLocalCapturesForUnit(unitId).then(setLocalCaptures);
  }, [isFieldMode, unitId, localRevision]);

  useEffect(() => {
    const currentMap = urlMapRef.current;
    const newIds = new Set(localCaptures.map((c) => c.localId));
    for (const cap of localCaptures) {
      if (!currentMap.has(cap.localId)) {
        currentMap.set(cap.localId, createLocalCaptureUrl(cap.blob));
      }
    }
    for (const [id, url] of currentMap) {
      if (!newIds.has(id)) {
        URL.revokeObjectURL(url);
        currentMap.delete(id);
      }
    }
    return () => {
      for (const url of currentMap.values()) URL.revokeObjectURL(url);
      currentMap.clear();
    };
  }, [localCaptures]);

  return { captures: localCaptures, urlMap: urlMapRef.current };
}

/**
 * Returns locally-stored captures for a finding (by server ID or local ID).
 * Includes pre-generated Object URLs.
 */
export function useLocalFindingCaptures(
  findingId: string | undefined
): { captures: LocalCapture[]; urlMap: Map<string, string> } {
  const { isFieldMode, localRevision } = useOffline();
  const [localCaptures, setLocalCaptures] = useState<LocalCapture[]>([]);
  const urlMapRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!isFieldMode || !findingId) {
      setLocalCaptures([]);
      return;
    }
    getLocalCapturesForFinding(findingId).then(setLocalCaptures);
  }, [isFieldMode, findingId, localRevision]);

  useEffect(() => {
    const currentMap = urlMapRef.current;
    const newIds = new Set(localCaptures.map((c) => c.localId));
    for (const cap of localCaptures) {
      if (!currentMap.has(cap.localId)) {
        currentMap.set(cap.localId, createLocalCaptureUrl(cap.blob));
      }
    }
    for (const [id, url] of currentMap) {
      if (!newIds.has(id)) {
        URL.revokeObjectURL(url);
        currentMap.delete(id);
      }
    }
    return () => {
      for (const url of currentMap.values()) URL.revokeObjectURL(url);
      currentMap.clear();
    };
  }, [localCaptures]);

  return { captures: localCaptures, urlMap: urlMapRef.current };
}

/**
 * Returns locally-stored units for a project section.
 * Only returns data when isFieldMode is true.
 * Excludes soft-deleted units.
 */
export function useLocalUnits(projectSectionId: string): LocalUnit[] {
  const { isFieldMode, localRevision } = useOffline();
  const [localUnits, setLocalUnits] = useState<LocalUnit[]>([]);

  useEffect(() => {
    if (!isFieldMode) {
      setLocalUnits([]);
      return;
    }
    getLocalUnits(projectSectionId).then(setLocalUnits);
  }, [isFieldMode, projectSectionId, localRevision]);

  return localUnits;
}
