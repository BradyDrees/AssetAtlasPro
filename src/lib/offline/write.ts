"use client";

import type { Table } from "dexie";
import { offlineDB, type QueueAction, type SyncQueueItem } from "./db";

export const MAX_RETRIES = 3;

/** Generate a UUID using the Web Crypto API (works offline). */
export function localUUID(): string {
  return crypto.randomUUID();
}

/** Push a mutation onto the sync queue and return the queue-item id. */
export async function enqueue(
  action: QueueAction,
  payload: Record<string, unknown>,
  dependsOn?: string[]
): Promise<string> {
  const id = localUUID();
  const now = Date.now();

  const item: SyncQueueItem = {
    id,
    action,
    payload,
    dependsOn,
    status: "pending",
    retryCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await offlineDB.syncQueue.add(item);
  return id;
}

/** Return count of pending / failed items in queue. */
export async function pendingCount(): Promise<number> {
  return offlineDB.syncQueue
    .where("status")
    .anyOf(["pending", "failed"])
    .count();
}

/** Count items that have exhausted retries and are stuck. */
export async function stuckCount(): Promise<number> {
  return offlineDB.syncQueue
    .where("status")
    .anyOf(["pending", "failed"])
    .filter((item) => item.retryCount >= MAX_RETRIES)
    .count();
}

/**
 * Reset retry count for stuck items (and their dependents) so they
 * get another chance on the next sync run.
 */
export async function resetStuckItems(): Promise<number> {
  const stuck = await offlineDB.syncQueue
    .where("status")
    .anyOf(["pending", "failed"])
    .filter((item) => item.retryCount >= MAX_RETRIES)
    .toArray();

  if (stuck.length === 0) return 0;

  // Also find items that depend on stuck items (stalled dependency chain)
  const stuckIds = new Set(stuck.map((s) => s.id));
  const allPending = await offlineDB.syncQueue
    .where("status")
    .anyOf(["pending", "failed"])
    .toArray();

  const dependents = allPending.filter(
    (item) => item.dependsOn?.some((depId) => stuckIds.has(depId))
  );

  const toReset = [...stuck, ...dependents];
  const now = Date.now();

  await offlineDB.syncQueue.bulkUpdate(
    toReset.map((item) => ({
      key: item.id,
      changes: {
        retryCount: 0,
        status: "pending" as const,
        updatedAt: now,
      },
    }))
  );

  return toReset.length;
}

/** Mark a queue item as synced. */
export async function markSynced(id: string): Promise<void> {
  await offlineDB.syncQueue.update(id, {
    status: "synced",
    updatedAt: Date.now(),
  });
}

/** Mark a queue item as failed, incrementing retry count. */
export async function markFailed(
  id: string,
  error: string
): Promise<void> {
  const item = await offlineDB.syncQueue.get(id);
  if (!item) return;

  await offlineDB.syncQueue.update(id, {
    status: "failed",
    retryCount: item.retryCount + 1,
    lastError: error,
    updatedAt: Date.now(),
  });
}

/** Delete all synced items from the queue (cleanup). */
export async function purgeSynced(): Promise<number> {
  const queueDeleted = await offlineDB.syncQueue
    .where("status")
    .equals("synced")
    .delete();

  const staleDeleted = await evictSyncedStaleData();

  return queueDeleted + staleDeleted;
}

/**
 * Evict synced offline data older than 30 days from blob-heavy tables
 * (localCaptures, localNotePhotos, vendorPhotos) and lightweight tables
 * (localFindings, localNotes, localUnits, vendor tables).
 *
 * Safety: never deletes a record whose localId is referenced by any
 * unsynced (pending/failed) sync queue item.
 */
async function evictSyncedStaleData(): Promise<number> {
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - THIRTY_DAYS_MS;

  // 1. Collect all localIds referenced by unsynced queue items so we
  //    never delete data that still needs to sync.
  const unsyncedItems = await offlineDB.syncQueue
    .where("status")
    .anyOf(["pending", "failed", "syncing"])
    .toArray();

  const referencedIds = new Set<string>();
  for (const item of unsyncedItems) {
    const p = item.payload;
    // Capture references
    if (typeof p.captureLocalId === "string") referencedIds.add(p.captureLocalId);
    // Note photo references
    if (typeof p.photoLocalId === "string") referencedIds.add(p.photoLocalId);
    // Finding references
    if (typeof p.findingLocalId === "string") referencedIds.add(p.findingLocalId);
    // Note references
    if (typeof p.noteLocalId === "string") referencedIds.add(p.noteLocalId);
    // Unit references
    if (typeof p.unitLocalId === "string") referencedIds.add(p.unitLocalId);
    // Vendor photo references
    if (typeof p.vendorPhotoLocalId === "string") referencedIds.add(p.vendorPhotoLocalId);
    // Generic localId fallback (vendor WO/estimate/invoice actions)
    if (typeof p.localId === "string") referencedIds.add(p.localId);
  }

  // 2. Helper: delete synced rows older than cutoff, skipping referenced IDs.
  //    Uses a generic Dexie Table type — all offline tables share localId,
  //    syncStatus, and createdAt fields.
  async function evictTable(
    table: Table<{ localId: string; syncStatus: string; createdAt: number }, string>
  ): Promise<number> {
    const stale = await table
      .where("syncStatus")
      .equals("synced")
      .filter((row) => row.createdAt < cutoff && !referencedIds.has(row.localId))
      .primaryKeys();

    if (stale.length > 0) {
      await table.bulkDelete(stale as string[]);
    }
    return stale.length;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- safe: all tables share localId/syncStatus/createdAt
  type AnyOfflineTable = Table<{ localId: string; syncStatus: string; createdAt: number }, string>;

  // 3. Evict blob-heavy tables first (biggest storage wins)
  let total = 0;
  total += await evictTable(offlineDB.localCaptures as unknown as AnyOfflineTable);
  total += await evictTable(offlineDB.localNotePhotos as unknown as AnyOfflineTable);
  total += await evictTable(offlineDB.vendorPhotos as unknown as AnyOfflineTable);

  // 4. Evict lightweight synced data (findings, notes, units, vendor records)
  total += await evictTable(offlineDB.localFindings as unknown as AnyOfflineTable);
  total += await evictTable(offlineDB.localNotes as unknown as AnyOfflineTable);
  total += await evictTable(offlineDB.localUnits as unknown as AnyOfflineTable);
  total += await evictTable(offlineDB.vendorWorkOrders as unknown as AnyOfflineTable);
  total += await evictTable(offlineDB.vendorWoMaterials as unknown as AnyOfflineTable);
  total += await evictTable(offlineDB.vendorWoTimeEntries as unknown as AnyOfflineTable);
  total += await evictTable(offlineDB.vendorEstimates as unknown as AnyOfflineTable);
  total += await evictTable(offlineDB.vendorEstimateSections as unknown as AnyOfflineTable);
  total += await evictTable(offlineDB.vendorEstimateItems as unknown as AnyOfflineTable);
  total += await evictTable(offlineDB.vendorInvoices as unknown as AnyOfflineTable);
  total += await evictTable(offlineDB.vendorInvoiceItems as unknown as AnyOfflineTable);

  // TODO: pageSnapshots has no syncStatus — consider a separate TTL-based
  // eviction (e.g. delete snapshots older than 90 days) once snapshot usage
  // patterns are clearer.

  return total;
}

/**
 * Remove pending/failed queue items matching a filter.
 * Used by delete wrappers to cancel orphaned creates/updates
 * (e.g. user creates a finding offline then deletes it before syncing).
 */
export async function pruneQueue(
  filterFn: (item: SyncQueueItem) => boolean
): Promise<number> {
  const pending = await offlineDB.syncQueue
    .where("status")
    .anyOf(["pending", "failed"])
    .toArray();

  const toDelete = pending.filter(filterFn).map((item) => item.id);
  if (toDelete.length > 0) {
    await offlineDB.syncQueue.bulkDelete(toDelete);
  }
  return toDelete.length;
}
