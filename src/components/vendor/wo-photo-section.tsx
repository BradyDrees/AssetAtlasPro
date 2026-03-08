"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import {
  uploadWoPhoto,
  getWoPhotos,
  deleteWoPhoto,
  updateWoPhotoCaption,
} from "@/app/actions/vendor-wo-photos";
import type { WoPhoto } from "@/app/actions/vendor-wo-photos";

type PhotoType = "before" | "during" | "after" | "general";
type TabFilter = PhotoType | "all";

interface WoPhotoSectionProps {
  woId: string;
  readOnly?: boolean;
}

export function WoPhotoSection({ woId, readOnly = false }: WoPhotoSectionProps) {
  const t = useTranslations("vendor.jobs");
  const [photos, setPhotos] = useState<WoPhoto[]>([]);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [uploadType, setUploadType] = useState<PhotoType>("general");
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPhotos = useCallback(async () => {
    const result = await getWoPhotos(woId);
    if (!result.error) setPhotos(result.data);
  }, [woId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const filteredPhotos =
    activeTab === "all"
      ? photos
      : photos.filter((p) => p.photo_type === activeTab);

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
          formData.append("woId", woId);
          formData.append("photoType", uploadType);

          const result = await uploadWoPhoto(formData);
          if (result.error) {
            console.error("Upload failed for", file.name, result.error);
          }
          setUploadCount(i + 1);
        }
        await loadPhotos();
      } catch (err) {
        console.error("Upload failed:", err);
      } finally {
        setUploading(false);
        setUploadCount(0);
        setTotalCount(0);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [woId, uploadType, loadPhotos]
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

  const handleDelete = useCallback(
    async (photoId: string) => {
      const result = await deleteWoPhoto(photoId);
      if (!result.error) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      }
    },
    []
  );

  const handleSaveCaption = useCallback(
    async (photoId: string) => {
      await updateWoPhotoCaption(photoId, captionText);
      setEditingCaption(null);
      await loadPhotos();
    },
    [captionText, loadPhotos]
  );

  const tabs: { key: TabFilter; label: string }[] = [
    { key: "all", label: t("photos.all") },
    { key: "before", label: t("photos.before") },
    { key: "during", label: t("photos.during") },
    { key: "after", label: t("photos.after") },
  ];

  const typeOptions: { key: PhotoType; label: string }[] = [
    { key: "before", label: t("photos.before") },
    { key: "during", label: t("photos.during") },
    { key: "after", label: t("photos.after") },
    { key: "general", label: t("photos.general") },
  ];

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
      <h3 className="text-sm font-semibold text-content-primary mb-3 flex items-center gap-2">
        <svg className="w-4 h-4 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
        </svg>
        {t("photos.title")} ({photos.length})
      </h3>

      {/* Tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto">
        {tabs.map((tab) => {
          const count =
            tab.key === "all"
              ? photos.length
              : photos.filter((p) => p.photo_type === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? "bg-brand-600 text-white"
                  : "bg-surface-secondary text-content-tertiary hover:text-content-primary"
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Upload area */}
      {!readOnly && (
        <>
          {/* Photo type selector */}
          <div className="flex gap-1 mb-2">
            {typeOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setUploadType(opt.key)}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                  uploadType === opt.key
                    ? "bg-brand-500/20 text-brand-400 border border-brand-500/30"
                    : "bg-surface-secondary text-content-quaternary hover:text-content-tertiary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div
            className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-colors mb-3 ${
              dragActive
                ? "border-brand-500 bg-brand-500/5"
                : "border-edge-secondary hover:border-edge-primary"
            } ${uploading ? "opacity-60 pointer-events-none" : ""}`}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
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
                <div className="w-6 h-6 mx-auto border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-content-secondary">
                  {t("photos.uploading")} ({uploadCount}/{totalCount})
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-brand-500 hover:text-brand-400 font-medium"
              >
                {t("photos.dropOrClick")}
              </button>
            )}
          </div>
        </>
      )}

      {/* Photo grid */}
      {filteredPhotos.length === 0 ? (
        <p className="text-xs text-content-quaternary text-center py-4">
          {t("photos.noPhotos")}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {filteredPhotos.map((photo) => (
            <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-edge-secondary">
              {photo.signed_url ? (
                <Image
                  src={photo.signed_url}
                  alt={photo.caption || ""}
                  width={300}
                  height={200}
                  className="w-full h-32 object-cover"
                />
              ) : (
                <div className="w-full h-32 bg-surface-secondary flex items-center justify-center">
                  <svg className="w-8 h-8 text-content-quaternary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 6.75v10.5A2.25 2.25 0 003.75 21z" />
                  </svg>
                </div>
              )}

              {/* Type badge */}
              <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-black/60 text-white">
                {t(`photos.${photo.photo_type}`)}
              </span>

              {/* Delete button */}
              {!readOnly && (
                <button
                  onClick={() => handleDelete(photo.id)}
                  className="absolute top-1 right-1 p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              {/* Caption */}
              <div className="p-1.5">
                {editingCaption === photo.id ? (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={captionText}
                      onChange={(e) => setCaptionText(e.target.value)}
                      maxLength={200}
                      className="flex-1 px-1.5 py-0.5 bg-surface-secondary border border-edge-primary rounded text-[10px] text-content-primary"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveCaption(photo.id);
                        if (e.key === "Escape") setEditingCaption(null);
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveCaption(photo.id)}
                      className="text-[10px] text-brand-500"
                    >
                      ✓
                    </button>
                  </div>
                ) : (
                  <p
                    className="text-[10px] text-content-tertiary truncate cursor-pointer hover:text-content-primary"
                    onClick={() => {
                      if (!readOnly) {
                        setEditingCaption(photo.id);
                        setCaptionText(photo.caption || "");
                      }
                    }}
                  >
                    {photo.caption || t("photos.addCaption")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
