"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { uploadEstimatePhoto } from "@/app/actions/vendor-estimate-photos";

interface EstimatePhotoUploadProps {
  estimateId: string;
  sectionId?: string | null;
  itemId?: string | null;
  onUploadComplete?: () => void;
}

export function EstimatePhotoUpload({
  estimateId,
  sectionId,
  itemId,
  onUploadComplete,
}: EstimatePhotoUploadProps) {
  const t = useTranslations("vendor.estimates");
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setUploading(true);
      setTotalCount(files.length);
      setUploadCount(0);

      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (!file.type.startsWith("image/")) continue;

          const formData = new FormData();
          formData.append("file", file);
          formData.append("estimateId", estimateId);
          if (sectionId) formData.append("sectionId", sectionId);
          if (itemId) formData.append("itemId", itemId);

          const result = await uploadEstimatePhoto(formData);
          if (result.error) {
            console.error("Upload failed for", file.name, result.error);
          }
          setUploadCount(i + 1);
        }
        onUploadComplete?.();
      } catch (err) {
        console.error("Upload failed:", err);
      } finally {
        setUploading(false);
        setUploadCount(0);
        setTotalCount(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [estimateId, sectionId, itemId, onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
        dragActive
          ? "border-brand-500 bg-brand-500/5"
          : "border-edge-secondary hover:border-edge-primary"
      } ${uploading ? "opacity-60 pointer-events-none" : ""}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {uploading ? (
        <div className="space-y-2">
          <div className="w-8 h-8 mx-auto border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-content-secondary">
            {t("photos.uploading")} ({uploadCount}/{totalCount})
          </p>
        </div>
      ) : (
        <>
          <svg
            className="w-10 h-10 mx-auto mb-2 text-content-quaternary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm text-content-tertiary mb-1">
            {t("photos.dropOrClick")}
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-sm text-brand-500 hover:text-brand-400 font-medium transition-colors"
          >
            {t("photos.browse")}
          </button>
        </>
      )}
    </div>
  );
}
