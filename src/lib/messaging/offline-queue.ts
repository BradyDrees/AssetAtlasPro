"use client";

import { offlineDB } from "@/lib/offline/db";
import type { QueueAction } from "@/lib/offline/db";

/**
 * Offline message queue.
 * Stores outgoing messages in Dexie when offline, syncs when back online.
 *
 * Uses the existing sync queue infrastructure (QueueAction + SyncQueueItem).
 * Messages are enqueued with action "MESSAGE_SEND" and synced by the sync manager.
 */

// Extend QueueAction — the sync-manager handles unknown actions gracefully
const MESSAGE_SEND_ACTION = "MESSAGE_SEND" as QueueAction;

interface OfflineMessagePayload {
  thread_id: string;
  body: string;
  attachments?: Array<{
    url: string;
    type: string;
    name: string;
    size: number;
  }>;
  /** Temporary local ID for optimistic display */
  local_id: string;
  /** Timestamp for display ordering */
  created_at: string;
  sender_id: string;
}

/**
 * Queue a message for sending when back online.
 * Returns a local_id for optimistic display.
 */
export async function queueOfflineMessage(
  params: Omit<OfflineMessagePayload, "local_id" | "created_at"> & {
    sender_id: string;
  }
): Promise<{ local_id: string; created_at: string }> {
  const local_id = `msg_local_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const created_at = new Date().toISOString();

  await offlineDB.syncQueue.add({
    id: local_id,
    action: MESSAGE_SEND_ACTION,
    payload: {
      ...params,
      local_id,
      created_at,
    },
    status: "pending",
    retryCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  return { local_id, created_at };
}

/**
 * Get all pending offline messages for a thread.
 * Used for optimistic display in the conversation view.
 */
export async function getPendingOfflineMessages(
  threadId: string
): Promise<OfflineMessagePayload[]> {
  const items = await offlineDB.syncQueue
    .where("action")
    .equals(MESSAGE_SEND_ACTION)
    .filter(
      (item) =>
        item.status !== "synced" &&
        (item.payload as Record<string, unknown>).thread_id === threadId
    )
    .toArray();

  return items.map((item) => item.payload as unknown as OfflineMessagePayload);
}

/**
 * Remove a synced message from the offline queue.
 */
export async function markOfflineMessageSynced(
  localId: string
): Promise<void> {
  await offlineDB.syncQueue.update(localId, {
    status: "synced",
    updatedAt: Date.now(),
  });
}

/**
 * Check if there are any pending offline messages.
 */
export async function hasPendingMessages(): Promise<boolean> {
  const count = await offlineDB.syncQueue
    .where("action")
    .equals(MESSAGE_SEND_ACTION)
    .filter((item) => item.status === "pending" || item.status === "failed")
    .count();

  return count > 0;
}
