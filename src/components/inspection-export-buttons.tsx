"use client";

import { useState } from "react";

interface InspectionExportButtonsProps {
  projectId: string;
  projectCode: string;
}

type ExportFormat = "full" | "summary" | "photos" | "zip" | "excel";

const EXPORT_OPTIONS: {
  format: ExportFormat;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    format: "full",
    label: "Full Report",
    description: "Complete report with findings, photos & metrics",
    icon: "\u{1F4C4}",
  },
  {
    format: "summary",
    label: "Summary Only",
    description: "Findings matrix & unit grades, no photos",
    icon: "\u{1F4CA}",
  },
  {
    format: "photos",
    label: "Photo Book",
    description: "All photos organized by section",
    icon: "\u{1F4F7}",
  },
  {
    format: "zip",
    label: "Download Photos",
    description: "ZIP archive with organized folders",
    icon: "\u{1F4E6}",
  },
  {
    format: "excel",
    label: "Excel Spreadsheet",
    description: "Findings, unit grading & sections (.xlsx)",
    icon: "\u{1F4CA}",
  },
];

export function InspectionExportButtons({
  projectId,
  projectCode,
}: InspectionExportButtonsProps) {
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
        res = await fetch(
          `/api/inspection-export/${projectId}?format=${format}`,
          { signal: controller.signal }
        );
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

      const ext =
        format === "zip" ? "zip" : format === "excel" ? "xlsx" : "pdf";
      const suffix =
        format === "full"
          ? "inspection-full-report"
          : format === "summary"
            ? "inspection-summary"
            : format === "photos"
              ? "inspection-photo-book"
              : format === "excel"
                ? "inspection-data"
                : "inspection-photos";

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
          ? "Export timed out. Try Summary or Excel for large projects."
          : err.message ?? "Export failed. Try again.";
      setError(msg);
      setTimeout(() => setError(null), 8000);
    } finally {
      setActiveFormat(null);
    }
  };

  return (
    <div className="bg-surface-primary rounded-lg border border-edge-primary p-4">
      <h2 className="text-sm font-semibold text-content-quaternary uppercase tracking-wide mb-3">
        Export
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {EXPORT_OPTIONS.map((opt) => (
          <button
            key={opt.format}
            onClick={() => handleExport(opt.format)}
            disabled={activeFormat !== null}
            className={`flex items-center gap-3 px-3 py-3 rounded-lg border text-left transition-colors ${
              activeFormat === opt.format
                ? "border-brand-300 bg-brand-50"
                : "border-edge-primary hover:bg-surface-secondary"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span className="text-xl flex-shrink-0">
              {activeFormat === opt.format ? (
                <span className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-brand-600" />
              ) : (
                opt.icon
              )}
            </span>
            <div>
              <span className="text-sm font-medium text-content-primary block">
                {opt.label}
              </span>
              <span className="text-xs text-content-quaternary">{opt.description}</span>
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
