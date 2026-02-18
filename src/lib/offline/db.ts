import Dexie, { type Table } from "dexie";

// ============================================
// Types
// ============================================

export type SyncStatus = "pending" | "syncing" | "failed" | "synced";

export type QueueAction =
  | "FINDING_CREATE"
  | "FINDING_UPDATE"
  | "FINDING_DELETE"
  | "CAPTURE_UPLOAD"
  | "CAPTURE_DELETE"
  | "UNIT_CHECK_SAVE"
  | "UNIT_GRADE_SAVE"
  | "NOTE_CREATE"
  | "NOTE_PHOTO_UPLOAD"
  | "NOTE_DELETE"
  | "NOTE_PHOTO_DELETE"
  | "SECTION_NA_TOGGLE"
  | "UNIT_ITEM_STATUS"
  | "UNIT_ITEM_NA"
  | "PAINT_SCOPE";

export interface SyncQueueItem {
  id: string;
  action: QueueAction;
  payload: Record<string, unknown>;
  dependsOn?: string[];
  status: SyncStatus;
  retryCount: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
}

export interface LocalFinding {
  localId: string;
  serverId?: string;
  projectId: string;
  projectSectionId: string;
  checklistItemId?: string | null;
  unitId?: string | null;
  priority?: number | null;
  notes?: string | null;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  syncStatus: SyncStatus;
}

export interface LocalCapture {
  localId: string;
  serverId?: string;
  projectId: string;
  projectSectionId: string;
  findingLocalId?: string;
  findingServerId?: string;
  unitId?: string | null;
  mime: string;
  blob: Blob;
  caption?: string | null;
  fileType: "image" | "video";
  createdBy: string;
  createdAt: number;
  syncStatus: SyncStatus;
}

export interface LocalNote {
  localId: string;
  serverId?: string;
  batchId: string;
  unitId: string;
  categoryId: string;
  text: string;
  createdBy: string;
  createdAt: number;
  syncStatus: SyncStatus;
}

export interface LocalNotePhoto {
  localId: string;
  serverId?: string;
  noteLocalId: string;
  noteServerId?: string;
  batchId: string;
  unitId: string;
  mime: string;
  blob: Blob;
  fileType: "image" | "video";
  createdBy: string;
  createdAt: number;
  syncStatus: SyncStatus;
}

export interface ProjectSnapshot {
  projectId: string;
  updatedAt: number;
  data: Record<string, unknown>;
}

// ============================================
// Database
// ============================================

export class OfflineDB extends Dexie {
  syncQueue!: Table<SyncQueueItem, string>;
  localFindings!: Table<LocalFinding, string>;
  localCaptures!: Table<LocalCapture, string>;
  localNotes!: Table<LocalNote, string>;
  localNotePhotos!: Table<LocalNotePhoto, string>;
  projectSnapshots!: Table<ProjectSnapshot, string>;

  constructor() {
    super("asset-atlas-offline");

    this.version(1).stores({
      syncQueue: "&id, status, createdAt",
      localFindings:
        "&localId, projectId, projectSectionId, syncStatus",
      localCaptures:
        "&localId, projectId, findingLocalId, syncStatus",
      localNotes: "&localId, batchId, unitId, syncStatus",
      localNotePhotos: "&localId, noteLocalId, syncStatus",
      projectSnapshots: "&projectId, updatedAt",
    });
  }
}

export const offlineDB = new OfflineDB();
