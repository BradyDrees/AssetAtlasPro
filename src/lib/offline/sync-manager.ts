"use client";

import { offlineDB, type SyncQueueItem, type QueueAction } from "./db";
import { markSynced, markFailed, purgeSynced } from "./write";

type ProgressCallback = (synced: number, total: number) => void;

// Map local IDs → server IDs as they're resolved during sync
const idMap = new Map<string, string>();

const MAX_RETRIES = 3;

/**
 * Process the entire sync queue, oldest-first.
 * Resolves dependencies (e.g. finding must sync before its captures).
 * Returns the number of successfully synced items.
 */
export async function processSyncQueue(
  onProgress?: ProgressCallback
): Promise<number> {
  const pending = await offlineDB.syncQueue
    .where("status")
    .anyOf(["pending", "failed"])
    .filter((item) => item.retryCount < MAX_RETRIES)
    .sortBy("createdAt");

  const total = pending.length;
  let synced = 0;

  for (const item of pending) {
    // Skip if dependencies haven't been resolved yet
    if (item.dependsOn?.length) {
      const allResolved = item.dependsOn.every((depId) => idMap.has(depId));
      if (!allResolved) continue;
    }

    try {
      await offlineDB.syncQueue.update(item.id, {
        status: "syncing",
        updatedAt: Date.now(),
      });

      await syncItem(item);

      await markSynced(item.id);
      synced++;
      onProgress?.(synced, total);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await markFailed(item.id, msg);
    }
  }

  // Clean up completed items
  await purgeSynced();

  return synced;
}

/**
 * Dispatch a single queue item to the appropriate server action.
 */
async function syncItem(item: SyncQueueItem): Promise<void> {
  const handlers: Record<QueueAction, (p: Record<string, unknown>) => Promise<void>> = {
    FINDING_CREATE: syncFindingCreate,
    FINDING_UPDATE: syncFindingUpdate,
    CAPTURE_UPLOAD: syncCaptureUpload,
    UNIT_CHECK_SAVE: syncUnitCheckSave,
    UNIT_GRADE_SAVE: syncUnitGradeSave,
    NOTE_CREATE: syncNoteCreate,
    NOTE_PHOTO_UPLOAD: syncNotePhotoUpload,
  };

  const handler = handlers[item.action];
  if (!handler) throw new Error(`Unknown action: ${item.action}`);

  await handler(item.payload);
}

// ============================================
// Individual sync handlers
// ============================================

async function syncFindingCreate(payload: Record<string, unknown>): Promise<void> {
  const { createInspectionFinding } = await import("@/app/actions/inspection-findings");

  const serverId = await createInspectionFinding({
    project_id: payload.projectId as string,
    project_section_id: payload.projectSectionId as string,
    checklist_item_id: (payload.checklistItemId as string) || null,
    unit_id: (payload.unitId as string) || null,
    title: payload.title as string,
  });

  // Map local ID → server ID for dependent items
  const localId = payload.localId as string;
  idMap.set(localId, serverId);

  // Update local finding with server ID
  await offlineDB.localFindings.update(localId, {
    serverId,
    syncStatus: "synced",
  });
}

async function syncFindingUpdate(payload: Record<string, unknown>): Promise<void> {
  const { updateInspectionFindingField } = await import("@/app/actions/inspection-findings");

  // Resolve finding ID: use server ID if available, or look up from idMap
  let findingId = payload.findingServerId as string | null;
  if (!findingId && payload.findingLocalId) {
    findingId = idMap.get(payload.findingLocalId as string) ?? null;
  }
  if (!findingId) throw new Error("Cannot resolve finding server ID");

  await updateInspectionFindingField(
    findingId,
    payload.projectId as string,
    payload.projectSectionId as string,
    payload.field as string,
    payload.value as string | number | string[] | null
  );
}

async function syncCaptureUpload(payload: Record<string, unknown>): Promise<void> {
  const { uploadInspectionCapture } = await import("@/app/actions/inspection-captures");

  const captureLocalId = payload.captureLocalId as string;
  const capture = await offlineDB.localCaptures.get(captureLocalId);
  if (!capture) throw new Error("Local capture not found");

  // Resolve finding ID from dependency map
  let findingId = payload.findingServerId as string | null;
  if (!findingId && payload.findingLocalId) {
    findingId = idMap.get(payload.findingLocalId as string) ?? null;
  }

  // Build FormData for the server action
  const ext = capture.mime.split("/")[1] || "jpg";
  const file = new File([capture.blob], `offline-${captureLocalId}.${ext}`, {
    type: capture.mime,
  });

  const formData = new FormData();
  formData.append("file", file);
  formData.append("projectSectionId", payload.projectSectionId as string);
  formData.append("projectId", payload.projectId as string);
  formData.append("sectionSlug", payload.sectionSlug as string);
  if (findingId) formData.append("findingId", findingId);
  if (payload.unitId) formData.append("unitId", payload.unitId as string);

  await uploadInspectionCapture(formData);

  // Mark local capture as synced
  await offlineDB.localCaptures.update(captureLocalId, {
    syncStatus: "synced",
  });
}

async function syncUnitCheckSave(payload: Record<string, unknown>): Promise<void> {
  const { updateInspectionUnitField } = await import("@/app/actions/inspection-units");

  await updateInspectionUnitField(
    payload.unitId as string,
    payload.projectId as string,
    payload.projectSectionId as string,
    payload.field as string,
    payload.value as string | string[] | number | boolean | null
  );
}

async function syncUnitGradeSave(payload: Record<string, unknown>): Promise<void> {
  const { updateInspectionUnitField } = await import("@/app/actions/inspection-units");

  await updateInspectionUnitField(
    payload.unitId as string,
    payload.projectId as string,
    payload.projectSectionId as string,
    payload.field as string,
    payload.value as string | number | boolean | null
  );
}

async function syncNoteCreate(payload: Record<string, unknown>): Promise<void> {
  const { createNote } = await import("@/app/actions/unit-turns");

  const result = await createNote(
    {
      unit_id: payload.unitId as string,
      category_id: payload.categoryId as string,
      text: payload.text as string,
    },
    payload.batchId as string
  );

  if (result.error) {
    throw new Error(result.error);
  }

  // Map local note ID → server ID
  const localId = payload.localId as string;
  if (result.id) {
    idMap.set(localId, result.id);
  }

  await offlineDB.localNotes.update(localId, {
    serverId: result.id,
    syncStatus: "synced",
  });
}

async function syncNotePhotoUpload(payload: Record<string, unknown>): Promise<void> {
  const { uploadNotePhoto } = await import("@/app/actions/unit-turns");

  const photoLocalId = payload.photoLocalId as string;
  const photo = await offlineDB.localNotePhotos.get(photoLocalId);
  if (!photo) throw new Error("Local note photo not found");

  // Resolve note server ID
  let noteId = payload.noteServerId as string | null;
  if (!noteId && payload.noteLocalId) {
    noteId = idMap.get(payload.noteLocalId as string) ?? null;
  }
  if (!noteId) throw new Error("Cannot resolve note server ID");

  const ext = photo.mime.split("/")[1] || "jpg";
  const file = new File([photo.blob], `offline-note-${photoLocalId}.${ext}`, {
    type: photo.mime,
  });

  const formData = new FormData();
  formData.append("file", file);
  formData.append("noteId", noteId);
  formData.append("batchId", payload.batchId as string);
  formData.append("unitId", payload.unitId as string);

  await uploadNotePhoto(formData);

  await offlineDB.localNotePhotos.update(photoLocalId, {
    syncStatus: "synced",
  });
}
