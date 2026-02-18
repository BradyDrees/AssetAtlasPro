"use client";

import { useEffect } from "react";
import { savePageSnapshot } from "@/lib/offline/page-snapshot";

interface SnapshotSyncProps {
  pageId: string;
  pageType: "section" | "unit";
  data: Record<string, unknown>;
  /** Stable fingerprint — only triggers Dexie write when this changes */
  dataVersion: string;
}

/**
 * Invisible client component that silently snapshots server-rendered page data
 * to Dexie on every successful render. Best-effort — never blocks rendering.
 */
export function SnapshotSync({
  pageId,
  pageType,
  data,
  dataVersion,
}: SnapshotSyncProps) {
  useEffect(() => {
    savePageSnapshot(pageId, pageType, data, dataVersion).catch(console.warn);
  }, [pageId, dataVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
