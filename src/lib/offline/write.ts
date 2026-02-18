"use client";

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
  return offlineDB.syncQueue.where("status").equals("synced").delete();
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
