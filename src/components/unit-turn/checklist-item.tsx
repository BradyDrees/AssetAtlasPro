"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  updateUnitItemStatus,
  updateUnitItemNA,
  updatePaintScope,
  createNote,
  deleteNote,
  uploadNotePhoto,
  deleteNotePhoto,
} from "@/app/actions/unit-turns";
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

interface ChecklistItemProps {
  item: UnitTurnUnitItemWithTemplate;
  notes: UnitTurnNoteWithPhotos[];
  categoryType: CategoryType;
  batchId: string;
  unitId: string;
  categoryId: string;
  supabaseUrl: string;
}

export function ChecklistItem({
  item,
  notes,
  categoryType,
  batchId,
  unitId,
  categoryId,
  supabaseUrl,
}: ChecklistItemProps) {
  const router = useRouter();
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
      await updateUnitItemStatus(item.id, val, batchId, unitId);
      setSaving(false);
    },
    [item.id, status, batchId, unitId]
  );

  const handleNAToggle = useCallback(async () => {
    const newNA = !isNA;
    setIsNA(newNA);
    if (newNA) {
      setStatus(null);
      setPaintScope(null);
    }
    setSaving(true);
    await updateUnitItemNA(item.id, newNA, batchId, unitId);
    setSaving(false);
  }, [item.id, isNA, batchId, unitId]);

  const handlePaintScopeChange = useCallback(
    async (scope: string | null) => {
      const val = scope === paintScope ? null : scope;
      setPaintScope(val as any);
      setSaving(true);
      await updatePaintScope(item.id, val, batchId, unitId);
      setSaving(false);
    },
    [item.id, paintScope, batchId, unitId]
  );

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setAddingNote(true);
    await createNote(
      { unit_id: unitId, item_id: item.id, category_id: categoryId, text: noteText.trim() },
      batchId
    );
    setNoteText("");
    setShowAddNote(false);
    setAddingNote(false);
    router.refresh();
  };

  const handleDeleteNote = async (noteId: string) => {
    await deleteNote(noteId, batchId, unitId);
    router.refresh();
  };

  const handleUploadPhoto = async (noteId: string, file: File) => {
    const formData = new FormData();
    formData.set("file", file);
    formData.set("noteId", noteId);
    formData.set("batchId", batchId);
    formData.set("unitId", unitId);
    await uploadNotePhoto(formData);
    router.refresh();
  };

  // Direct photo: auto-creates a note with empty text, attaches the photo
  const handleDirectPhoto = async (file: File) => {
    setUploadingDirect(true);
    // Create a note first
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
    setUploadingDirect(false);
    router.refresh();
  };

  const handleDeletePhoto = async (photoId: string, imagePath: string) => {
    await deleteNotePhoto(photoId, imagePath, batchId, unitId);
    router.refresh();
  };

  const itemNotes = notes.filter((n) => n.item_id === item.id);

  return (
    <div className={`border-b border-gray-100 last:border-b-0 py-3 px-4 ${isNA ? "opacity-50" : ""}`}>
      {/* Item Name */}
      <div className="mb-2">
        <span className="text-sm text-gray-800">
          {item.template_item?.name ?? "Unknown Item"}
        </span>
      </div>

      {/* Status Buttons + N/A on same row */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
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
                      className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                        isActive
                          ? info.activeBg + " font-medium " + info.color
                          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {info.label}
                    </button>
                  );
                })
              : ITEM_STATUS_OPTIONS.map((st) => {
                  if (isCleaning && st !== "good") return null;
                  const info = ITEM_STATUS_LABELS[st];
                  const isActive = status === st;
                  const label = isCleaning && st === "good" ? "Done" : info.label;
                  return (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(st)}
                      className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                        isActive
                          ? info.activeBg + " font-medium " + info.color
                          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
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
          className={`px-3 py-1 text-xs rounded-md border transition-colors ${
            isNA
              ? "bg-gray-200 border-gray-400 text-gray-700 font-medium"
              : "bg-white border-gray-300 text-gray-400 hover:bg-gray-50"
          }`}
        >
          N/A
        </button>
      </div>

      {/* Saving indicator */}
      {saving && <span className="text-xs text-gray-400">Saving...</span>}

      {/* Notes + Photos — always available (not required) */}
      {!isNA && (
        <div className="mt-2 ml-2 space-y-2">
          {/* Existing notes */}
          {itemNotes.map((note) => (
            <div key={note.id} className="bg-gray-50 rounded-lg p-2.5 text-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="text-gray-700 flex-1">{note.text || <span className="text-gray-400 italic">Photo only</span>}</p>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="text-xs text-red-400 hover:text-red-600 flex-shrink-0"
                >
                  ×
                </button>
              </div>
              {/* Photos */}
              {note.photos && note.photos.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {note.photos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={`${supabaseUrl}/storage/v1/object/public/dd-captures/${photo.image_path}`}
                        alt=""
                        className="w-16 h-16 object-cover rounded"
                      />
                      <button
                        onClick={() => handleDeletePhoto(photo.id, photo.image_path)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {/* Add photo to this note */}
              <label className="inline-flex items-center gap-1 mt-1.5 text-xs text-gray-400 hover:text-gray-600 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadPhoto(note.id, file);
                    e.target.value = "";
                  }}
                />
                + Photo
              </label>
            </div>
          ))}

          {/* Action buttons — always visible */}
          <div className="flex items-center gap-3">
            {/* Add Note */}
            {!showAddNote ? (
              <button
                onClick={() => setShowAddNote(true)}
                className="text-xs text-orange-600 hover:text-orange-700"
              >
                + Add Note
              </button>
            ) : (
              <div className="flex gap-2 flex-1">
                <input
                  type="text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Note..."
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && noteText.trim()) handleAddNote();
                    if (e.key === "Escape") { setShowAddNote(false); setNoteText(""); }
                  }}
                />
                <button
                  onClick={handleAddNote}
                  disabled={!noteText.trim() || addingNote}
                  className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                >
                  {addingNote ? "..." : "Add"}
                </button>
                <button
                  onClick={() => { setShowAddNote(false); setNoteText(""); }}
                  className="text-xs text-gray-400 hover:text-gray-600"
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
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  disabled={uploadingDirect}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleDirectPhoto(file);
                    e.target.value = "";
                  }}
                />
                {uploadingDirect ? "Uploading..." : "📷 Take Photo"}
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
