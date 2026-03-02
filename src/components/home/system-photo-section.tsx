"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { compressPhoto } from "@/lib/offline/photo-compress";
import { deleteSystemPhoto, uploadSystemPhoto } from "@/app/actions/home-property";
import type { PropertySystemPhotoRow } from "@/lib/home/system-types";

function publicCaptureUrl(storagePath: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "";
  return `${base}/storage/v1/object/public/dd-captures/${storagePath}`;
}

interface SystemPhotoSectionProps {
  propertyId: string;
  systemType: string;
  photos: PropertySystemPhotoRow[];
}

export function SystemPhotoSection({
  propertyId,
  systemType,
  photos,
}: SystemPhotoSectionProps) {
  const t = useTranslations("home.property");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const galleryRef = useRef<HTMLInputElement | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setIsCompressing(true);
    try {
      // Client-side compression
      const compressedBlob = await compressPhoto(file);
      setIsCompressing(false);

      const compressedFile = new File([compressedBlob], "system.jpg", {
        type: "image/jpeg",
      });

      const fd = new FormData();
      fd.set("file", compressedFile);

      await uploadSystemPhoto(propertyId, systemType, fd);
      router.refresh();
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setBusy(false);
      setIsCompressing(false);
    }
  }

  async function handleDelete(photoId: string) {
    setBusy(true);
    try {
      await deleteSystemPhoto(photoId);
      router.refresh();
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 space-y-3">
      {/* Upload buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => cameraRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-charcoal-600 text-white text-xs font-medium rounded-lg transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
            />
          </svg>
          {t("takePhoto")}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => galleryRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-surface-secondary hover:bg-charcoal-700 text-content-primary text-xs font-medium rounded-lg border border-edge-secondary transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
            />
          </svg>
          {t("uploadPhoto")}
        </button>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.currentTarget.files?.[0];
          if (f) void handleFile(f);
          e.currentTarget.value = "";
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.currentTarget.files?.[0];
          if (f) void handleFile(f);
          e.currentTarget.value = "";
        }}
      />

      {/* Compressing indicator */}
      {isCompressing && (
        <div className="flex items-center gap-2 text-xs text-content-quaternary">
          <div className="w-3 h-3 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
          {t("compressingPhoto")}
        </div>
      )}

      {/* Uploading indicator */}
      {busy && !isCompressing && (
        <div className="flex items-center gap-2 text-xs text-content-quaternary">
          <div className="w-3 h-3 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
          {t("uploading")}
        </div>
      )}

      {/* Photo grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <div
              key={p.id}
              className="relative aspect-square rounded-lg overflow-hidden border border-edge-secondary"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={publicCaptureUrl(p.storage_path)}
                alt={p.caption ?? t("systemPhoto")}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => handleDelete(p.id)}
                className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
              >
                <svg
                  className="w-3.5 h-3.5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-content-quaternary italic">
          {t("noSystemPhotos")}
        </p>
      )}
    </div>
  );
}
