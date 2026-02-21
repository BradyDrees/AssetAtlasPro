"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface ExportButtonsProps {
  projectId: string;
  projectCode: string;
}

type ExportFormat = "full" | "summary" | "photos" | "zip" | "excel";

const EXPORT_FORMAT_ICONS: Record<ExportFormat, string> = {
  full: "\u{1F4C4}",
  summary: "\u{1F4CA}",
  photos: "\u{1F4F7}",
  zip: "\u{1F4E6}",
  excel: "\u{1F4CA}",
};

const EXPORT_FORMATS: ExportFormat[] = ["full", "summary", "photos", "zip", "excel"];

export function ExportButtons({ projectId, projectCode }: ExportButtonsProps) {
  const t = useTranslations();
  const [activeFormat, setActiveFormat] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (format: ExportFormat) => {
    setActiveFormat(format);
    setError(null);

    try {
      // 3-minute timeout — large projects with many photos need time
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 180_000);

      let res: Response;
      try {
        res = await fetch(`/api/export/${projectId}?format=${format}`, {
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Export failed (${res.status})`);
      }

      // Download the file
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      const cleanCode = projectCode
        .replace(/[^a-zA-Z0-9]/g, "-")
        .replace(/-+/g, "-");

      const ext = format === "zip" ? "zip" : format === "excel" ? "xlsx" : "pdf";
      const suffix =
        format === "full"
          ? "full-report"
          : format === "summary"
            ? "summary"
            : format === "photos"
              ? "photo-book"
              : format === "excel"
                ? "inspection-data"
                : "photos";

      a.href = url;
      a.download = `${cleanCode}-${suffix}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Export error:", err);
      const msg =
        err.name === "AbortError"
          ? t("export.timedOut")
          : err.message ?? t("export.failed");
      setError(msg);
      setTimeout(() => setError(null), 8000);
    } finally {
      setActiveFormat(null);
    }
  };

  return (
    <div className="bg-surface-primary rounded-lg border border-edge-primary p-4">
      <h2 className="text-sm font-semibold text-content-quaternary uppercase tracking-wide mb-3">
        {t("export.title")}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {EXPORT_FORMATS.map((format) => (
          <button
            key={format}
            onClick={() => handleExport(format)}
            disabled={activeFormat !== null}
            className={`flex items-center gap-3 px-3 py-3 rounded-lg border text-left transition-colors ${
              activeFormat === format
                ? "border-brand-300 bg-brand-50"
                : "border-edge-primary hover:bg-surface-secondary"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span className="text-xl flex-shrink-0">
              {activeFormat === format ? (
                <span className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-brand-600" />
              ) : (
                EXPORT_FORMAT_ICONS[format]
              )}
            </span>
            <div>
              <span className="text-sm font-medium text-content-primary block">
                {t(`export.formats.${format}.label`)}
              </span>
              <span className="text-xs text-content-quaternary">{t(`export.formats.${format}.description`)}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Error toast */}
      {error && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
