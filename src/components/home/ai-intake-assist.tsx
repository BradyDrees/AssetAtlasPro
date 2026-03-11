"use client";

import { useState, useTransition, useRef } from "react";
import { useTranslations } from "next-intl";
import { analyzeHomeIssue } from "@/app/actions/project-ai";

interface AiSuggestion {
  suggestedTrade: string | null;
  urgencyEstimate: "routine" | "urgent" | "emergency" | null;
  issueDescription: string | null;
  confidence: number;
}

interface Props {
  onSuggestion: (suggestion: AiSuggestion) => void;
  currentDescription: string;
}

export function AiIntakeAssist({ onSuggestion, currentDescription }: Props) {
  const t = useTranslations("home.workOrders");
  const [isPending, startTransition] = useTransition();
  const [photos, setPhotos] = useState<string[]>([]);
  const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhotoCapture = async (files: FileList | null) => {
    if (!files) return;
    const newPhotos: string[] = [];

    for (let i = 0; i < Math.min(files.length, 3 - photos.length); i++) {
      const file = files[i];
      // Only accept jpeg/png/webp
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) continue;
      // Max 1MB
      if (file.size > 1024 * 1024) continue;

      const base64 = await fileToBase64(file);
      newPhotos.push(base64);
    }

    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 3));
  };

  const handleAnalyze = () => {
    setError(null);
    startTransition(async () => {
      const result = await analyzeHomeIssue({
        description: currentDescription || undefined,
        photoBase64s: photos.length > 0 ? photos : undefined,
      });

      if (result) {
        setSuggestion(result);
        onSuggestion(result);
      } else {
        setError(t("aiUnavailable"));
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* Photo capture */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={photos.length >= 3}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-secondary text-content-secondary text-sm hover:bg-surface-tertiary transition-colors disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
          </svg>
          {t("aiSnapPhoto")}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => handlePhotoCapture(e.target.files)}
        />

        {(photos.length > 0 || currentDescription.trim().length > 5) && (
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isPending}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 text-rose-400 text-sm font-medium hover:bg-rose-500/20 transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t("aiAnalyzing")}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                {t("aiAnalyze")}
              </>
            )}
          </button>
        )}
      </div>

      {/* Photo thumbnails */}
      {photos.length > 0 && (
        <div className="flex gap-2">
          {photos.map((photo, i) => (
            <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden">
              <img src={photo} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white text-[10px] flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* AI suggestion chip */}
      {suggestion && suggestion.suggestedTrade && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <span className="text-xs text-purple-300">
            {t("aiSuggested")}: <span className="font-medium capitalize">{suggestion.suggestedTrade}</span>
            {suggestion.confidence > 0 && (
              <span className="text-purple-400/60 ml-1">({suggestion.confidence}%)</span>
            )}
          </span>
        </div>
      )}

      {error && (
        <p className="text-xs text-content-quaternary">{error}</p>
      )}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
