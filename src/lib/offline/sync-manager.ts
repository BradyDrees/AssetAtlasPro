"use client";

import { offlineDB, type SyncQueueItem, type QueueAction } from "./db";
import { markSynced, markFailed, purgeSynced } from "./write";

type ProgressCallback = (synced: number, total: number) => void;

// Map local IDs → server IDs as they're resolved during sync
// Covers both unit IDs and turn_unit IDs
const idMap = new Map<string, string>();

const MAX_RETRIES = 3;

/** Resolve a payload ID from the idMap (local → server). Falls back to the original value. */
function resolveId(value: unknown): string {
  const id = value as string;
  if (!id) return id;
  return idMap.get(id) ?? id;
}

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
    FINDING_DELETE: syncFindingDelete,
    CAPTURE_UPLOAD: syncCaptureUpload,
    CAPTURE_DELETE: syncCaptureDelete,
    UNIT_CHECK_SAVE: syncUnitCheckSave,
    UNIT_GRADE_SAVE: syncUnitGradeSave,
    NOTE_CREATE: syncNoteCreate,
    NOTE_PHOTO_UPLOAD: syncNotePhotoUpload,
    NOTE_DELETE: syncNoteDelete,
    NOTE_PHOTO_DELETE: syncNotePhotoDelete,
    SECTION_NA_TOGGLE: syncSectionNAToggle,
    UNIT_ITEM_STATUS: syncUnitItemStatus,
    UNIT_ITEM_NA: syncUnitItemNA,
    PAINT_SCOPE: syncPaintScope,
    UNIT_CREATE: syncUnitCreate,
    UNIT_DELETE: syncUnitDelete,
    PROVISION_TURN_CHECKLIST: syncProvisionTurnChecklist,
  };

  const handler = handlers[item.action];
  if (!handler) throw new Error(`Unknown action: ${item.action}`);

  await handler(item.payload);
}

// ============================================
// Inspection Unit CRUD handlers (NEW)
// ============================================

async function syncUnitCreate(payload: Record<string, unknown>): Promise<void> {
  const { createInspectionUnit } = await import("@/app/actions/inspection-units");

  const serverId = await createInspectionUnit({
    project_id: payload.projectId as string,
    project_section_id: payload.projectSectionId as string,
    building: payload.building as string,
    unit_number: payload.unitNumber as string,
  });

  // Map local unit ID → server unit ID
  const localId = payload.localId as string;
  idMap.set(localId, serverId);

  // Update local unit with server ID
  await offlineDB.localUnits.update(localId, {
    serverId,
    syncStatus: "synced",
  });
}

async function syncUnitDelete(payload: Record<string, unknown>): Promise<void> {
  const { deleteInspectionUnit } = await import("@/app/actions/inspection-units");

  const unitId = resolveId(payload.unitId);
  await deleteInspectionUnit(
    unitId,
    payload.projectId as string,
    payload.projectSectionId as string
  );

  // Hard-delete the local row now that server deletion is confirmed
  // Try to find local record by serverId match
  const locals = await offlineDB.localUnits
    .where("projectId")
    .equals(payload.projectId as string)
    .filter((u) => u.serverId === unitId || u.localId === unitId)
    .toArray();
  for (const lu of locals) {
    await offlineDB.localUnits.delete(lu.localId);
  }
}

async function syncProvisionTurnChecklist(payload: Record<string, unknown>): Promise<void> {
  const { provisionTurnChecklist } = await import("@/app/actions/inspection-units");

  // Resolve inspection unit ID — may be a local ID that synced earlier
  const inspectionUnitId = resolveId(payload.inspectionUnitId);

  const result = await provisionTurnChecklist(
    inspectionUnitId,
    payload.projectId as string,
    payload.building as string,
    payload.unitNumber as string
  );

  if (result.error) {
    throw new Error(result.error);
  }

  // Map local turn_unit_id → server turn_unit_id
  const localTurnUnitId = payload.localTurnUnitId as string;
  if (result.turnUnitId) {
    idMap.set(localTurnUnitId, result.turnUnitId);
  }
}

// ============================================
// Finding sync handlers
// ============================================

async function syncFindingCreate(payload: Record<string, unknown>): Promise<void> {
  const { createInspectionFinding } = await import("@/app/actions/inspection-findings");

  // Resolve unitId — may be a local unit ID
  const unitId = payload.unitId ? resolveId(payload.unitId) : null;

  const serverId = await createInspectionFinding({
    project_id: payload.projectId as string,
    project_section_id: payload.projectSectionId as string,
    checklist_item_id: (payload.checklistItemId as string) || null,
    unit_id: unitId || null,
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

async function syncFindingDelete(payload: Record<string, unknown>): Promise<void> {
  const { deleteInspectionFinding } = await import("@/app/actions/inspection-findings");
  await deleteInspectionFinding(
    resolveId(payload.findingId),
    payload.projectId as string,
    payload.projectSectionId as string
  );
}

// ============================================
// Capture sync handlers
// ============================================

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

  // Resolve unit ID from idMap
  const unitId = payload.unitId ? resolveId(payload.unitId) : null;

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
  if (unitId) formData.append("unitId", unitId);

  await uploadInspectionCapture(formData);

  // Mark local capture as synced
  await offlineDB.localCaptures.update(captureLocalId, {
    syncStatus: "synced",
  });
}

async function syncCaptureDelete(payload: Record<string, unknown>): Promise<void> {
  const { deleteInspectionCapture } = await import("@/app/actions/inspection-captures");
  await deleteInspectionCapture(
    payload.captureId as string,
    payload.imagePath as string,
    payload.projectId as string,
    payload.projectSectionId as string
  );
}

// ============================================
// Inspection Unit field save handlers
// ============================================

async function syncUnitCheckSave(payload: Record<string, unknown>): Promise<void> {
  const { updateInspectionUnitField } = await import("@/app/actions/inspection-units");

  await updateInspectionUnitField(
    resolveId(payload.unitId),
    payload.projectId as string,
    payload.projectSectionId as string,
    payload.field as string,
    payload.value as string | string[] | number | boolean | null
  );
}

async function syncUnitGradeSave(payload: Record<string, unknown>): Promise<void> {
  const { updateInspectionUnitField } = await import("@/app/actions/inspection-units");

  await updateInspectionUnitField(
    resolveId(payload.unitId),
    payload.projectId as string,
    payload.projectSectionId as string,
    payload.field as string,
    payload.value as string | number | boolean | null
  );
}

// ============================================
// Section toggle handler
// ============================================

async function syncSectionNAToggle(payload: Record<string, unknown>): Promise<void> {
  const { toggleInspectionSectionNA } = await import("@/app/actions/inspections");
  await toggleInspectionSectionNA(
    payload.projectSectionId as string,
    payload.projectId as string,
    payload.isNa as boolean
  );
}

// ============================================
// Unit Turn sync handlers
// ============================================

async function syncNoteCreate(payload: Record<string, unknown>): Promise<void> {
  const { createNote } = await import("@/app/actions/unit-turns");

  const result = await createNote(
    {
      unit_id: resolveId(payload.unitId),
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
  formData.append("unitId", resolveId(payload.unitId));

  await uploadNotePhoto(formData);

  await offlineDB.localNotePhotos.update(photoLocalId, {
    syncStatus: "synced",
  });
}

async function syncUnitItemStatus(payload: Record<string, unknown>): Promise<void> {
  const { updateUnitItemStatus } = await import("@/app/actions/unit-turns");
  await updateUnitItemStatus(
    payload.itemId as string,
    payload.status as string | null,
    payload.batchId as string,
    resolveId(payload.unitId)
  );
}

async function syncUnitItemNA(payload: Record<string, unknown>): Promise<void> {
  const { updateUnitItemNA } = await import("@/app/actions/unit-turns");
  await updateUnitItemNA(
    payload.itemId as string,
    payload.isNA as boolean,
    payload.batchId as string,
    resolveId(payload.unitId)
  );
}

async function syncPaintScope(payload: Record<string, unknown>): Promise<void> {
  const { updatePaintScope } = await import("@/app/actions/unit-turns");
  await updatePaintScope(
    payload.itemId as string,
    payload.scope as string | null,
    payload.batchId as string,
    resolveId(payload.unitId)
  );
}

async function syncNoteDelete(payload: Record<string, unknown>): Promise<void> {
  const { deleteNote } = await import("@/app/actions/unit-turns");
  await deleteNote(
    payload.noteId as string,
    payload.batchId as string,
    resolveId(payload.unitId)
  );
}

async function syncNotePhotoDelete(payload: Record<string, unknown>): Promise<void> {
  const { deleteNotePhoto } = await import("@/app/actions/unit-turns");
  await deleteNotePhoto(
    payload.photoId as string,
    payload.imagePath as string,
    payload.batchId as string,
    resolveId(payload.unitId)
  );
}
