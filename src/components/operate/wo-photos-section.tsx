"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface Photo {
  id: string;
  storage_path: string;
  caption: string | null;
  photo_type: string;
  created_at: string;
  url: string;
}

interface WoPhotosSectionProps {
  photos: Photo[];
}

type PhotoFilter = "all" | "before" | "during" | "after" | "general";

export function WoPhotosSection({ photos }: WoPhotosSectionProps) {
  const t = useTranslations("operate.workOrders");
  const [filter, setFilter] = useState<PhotoFilter>("all");
  const [lightbox, setLightbox] = useState<string | null>(null);

  const filters: { key: PhotoFilter; label: string }[] = [
    { key: "all", label: t("photoFilters.all") },
    { key: "before", label: t("photoFilters.before") },
    { key: "during", label: t("photoFilters.during") },
    { key: "after", label: t("photoFilters.after") },
  ];

  const filtered =
    filter === "all" ? photos : photos.filter((p) => p.photo_type === filter);

  if (photos.length === 0) {
    return (
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
        <svg className="w-10 h-10 mx-auto mb-2 text-content-quaternary opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
        </svg>
        <p className="text-sm text-content-tertiary">{t("noPhotos")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex gap-1.5">
        {filters.map((f) => {
          const count =
            f.key === "all"
              ? photos.length
              : photos.filter((p) => p.photo_type === f.key).length;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                filter === f.key
                  ? "bg-green-600 text-white"
                  : "bg-surface-tertiary text-content-tertiary hover:text-content-primary"
              }`}
            >
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {filtered.map((photo) => (
          <button
            key={photo.id}
            onClick={() => setLightbox(photo.url)}
            className="relative aspect-square rounded-lg overflow-hidden border border-edge-primary hover:border-green-500/40 transition-colors group"
          >
            {photo.url ? (
              <img
                src={photo.url}
                alt={photo.caption || "Work order photo"}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-surface-tertiary flex items-center justify-center">
                <span className="text-xs text-content-quaternary">{t("noPreview")}</span>
              </div>
            )}
            <div className="absolute top-1 left-1">
              <span className="text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                {photo.photo_type}
              </span>
            </div>
            {photo.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[10px] text-white truncate">{photo.caption}</p>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setLightbox(null)}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={lightbox}
            alt="Full size"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
