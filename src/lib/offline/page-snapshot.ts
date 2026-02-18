"use client";

import { offlineDB, type PageSnapshot } from "./db";

const SCHEMA_VERSION = 1;

/**
 * Save (upsert) a page snapshot to Dexie.
 * Skips the write if the existing snapshot has the same dataVersion.
 */
export async function savePageSnapshot(
  pageId: string,
  pageType: "section" | "unit",
  data: Record<string, unknown>,
  dataVersion: string
): Promise<void> {
  // Check if snapshot already exists with the same dataVersion
  const existing = await offlineDB.pageSnapshots.get(pageId);
  if (existing && existing.dataVersion === dataVersion) {
    return; // Data unchanged — skip write
  }

  await offlineDB.pageSnapshots.put({
    pageId,
    pageType,
    data,
    dataVersion,
    snapshotAt: Date.now(),
    schemaVersion: SCHEMA_VERSION,
  });
}

/**
 * Retrieve a page snapshot by ID.
 * Returns the typed data or undefined if not found.
 */
export async function getPageSnapshot<T = Record<string, unknown>>(
  pageId: string
): Promise<{ data: T; snapshotAt: number } | undefined> {
  const snapshot = await offlineDB.pageSnapshots.get(pageId);
  if (!snapshot) return undefined;
  return {
    data: snapshot.data as T,
    snapshotAt: snapshot.snapshotAt,
  };
}

/**
 * Clear all page snapshots for a given project.
 * Matches any snapshot whose pageId contains the projectId.
 */
export async function clearProjectSnapshots(
  projectId: string
): Promise<number> {
  const all = await offlineDB.pageSnapshots.toArray();
  const toDelete = all
    .filter((s) => s.pageId.includes(projectId))
    .map((s) => s.pageId);
  await offlineDB.pageSnapshots.bulkDelete(toDelete);
  return toDelete.length;
}
