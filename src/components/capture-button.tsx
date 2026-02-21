"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { uploadCapture } from "@/app/actions/captures";

interface CaptureButtonProps {
  projectSectionId: string;
  projectId: string;
  sectionSlug: string;
  unitId?: string;
  sectionItemId?: string;
}

export function CaptureButton({
  projectSectionId,
  projectId,
  sectionSlug,
  unitId,
  sectionItemId,
}: CaptureButtonProps) {
  const t = useTranslations();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectSectionId", projectSectionId);
      formData.append("projectId", projectId);
      formData.append("sectionSlug", sectionSlug);
      if (unitId) {
        formData.append("unitId", unitId);
      }
      if (sectionItemId) {
        formData.append("sectionItemId", sectionItemId);
      }
      await uploadCapture(formData);
    } catch (err) {
      console.error("Upload failed:", err);
      const msg =
        err instanceof Error ? err.message : t("captures.uploadFailed");
      setError(msg);
      // Auto-dismiss after 4s
      setTimeout(() => setError(null), 4000);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleCapture}
        className="hidden"
      />

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-24 right-4 left-4 z-50 bg-red-600 text-white text-sm px-4 py-3 rounded-lg shadow-lg text-center">
          {error}
        </div>
      )}

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="fixed bottom-6 right-6 z-40 w-16 h-16 bg-brand-600 text-white
                   rounded-full shadow-lg hover:bg-brand-700 active:bg-brand-800
                   disabled:opacity-50 flex items-center justify-center
                   transition-colors text-2xl"
        aria-label={uploading ? t("captures.uploading") : t("captures.capturePhoto")}
      >
        {uploading ? (
          <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
        ) : (
          "\u{1F4F7}"
        )}
      </button>
    </>
  );
}
