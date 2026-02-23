"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { VendorEstimatePhoto } from "@/lib/vendor/estimate-types";
import {
  deleteEstimatePhoto,
  updatePhotoCaption,
} from "@/app/actions/vendor-estimate-photos";

interface EstimatePhotoGalleryProps {
  photos: VendorEstimatePhoto[];
  storageBaseUrl: string;
  readOnly?: boolean;
  onAnnotate?: (photo: VendorEstimatePhoto) => void;
  onPhotosChange?: () => void;
}

export function EstimatePhotoGallery({
  photos,
  storageBaseUrl,
  readOnly = false,
  onAnnotate,
  onPhotosChange,
}: EstimatePhotoGalleryProps) {
  const t = useTranslations("vendor.estimates");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");
  const [lightboxPhoto, setLightboxPhoto] = useState<VendorEstimatePhoto | null>(null);

  const getPublicUrl = useCallback(
    (storagePath: string) =>
      `${storageBaseUrl}/storage/v1/object/public/dd-captures/${storagePath}`,
    [storageBaseUrl]
  );

  const handleDelete = useCallback(
    async (photoId: string) => {
      setDeletingId(photoId);
      try {
        const result = await deleteEstimatePhoto(photoId);
        if (!result.error) {
          onPhotosChange?.();
        }
      } finally {
        setDeletingId(null);
      }
    },
    [onPhotosChange]
  );

  const handleCaptionEdit = useCallback(
    (photo: VendorEstimatePhoto) => {
      setEditingCaptionId(photo.id);
      setCaptionDraft(photo.caption || "");
    },
    []
  );

  const handleCaptionSave = useCallback(
    async (photoId: string) => {
      await updatePhotoCaption(photoId, captionDraft);
      setEditingCaptionId(null);
      onPhotosChange?.();
    },
    [captionDraft, onPhotosChange]
  );

  const handleCaptionCancel = useCallback(() => {
    setEditingCaptionId(null);
    setCaptionDraft("");
  }, []);

  if (photos.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-content-quaternary">
          {t("photos.noPhotos")}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {photos.map((photo) => (
          <div key={photo.id} className="group relative">
            {/* Thumbnail */}
            <div
              className="relative aspect-square rounded-lg overflow-hidden bg-surface-secondary border border-edge-secondary cursor-pointer"
              onClick={() => setLightboxPhoto(photo)}
            >
              <img
                src={getPublicUrl(photo.storage_path)}
                alt={photo.caption || ""}
                className="w-full h-full object-cover"
                loading="lazy"
              />

              {/* Annotation indicator */}
              {photo.annotation_data && (
                <div className="absolute top-1.5 left-1.5 bg-brand-600/80 rounded-full p-1">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                  </svg>
                </div>
              )}

              {/* Hover overlay with actions */}
              {!readOnly && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  {onAnnotate && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAnnotate(photo);
                      }}
                      className="p-2 bg-white/90 rounded-full text-gray-700 hover:bg-white transition-colors"
                      title={t("photos.annotate")}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                      </svg>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(photo.id);
                    }}
                    disabled={deletingId === photo.id}
                    className="p-2 bg-red-500/90 rounded-full text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                    title={t("photos.delete")}
                  >
                    {deletingId === photo.id ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Caption */}
            <div className="mt-1.5">
              {editingCaptionId === photo.id ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={captionDraft}
                    onChange={(e) => setCaptionDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCaptionSave(photo.id);
                      if (e.key === "Escape") handleCaptionCancel();
                    }}
                    maxLength={200}
                    autoFocus
                    className="flex-1 min-w-0 text-xs px-2 py-1 bg-surface-secondary border border-edge-secondary rounded text-content-primary"
                    placeholder={t("photos.captionPlaceholder")}
                  />
                  <button
                    type="button"
                    onClick={() => handleCaptionSave(photo.id)}
                    className="p-1 text-brand-500 hover:text-brand-400"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={handleCaptionCancel}
                    className="p-1 text-content-quaternary hover:text-content-secondary"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => !readOnly && handleCaptionEdit(photo)}
                  disabled={readOnly}
                  className="text-xs text-content-tertiary hover:text-content-secondary truncate w-full text-left disabled:cursor-default"
                >
                  {photo.caption || (!readOnly ? t("photos.addCaption") : "")}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={getPublicUrl(lightboxPhoto.storage_path)}
            alt={lightboxPhoto.caption || ""}
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          {lightboxPhoto.caption && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/70 rounded-lg">
              <p className="text-sm text-white">{lightboxPhoto.caption}</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
