"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations();
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
    if (!confirm(t("captures.deleteConfirm"))) return;
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
      className={`bg-surface-primary rounded-lg border border-edge-primary overflow-hidden ${
        deleting ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      {/* Media area */}
      <div className="aspect-square relative bg-surface-tertiary">
        {capture.file_type === "image" && (
          <img
            src={mediaUrl}
            alt={caption || t("captures.photoCapture")}
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
          <div className="w-full h-full flex flex-col items-center justify-center text-content-muted">
            <span className="text-4xl mb-2">{"\u{1F4C4}"}</span>
            <span className="text-xs text-center px-2 truncate max-w-full">
              {t("common.pdfDocument")}
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
          aria-label={t("captures.deletePhoto")}
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
              placeholder={t("captures.addCaption")}
              className="flex-1 text-xs px-2 py-1 border border-edge-secondary rounded
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
              {saving ? "..." : t("common.save")}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="w-full text-left text-xs text-content-quaternary hover:text-content-secondary
                       transition-colors py-1 truncate"
          >
            {caption || t("captures.tapToAddCaption")}
          </button>
        )}
        <p className="text-[10px] text-content-muted mt-1">
          {new Date(capture.created_at).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
