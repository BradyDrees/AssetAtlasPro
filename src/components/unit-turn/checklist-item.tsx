"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  updateUnitItemStatus,
  updateUnitItemNA,
  updatePaintScope,
  createNote,
  deleteNote,
  uploadNotePhoto,
  deleteNotePhoto,
} from "@/app/actions/unit-turns";
import { useFieldRouter } from "@/lib/offline/use-field-router";
import { useOffline } from "@/components/offline-provider";
import {
  updateUnitItemStatusOffline,
  updateUnitItemNAOffline,
  updatePaintScopeOffline,
  createNoteOffline,
  deleteNoteOffline,
  uploadNotePhotoOffline,
  deleteNotePhotoOffline,
} from "@/lib/offline/actions";
import {
  ITEM_STATUS_OPTIONS,
  ITEM_STATUS_LABELS,
  PAINT_SCOPE_OPTIONS,
  PAINT_SCOPE_LABELS,
} from "@/lib/unit-turn-constants";
import type {
  UnitTurnUnitItemWithTemplate,
  UnitTurnNoteWithPhotos,
  CategoryType,
} from "@/lib/unit-turn-types";
import { toTitleCase } from "@/lib/utils";

interface ChecklistItemProps {
  item: UnitTurnUnitItemWithTemplate;
  notes: UnitTurnNoteWithPhotos[];
  categoryType: CategoryType;
  batchId: string;
  unitId: string;
  categoryId: string;
  supabaseUrl: string;
  currentUserId?: string;
}

export function ChecklistItem({
  item,
  notes,
  categoryType,
  batchId,
  unitId,
  categoryId,
  supabaseUrl,
  currentUserId,
}: ChecklistItemProps) {
  const t = useTranslations();
  const router = useFieldRouter();
  const { isFieldMode, refreshPending } = useOffline();
  const [status, setStatus] = useState(item.status);
  const [isNA, setIsNA] = useState(item.is_na);
  const [paintScope, setPaintScope] = useState(item.paint_scope);
  const [saving, setSaving] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [uploadingDirect, setUploadingDirect] = useState(false);

  const isPaint = categoryType === "paint";
  const isCleaning = categoryType === "cleaning";

  const handleStatusChange = useCallback(
    async (newStatus: string | null) => {
      const val = newStatus === status ? null : newStatus;
      setStatus(val as any);
      setSaving(true);
      if (isFieldMode) {
        await updateUnitItemStatusOffline({ itemId: item.id, status: val, batchId, unitId });
        await refreshPending();
      } else {
        await updateUnitItemStatus(item.id, val, batchId, unitId);
      }
      setSaving(false);
    },
    [item.id, status, batchId, unitId, isFieldMode, refreshPending]
  );

  const handleNAToggle = useCallback(async () => {
    const newNA = !isNA;
    setIsNA(newNA);
    if (newNA) {
      setStatus(null);
      setPaintScope(null);
    }
    setSaving(true);
    if (isFieldMode) {
      await updateUnitItemNAOffline({ itemId: item.id, isNA: newNA, batchId, unitId });
      await refreshPending();
    } else {
      await updateUnitItemNA(item.id, newNA, batchId, unitId);
    }
    setSaving(false);
  }, [item.id, isNA, batchId, unitId, isFieldMode, refreshPending]);

  const handlePaintScopeChange = useCallback(
    async (scope: string | null) => {
      const val = scope === paintScope ? null : scope;
      setPaintScope(val as any);
      setSaving(true);
      if (isFieldMode) {
        await updatePaintScopeOffline({ itemId: item.id, scope: val, batchId, unitId });
        await refreshPending();
      } else {
        await updatePaintScope(item.id, val, batchId, unitId);
      }
      setSaving(false);
    },
    [item.id, paintScope, batchId, unitId, isFieldMode, refreshPending]
  );

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setAddingNote(true);
    if (isFieldMode) {
      await createNoteOffline({
        batchId,
        unitId,
        categoryId,
        text: noteText.trim(),
        createdBy: currentUserId ?? "",
      });
      await refreshPending();
    } else {
      await createNote(
        { unit_id: unitId, item_id: item.id, category_id: categoryId, text: noteText.trim() },
        batchId
      );
    }
    setNoteText("");
    setShowAddNote(false);
    setAddingNote(false);
    router.refresh();
  };

  const handleDeleteNote = async (noteId: string) => {
    if (isFieldMode) {
      await deleteNoteOffline({ noteId, batchId, unitId });
      await refreshPending();
    } else {
      await deleteNote(noteId, batchId, unitId);
    }
    router.refresh();
  };

  const handleUploadPhoto = async (noteId: string, file: File) => {
    if (isFieldMode) {
      await uploadNotePhotoOffline({
        file,
        noteLocalId: noteId,
        batchId,
        unitId,
        createdBy: currentUserId ?? "",
      });
      await refreshPending();
    } else {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("noteId", noteId);
      formData.set("batchId", batchId);
      formData.set("unitId", unitId);
      await uploadNotePhoto(formData);
    }
    router.refresh();
  };

  // Direct photo: auto-creates a note with empty text, attaches the photo
  const handleDirectPhoto = async (file: File) => {
    setUploadingDirect(true);
    if (isFieldMode) {
      // Create local note, then attach photo
      const noteLocalId = await createNoteOffline({
        batchId,
        unitId,
        categoryId,
        text: "",
        createdBy: currentUserId ?? "",
      });
      await uploadNotePhotoOffline({
        file,
        noteLocalId,
        batchId,
        unitId,
        createdBy: currentUserId ?? "",
      });
      await refreshPending();
    } else {
      const result = await createNote(
        { unit_id: unitId, item_id: item.id, category_id: categoryId, text: "" },
        batchId
      );
      if (result.id) {
        const formData = new FormData();
        formData.set("file", file);
        formData.set("noteId", result.id);
        formData.set("batchId", batchId);
        formData.set("unitId", unitId);
        await uploadNotePhoto(formData);
      }
    }
    setUploadingDirect(false);
    router.refresh();
  };

  const handleDeletePhoto = async (photoId: string, imagePath: string) => {
    if (isFieldMode) {
      await deleteNotePhotoOffline({ photoId, imagePath, batchId, unitId });
      await refreshPending();
    } else {
      await deleteNotePhoto(photoId, imagePath, batchId, unitId);
    }
    router.refresh();
  };

  const itemNotes = notes.filter((n) => n.item_id === item.id);

  return (
    <div id={`item-${item.id}`} data-assessed={status != null || isNA || (isPaint && paintScope != null) ? "true" : "false"} className={`border-b border-edge-tertiary last:border-b-0 py-3 px-4 transition-all ${isNA ? "opacity-50" : ""}`}>
      {/* Item Name */}
      <div className="mb-2">
        <span className="text-sm text-content-primary">
          {toTitleCase(item.template_item?.name ?? t("unitTurn.unknownItem"))}
        </span>
      </div>

      {/* Status Buttons + N/A on same row */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {!isNA && (
          <>
            {isPaint
              ? PAINT_SCOPE_OPTIONS.map((scope) => {
                  const info = PAINT_SCOPE_LABELS[scope];
                  const isActive = paintScope === scope;
                  return (
                    <button
                      key={scope}
                      onClick={() => handlePaintScopeChange(scope)}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                        isActive
                          ? info.activeBg + " font-medium " + info.color
                          : "bg-surface-primary text-content-tertiary border-edge-secondary hover:bg-surface-secondary"
                      }`}
                    >
                      {t(`unitTurn.paintScope.${scope === "touch_up" ? "touchUp" : "fullPaint"}`)}
                    </button>
                  );
                })
              : ITEM_STATUS_OPTIONS.map((st) => {
                  if (isCleaning && st !== "good") return null;
                  const info = ITEM_STATUS_LABELS[st];
                  const isActive = status === st;
                  const label = isCleaning && st === "good" ? t("unitTurn.done") : t(`unitTurn.itemStatus.${st}`);
                  return (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(st)}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                        isActive
                          ? info.activeBg + " font-medium " + info.color
                          : "bg-surface-primary text-content-tertiary border-edge-secondary hover:bg-surface-secondary"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
          </>
        )}
        <button
          onClick={handleNAToggle}
          className={`px-3 py-2 text-sm rounded-md border transition-colors ${
            isNA
              ? "bg-gray-200 border-gray-400 text-content-secondary font-medium"
              : "bg-surface-primary border-edge-secondary text-content-muted hover:bg-surface-secondary"
          }`}
        >
          N/A
        </button>
      </div>

      {/* Saving indicator */}
      {saving && <span className="text-xs text-content-muted">{t("common.saving")}</span>}

      {/* Notes + Photos — always available (not required) */}
      {!isNA && (
        <div className="mt-2 ml-2 space-y-2">
          {/* Existing notes */}
          {itemNotes.map((note) => (
            <div key={note.id} className="bg-surface-secondary rounded-lg p-2.5 text-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="text-content-secondary flex-1">{note.text || <span className="text-content-muted italic">{t("unitTurn.photoOnly")}</span>}</p>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="w-8 h-8 flex items-center justify-center text-sm text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full flex-shrink-0"
                >
                  ×
                </button>
              </div>
              {/* Photos */}
              {note.photos && note.photos.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {note.photos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      {photo.file_type === "video" ? (
                        <video
                          src={`${supabaseUrl}/storage/v1/object/public/dd-captures/${photo.image_path}`}
                          className="w-16 h-16 object-cover rounded"
                          preload="metadata"
                          muted
                          playsInline
                        />
                      ) : (
                        <img
                          src={`${supabaseUrl}/storage/v1/object/public/dd-captures/${photo.image_path}`}
                          alt=""
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <button
                        onClick={() => handleDeletePhoto(photo.id, photo.image_path)}
                        className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {/* Add photo to this note */}
              <label className="inline-flex items-center gap-1 mt-1.5 text-xs text-content-muted hover:text-content-tertiary cursor-pointer">
                <input
                  type="file"
                  accept="image/*,video/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadPhoto(note.id, file);
                    e.target.value = "";
                  }}
                />
                {t("unitTurn.addPhotoVideo")}
              </label>
            </div>
          ))}

          {/* Action buttons — always visible */}
          <div className="flex items-center gap-3">
            {/* Add Note */}
            {!showAddNote ? (
              <button
                onClick={() => setShowAddNote(true)}
                className="text-xs text-brand-600 hover:text-brand-700"
              >
                {t("unitTurn.addNote")}
              </button>
            ) : (
              <div className="flex gap-2 flex-1">
                <input
                  type="text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder={t("unitTurn.notePlaceholder")}
                  className="flex-1 px-2 py-1 text-xs border border-edge-secondary rounded focus:outline-none focus:ring-1 focus:ring-brand-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && noteText.trim()) handleAddNote();
                    if (e.key === "Escape") { setShowAddNote(false); setNoteText(""); }
                  }}
                />
                <button
                  onClick={handleAddNote}
                  disabled={!noteText.trim() || addingNote}
                  className="px-3 py-2 text-xs bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50"
                >
                  {addingNote ? "..." : t("common.add")}
                </button>
                <button
                  onClick={() => { setShowAddNote(false); setNoteText(""); }}
                  className="w-8 h-8 flex items-center justify-center text-sm text-content-muted hover:text-content-tertiary"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Take Photo — always visible */}
            {!showAddNote && (
              <label className={`text-xs text-blue-600 hover:text-blue-700 cursor-pointer ${uploadingDirect ? "opacity-50" : ""}`}>
                <input
                  type="file"
                  accept="image/*,video/*"
                  capture="environment"
                  className="hidden"
                  disabled={uploadingDirect}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleDirectPhoto(file);
                    e.target.value = "";
                  }}
                />
                {uploadingDirect ? t("unitTurn.uploading") : t("unitTurn.takePhotoVideo")}
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
