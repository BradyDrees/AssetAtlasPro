"use client";

import { useTranslations } from "next-intl";

interface CaptureModeEntryProps {
  onStart: () => void;
}

/**
 * Full-width entry button to start PWA capture mode.
 * Camera opens on the next user gesture (tap → Start Capture Mode).
 */
export function CaptureModeEntry({ onStart }: CaptureModeEntryProps) {
  const t = useTranslations();

  return (
    <button
      type="button"
      onClick={onStart}
      className="w-full flex items-center gap-4 px-5 py-4 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-xl transition-colors shadow-lg"
    >
      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </div>
      <div className="text-left">
        <p className="text-base font-semibold">{t("inspection.captureMode.start")}</p>
        <p className="text-sm text-white/70">{t("inspection.captureMode.startDesc")}</p>
      </div>
      <svg className="w-5 h-5 ml-auto opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
