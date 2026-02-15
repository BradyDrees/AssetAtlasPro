"use client";

import { useState } from "react";
import { updateCaptureCaption, deleteCapture } from "@/app/actions/captures";
import type { DDCapture } from "@/lib/types";

interface CaptureCardProps {
  capture: DDCapture;
  projectId: string;
  projectSectionId: string;
  mediaUrl: string;
}

export function CaptureCard({
  capture,
  projectId,
  projectSectionId,
  mediaUrl,
}: CaptureCardProps) {
  const [caption, setCaption] = useState(capture.caption);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSaveCaption = async () => {
    setSaving(true);
    try {
      await updateCaptureCaption(
        capture.id,
        caption,
        projectId,
        projectSectionId
      );
      setIsEditing(false);
    } catch (err) {
      console.error("Caption save failed:", err);
      setCaption(capture.caption);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this capture?")) return;
    setDeleting(true);
    try {
      await deleteCapture(
        capture.id,
        capture.image_path,
        projectId,
        projectSectionId
      );
    } catch (err) {
      console.error("Capture delete failed:", err);
      setDeleting(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${
        deleting ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      {/* Media area */}
      <div className="aspect-square relative bg-gray-100">
        {capture.file_type === "image" && (
          <img
            src={mediaUrl}
            alt={caption || "Photo capture"}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
        {capture.file_type === "video" && (
          <video
            src={mediaUrl}
            className="w-full h-full object-cover"
            controls
            preload="metadata"
          />
        )}
        {capture.file_type === "pdf" && (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
            <span className="text-4xl mb-2">{"\u{1F4C4}"}</span>
            <span className="text-xs text-center px-2 truncate max-w-full">
              PDF Document
            </span>
          </div>
        )}

        {/* Delete button overlay */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white
                     rounded-full flex items-center justify-center text-xs
                     hover:bg-red-600 transition-colors"
          aria-label="Delete capture"
        >
          ✕
        </button>
      </div>

      {/* Caption area */}
      <div className="p-2">
        {isEditing ? (
          <div className="flex gap-1">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add caption..."
              className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded
                         focus:outline-none focus:ring-1 focus:ring-brand-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveCaption();
                if (e.key === "Escape") {
                  setCaption(capture.caption);
                  setIsEditing(false);
                }
              }}
            />
            <button
              onClick={handleSaveCaption}
              disabled={saving}
              className="text-xs px-2 py-1 bg-brand-600 text-white rounded
                         hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? "..." : "Save"}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="w-full text-left text-xs text-gray-500 hover:text-gray-700
                       transition-colors py-1 truncate"
          >
            {caption || "Tap to add caption..."}
          </button>
        )}
        <p className="text-[10px] text-gray-300 mt-1">
          {new Date(capture.created_at).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
