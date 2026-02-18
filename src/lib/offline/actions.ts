"use client";

import { offlineDB } from "./db";
import { localUUID, enqueue } from "./write";
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
// Helpers
// ============================================

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

/**
 * Create an object URL from a local capture's blob for display in <img>.
 * Caller must revoke the URL when done (URL.revokeObjectURL).
 */
export function createLocalCaptureUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}
