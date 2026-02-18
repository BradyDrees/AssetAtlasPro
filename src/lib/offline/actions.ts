"use client";

import { offlineDB } from "./db";
import { localUUID, enqueue, pruneQueue } from "./write";
import { compressPhoto } from "./photo-compress";

// ============================================
// Inspection Findings
// ============================================

/**
 * Create a finding locally and queue for sync.
 * Returns the local ID immediately.
 */
export async function createFindingOffline(params: {
  projectId: string;
  projectSectionId: string;
  checklistItemId?: string | null;
  unitId?: string | null;
  title: string;
  createdBy: string;
}): Promise<string> {
  const localId = localUUID();
  const now = Date.now();

  await offlineDB.localFindings.add({
    localId,
    projectId: params.projectId,
    projectSectionId: params.projectSectionId,
    checklistItemId: params.checklistItemId ?? null,
    unitId: params.unitId ?? null,
    notes: null,
    priority: null,
    createdBy: params.createdBy,
    createdAt: now,
    updatedAt: now,
    syncStatus: "pending",
  });

  await enqueue("FINDING_CREATE", {
    localId,
    projectId: params.projectId,
    projectSectionId: params.projectSectionId,
    checklistItemId: params.checklistItemId ?? null,
    unitId: params.unitId ?? null,
    title: params.title,
    createdBy: params.createdBy,
  });

  return localId;
}

/**
 * Update a finding field locally and queue for sync.
 */
export async function updateFindingOffline(params: {
  findingLocalId?: string;
  findingServerId?: string;
  projectId: string;
  projectSectionId: string;
  field: string;
  value: string | number | string[] | null;
}): Promise<void> {
  // Update local record if we have it
  if (params.findingLocalId) {
    await offlineDB.localFindings.update(params.findingLocalId, {
      [params.field === "priority" ? "priority" : "notes"]:
        params.field === "notes" ? (params.value as string) : params.value,
      updatedAt: Date.now(),
    });
  }

  await enqueue("FINDING_UPDATE", {
    findingLocalId: params.findingLocalId ?? null,
    findingServerId: params.findingServerId ?? null,
    projectId: params.projectId,
    projectSectionId: params.projectSectionId,
    field: params.field,
    value: params.value,
  });
}

// ============================================
// Inspection Captures (photos/videos)
// ============================================

/**
 * Store a capture locally (compressed) and queue for upload.
 * Returns the local ID immediately.
 */
export async function addCaptureOffline(params: {
  file: File;
  projectId: string;
  projectSectionId: string;
  sectionSlug: string;
  findingLocalId?: string;
  findingServerId?: string;
  unitId?: string | null;
  createdBy: string;
}): Promise<string> {
  const localId = localUUID();
  const now = Date.now();

  // Compress images before storing
  const blob = await compressPhoto(params.file);
  const mime = blob.type || params.file.type;
  const fileType = mime.startsWith("video/") ? "video" : "image";

  await offlineDB.localCaptures.add({
    localId,
    projectId: params.projectId,
    projectSectionId: params.projectSectionId,
    findingLocalId: params.findingLocalId,
    findingServerId: params.findingServerId,
    unitId: params.unitId ?? null,
    mime,
    blob,
    caption: null,
    fileType: fileType as "image" | "video",
    createdBy: params.createdBy,
    createdAt: now,
    syncStatus: "pending",
  });

  // The queue item references the localCapture — the sync manager
  // will read the blob from IndexedDB when it's time to upload.
  await enqueue(
    "CAPTURE_UPLOAD",
    {
      captureLocalId: localId,
      projectId: params.projectId,
      projectSectionId: params.projectSectionId,
      sectionSlug: params.sectionSlug,
      findingLocalId: params.findingLocalId ?? null,
      findingServerId: params.findingServerId ?? null,
      unitId: params.unitId ?? null,
      createdBy: params.createdBy,
    },
    // If this capture belongs to a locally-created finding, it depends on that finding syncing first
    params.findingLocalId && !params.findingServerId
      ? [params.findingLocalId]
      : undefined
  );

  return localId;
}

// ============================================
// Unit-level checks (inspection unit fields)
// ============================================

export async function saveUnitCheckOffline(params: {
  unitId: string;
  projectId: string;
  projectSectionId: string;
  field: string;
  value: string | string[] | number | boolean | null;
}): Promise<void> {
  await enqueue("UNIT_CHECK_SAVE", {
    unitId: params.unitId,
    projectId: params.projectId,
    projectSectionId: params.projectSectionId,
    field: params.field,
    value: params.value,
  });
}

export async function saveUnitGradeOffline(params: {
  unitId: string;
  projectId: string;
  projectSectionId: string;
  field: string;
  value: string | number | boolean | null;
}): Promise<void> {
  await enqueue("UNIT_GRADE_SAVE", {
    unitId: params.unitId,
    projectId: params.projectId,
    projectSectionId: params.projectSectionId,
    field: params.field,
    value: params.value,
  });
}

// ============================================
// Unit Turn Notes + Note Photos
// ============================================

export async function createNoteOffline(params: {
  batchId: string;
  unitId: string;
  categoryId: string;
  text: string;
  createdBy: string;
}): Promise<string> {
  const localId = localUUID();
  const now = Date.now();

  await offlineDB.localNotes.add({
    localId,
    batchId: params.batchId,
    unitId: params.unitId,
    categoryId: params.categoryId,
    text: params.text,
    createdBy: params.createdBy,
    createdAt: now,
    syncStatus: "pending",
  });

  await enqueue("NOTE_CREATE", {
    localId,
    batchId: params.batchId,
    unitId: params.unitId,
    categoryId: params.categoryId,
    text: params.text,
    createdBy: params.createdBy,
  });

  return localId;
}

export async function uploadNotePhotoOffline(params: {
  file: File;
  noteLocalId: string;
  noteServerId?: string;
  batchId: string;
  unitId: string;
  createdBy: string;
}): Promise<string> {
  const localId = localUUID();
  const now = Date.now();

  const blob = await compressPhoto(params.file);
  const mime = blob.type || params.file.type;
  const fileType = mime.startsWith("video/") ? "video" : "image";

  await offlineDB.localNotePhotos.add({
    localId,
    noteLocalId: params.noteLocalId,
    noteServerId: params.noteServerId,
    batchId: params.batchId,
    unitId: params.unitId,
    mime,
    blob,
    fileType: fileType as "image" | "video",
    createdBy: params.createdBy,
    createdAt: now,
    syncStatus: "pending",
  });

  await enqueue(
    "NOTE_PHOTO_UPLOAD",
    {
      photoLocalId: localId,
      noteLocalId: params.noteLocalId,
      noteServerId: params.noteServerId ?? null,
      batchId: params.batchId,
      unitId: params.unitId,
      createdBy: params.createdBy,
    },
    // Depends on the note being synced first if it's local-only
    params.noteLocalId && !params.noteServerId
      ? [params.noteLocalId]
      : undefined
  );

  return localId;
}

// ============================================
// Delete Operations (with cascade / queue pruning)
// ============================================

/**
 * Delete a finding offline.
 * - If local-only: remove from IndexedDB + prune related queue items + delete local captures.
 * - If server entity: enqueue FINDING_DELETE for sync.
 */
export async function deleteFindingOffline(params: {
  findingId: string;
  projectId: string;
  projectSectionId: string;
}): Promise<void> {
  // Check if this is a local-only finding
  const localFinding = await offlineDB.localFindings.get(params.findingId);

  if (localFinding) {
    // Local-only: cascade delete everything related
    await offlineDB.localFindings.delete(params.findingId);

    // Delete local captures that belong to this finding
    const relatedCaptures = await offlineDB.localCaptures
      .where("findingLocalId")
      .equals(params.findingId)
      .toArray();
    if (relatedCaptures.length > 0) {
      await offlineDB.localCaptures.bulkDelete(
        relatedCaptures.map((c) => c.localId)
      );
    }

    // Prune all queue items related to this finding
    await pruneQueue((item) => {
      const p = item.payload;
      return (
        (p.localId === params.findingId) ||
        (p.findingLocalId === params.findingId) ||
        (p.captureLocalId !== undefined &&
          relatedCaptures.some((c) => c.localId === p.captureLocalId))
      );
    });

    return; // No server delete needed
  }

  // Server entity: queue for deletion during sync
  await enqueue("FINDING_DELETE", {
    findingId: params.findingId,
    projectId: params.projectId,
    projectSectionId: params.projectSectionId,
  });
}

/**
 * Delete a capture offline.
 * - If local-only: remove blob + prune queue item.
 * - If server entity: enqueue CAPTURE_DELETE.
 */
export async function deleteCaptureOffline(params: {
  captureId: string;
  imagePath: string;
  projectId: string;
  projectSectionId: string;
}): Promise<void> {
  const localCapture = await offlineDB.localCaptures.get(params.captureId);

  if (localCapture) {
    await offlineDB.localCaptures.delete(params.captureId);
    await pruneQueue((item) => item.payload.captureLocalId === params.captureId);
    return;
  }

  await enqueue("CAPTURE_DELETE", {
    captureId: params.captureId,
    imagePath: params.imagePath,
    projectId: params.projectId,
    projectSectionId: params.projectSectionId,
  });
}

/** Toggle section N/A offline — simple enqueue. */
export async function toggleSectionNAOffline(params: {
  projectSectionId: string;
  projectId: string;
  isNa: boolean;
}): Promise<void> {
  await enqueue("SECTION_NA_TOGGLE", {
    projectSectionId: params.projectSectionId,
    projectId: params.projectId,
    isNa: params.isNa,
  });
}

// ============================================
// Unit Turn Field Updates (offline)
// ============================================

export async function updateUnitItemStatusOffline(params: {
  itemId: string;
  status: string | null;
  batchId: string;
  unitId: string;
}): Promise<void> {
  await enqueue("UNIT_ITEM_STATUS", {
    itemId: params.itemId,
    status: params.status,
    batchId: params.batchId,
    unitId: params.unitId,
  });
}

export async function updateUnitItemNAOffline(params: {
  itemId: string;
  isNA: boolean;
  batchId: string;
  unitId: string;
}): Promise<void> {
  await enqueue("UNIT_ITEM_NA", {
    itemId: params.itemId,
    isNA: params.isNA,
    batchId: params.batchId,
    unitId: params.unitId,
  });
}

export async function updatePaintScopeOffline(params: {
  itemId: string;
  scope: string | null;
  batchId: string;
  unitId: string;
}): Promise<void> {
  await enqueue("PAINT_SCOPE", {
    itemId: params.itemId,
    scope: params.scope,
    batchId: params.batchId,
    unitId: params.unitId,
  });
}

// ============================================
// Unit Turn Delete Operations (offline)
// ============================================

/**
 * Delete a note offline.
 * - If local-only: remove note + photos + prune queue.
 * - If server entity: enqueue NOTE_DELETE.
 */
export async function deleteNoteOffline(params: {
  noteId: string;
  batchId: string;
  unitId: string;
}): Promise<void> {
  const localNote = await offlineDB.localNotes.get(params.noteId);

  if (localNote) {
    await offlineDB.localNotes.delete(params.noteId);

    // Cascade: delete local photos for this note
    const relatedPhotos = await offlineDB.localNotePhotos
      .where("noteLocalId")
      .equals(params.noteId)
      .toArray();
    if (relatedPhotos.length > 0) {
      await offlineDB.localNotePhotos.bulkDelete(
        relatedPhotos.map((p) => p.localId)
      );
    }

    // Prune queue items for this note and its photos
    await pruneQueue((item) => {
      const p = item.payload;
      return (
        p.localId === params.noteId ||
        p.noteLocalId === params.noteId ||
        relatedPhotos.some((rp) => rp.localId === p.photoLocalId)
      );
    });

    return;
  }

  await enqueue("NOTE_DELETE", {
    noteId: params.noteId,
    batchId: params.batchId,
    unitId: params.unitId,
  });
}

/**
 * Delete a note photo offline.
 * - If local-only: remove blob + prune queue.
 * - If server entity: enqueue NOTE_PHOTO_DELETE.
 */
export async function deleteNotePhotoOffline(params: {
  photoId: string;
  imagePath: string;
  batchId: string;
  unitId: string;
}): Promise<void> {
  const localPhoto = await offlineDB.localNotePhotos.get(params.photoId);

  if (localPhoto) {
    await offlineDB.localNotePhotos.delete(params.photoId);
    await pruneQueue((item) => item.payload.photoLocalId === params.photoId);
    return;
  }

  await enqueue("NOTE_PHOTO_DELETE", {
    photoId: params.photoId,
    imagePath: params.imagePath,
    batchId: params.batchId,
    unitId: params.unitId,
  });
}

// ============================================
// Inspection Units (offline CRUD)
// ============================================

/**
 * Create an inspection unit locally and queue for sync.
 * Returns the local ID immediately.
 */
export async function createInspectionUnitOffline(params: {
  projectId: string;
  projectSectionId: string;
  building: string;
  unitNumber: string;
  createdBy: string;
}): Promise<string> {
  const localId = localUUID();
  const now = Date.now();

  await offlineDB.localUnits.add({
    localId,
    projectId: params.projectId,
    projectSectionId: params.projectSectionId,
    building: params.building.trim(),
    unitNumber: params.unitNumber.trim(),
    occupancyStatus: "UNKNOWN",
    walkStatus: "NOT_STARTED",
    rentReady: null,
    daysVacant: null,
    turnUnitLocalId: null,
    notes: "",
    createdBy: params.createdBy,
    createdAt: now,
    syncStatus: "pending",
    isDeletedPending: false,
  });

  await enqueue("UNIT_CREATE", {
    localId,
    projectId: params.projectId,
    projectSectionId: params.projectSectionId,
    building: params.building.trim(),
    unitNumber: params.unitNumber.trim(),
    createdBy: params.createdBy,
  });

  return localId;
}

/**
 * Delete an inspection unit offline.
 * - Local-only (no serverId): hard-delete + cascade + prune full queue chain
 * - Server entity (has serverId): soft-delete, enqueue UNIT_DELETE
 */
export async function deleteInspectionUnitOffline(params: {
  unitId: string;
  projectId: string;
  projectSectionId: string;
}): Promise<void> {
  const localUnit = await offlineDB.localUnits.get(params.unitId);

  if (localUnit && !localUnit.serverId) {
    // Local-only: hard-delete + cascade everything
    const unitLocalId = params.unitId;
    const turnLocalId = localUnit.turnUnitLocalId;

    await offlineDB.localUnits.delete(unitLocalId);

    // Cascade: delete local captures referencing this unit
    const relatedCaptures = await offlineDB.localCaptures
      .where("projectId")
      .equals(params.projectId)
      .filter((c) => c.unitId === unitLocalId)
      .toArray();
    if (relatedCaptures.length > 0) {
      await offlineDB.localCaptures.bulkDelete(
        relatedCaptures.map((c) => c.localId)
      );
    }

    // Cascade: delete local findings referencing this unit
    const relatedFindings = await offlineDB.localFindings
      .where("projectId")
      .equals(params.projectId)
      .filter((f) => f.unitId === unitLocalId)
      .toArray();
    if (relatedFindings.length > 0) {
      await offlineDB.localFindings.bulkDelete(
        relatedFindings.map((f) => f.localId)
      );
    }

    // Cascade: delete local notes/photos tied to this unit's turn checklist
    if (turnLocalId) {
      const relatedNotes = await offlineDB.localNotes
        .where("unitId")
        .equals(turnLocalId)
        .toArray();
      if (relatedNotes.length > 0) {
        for (const note of relatedNotes) {
          const notePhotos = await offlineDB.localNotePhotos
            .where("noteLocalId")
            .equals(note.localId)
            .toArray();
          if (notePhotos.length > 0) {
            await offlineDB.localNotePhotos.bulkDelete(
              notePhotos.map((p) => p.localId)
            );
          }
        }
        await offlineDB.localNotes.bulkDelete(
          relatedNotes.map((n) => n.localId)
        );
      }
    }

    // Prune ALL queue items referencing this unit (create→edit→provision→delete chain)
    await pruneQueue((item) => {
      const p = item.payload;
      return (
        p.localId === unitLocalId ||
        p.unitId === unitLocalId ||
        p.inspectionUnitId === unitLocalId ||
        (turnLocalId && p.localTurnUnitId === turnLocalId) ||
        relatedCaptures.some((c) => c.localId === p.captureLocalId) ||
        relatedFindings.some(
          (f) => f.localId === p.localId || f.localId === p.findingLocalId
        )
      );
    });

    return;
  }

  if (localUnit && localUnit.serverId) {
    // Server entity: soft-delete — hide from UI, keep until sync confirms
    await offlineDB.localUnits.update(params.unitId, {
      isDeletedPending: true,
    });
  }

  // Enqueue server deletion
  await enqueue("UNIT_DELETE", {
    unitId: localUnit?.serverId ?? params.unitId,
    projectId: params.projectId,
    projectSectionId: params.projectSectionId,
  });
}

/**
 * Provision a turn checklist offline.
 * Generates a local turnUnitId, stores on the local unit record,
 * and enqueues for server provisioning.
 * Returns the local turnUnitId.
 */
export async function provisionTurnChecklistOffline(params: {
  inspectionUnitId: string;
  projectId: string;
  building: string;
  unitNumber: string;
  createdBy: string;
}): Promise<string> {
  const localTurnUnitId = localUUID();

  // Update the local unit record with the turn unit reference
  const localUnit = await offlineDB.localUnits.get(params.inspectionUnitId);
  if (localUnit) {
    await offlineDB.localUnits.update(params.inspectionUnitId, {
      turnUnitLocalId: localTurnUnitId,
    });
  }

  // Enqueue — depends on UNIT_CREATE if the unit is local-only
  const dependsOn = localUnit && !localUnit.serverId
    ? [params.inspectionUnitId]
    : undefined;

  await enqueue(
    "PROVISION_TURN_CHECKLIST",
    {
      localTurnUnitId,
      inspectionUnitId: params.inspectionUnitId,
      projectId: params.projectId,
      building: params.building,
      unitNumber: params.unitNumber,
      createdBy: params.createdBy,
    },
    dependsOn
  );

  return localTurnUnitId;
}

// ============================================
// Helpers
// ============================================

/** Get all locally-stored units for a given section (excludes soft-deleted). */
export async function getLocalUnits(projectSectionId: string) {
  return offlineDB.localUnits
    .where("projectSectionId")
    .equals(projectSectionId)
    .filter((u) => !u.isDeletedPending)
    .toArray();
}

/** Get all locally-stored findings for a given section. */
export async function getLocalFindings(projectSectionId: string) {
  return offlineDB.localFindings
    .where("projectSectionId")
    .equals(projectSectionId)
    .toArray();
}

/** Get all locally-stored captures for a given finding. */
export async function getLocalCaptures(findingLocalId: string) {
  return offlineDB.localCaptures
    .where("findingLocalId")
    .equals(findingLocalId)
    .toArray();
}

/** Get all pending captures for a project (for displaying in UI). */
export async function getLocalCapturesForProject(projectId: string) {
  return offlineDB.localCaptures
    .where("projectId")
    .equals(projectId)
    .toArray();
}

/** Get locally-stored captures for a specific unit (no finding link). */
export async function getLocalCapturesForUnit(unitId: string) {
  return offlineDB.localCaptures
    .where("projectId")
    .above("")
    .filter((c) => c.unitId === unitId && !c.findingLocalId && !c.findingServerId)
    .toArray();
}

/** Get locally-stored captures for a specific finding (server or local). */
export async function getLocalCapturesForFinding(findingId: string) {
  return offlineDB.localCaptures
    .filter(
      (c) => c.findingLocalId === findingId || c.findingServerId === findingId
    )
    .toArray();
}

/**
 * Create an object URL from a local capture's blob for display in <img>.
 * Caller must revoke the URL when done (URL.revokeObjectURL).
 */
export function createLocalCaptureUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}
