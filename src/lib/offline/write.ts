"use client";

import { offlineDB, type QueueAction, type SyncQueueItem } from "./db";

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
