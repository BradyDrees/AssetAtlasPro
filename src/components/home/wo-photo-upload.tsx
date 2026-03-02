"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { compressPhoto } from "@/lib/offline/photo-compress";

interface WoPhotoUploadProps {
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
}

export function WoPhotoUpload({ photos, onPhotosChange }: WoPhotoUploadProps) {
  const t = useTranslations("home.workOrders");
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsCompressing(true);

    const newPhotos: File[] = [];
    const newPreviews: string[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;

      const compressed = await compressPhoto(file);
      const compressedFile = new File(
        [compressed],
        file.name.replace(/\.[^.]+$/, ".jpg"),
        { type: "image/jpeg" }
      );
      newPhotos.push(compressedFile);
      newPreviews.push(URL.createObjectURL(compressed));
    }

    const updatedPhotos = [...photos, ...newPhotos];
    const updatedPreviews = [...previews, ...newPreviews];
    onPhotosChange(updatedPhotos);
    setPreviews(updatedPreviews);
    setIsCompressing(false);
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    const updatedPhotos = photos.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);
    onPhotosChange(updatedPhotos);
    setPreviews(updatedPreviews);
  };

  return (
    <div className="mt-4 space-y-3">
      {/* Action buttons */}
      <div className="flex gap-3">
        {/* Camera button */}
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
          </svg>
          {t("takePhoto")}
        </button>

        {/* Gallery button */}
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-surface-secondary hover:bg-charcoal-700 text-content-primary text-sm font-medium rounded-lg border border-edge-secondary transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
          </svg>
          {t("chooseFromGallery")}
        </button>
      </div>

      {/* Hidden inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
      />

      {/* Compressing indicator */}
      {isCompressing && (
        <div className="flex items-center gap-2 text-xs text-content-quaternary">
          <div className="w-3 h-3 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
          {t("compressingPhotos")}
        </div>
      )}

      {/* Photo previews */}
      {previews.length > 0 && (
        <div>
          <p className="text-xs text-content-tertiary mb-2">
            {t("photosAttached", { count: previews.length })}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-edge-secondary">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation text */}
      <p className="text-xs text-content-quaternary">{t("photosRequired")}</p>
    </div>
  );
}
