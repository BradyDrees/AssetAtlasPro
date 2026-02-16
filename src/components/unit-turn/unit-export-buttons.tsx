"use client";

import { useState } from "react";

interface UnitExportButtonsProps {
  batchId: string;
  unitId?: string;
  batchName: string;
  property?: string;
  unitLabel?: string;
  /** When true, shows batch-level exports (Excel + batch ZIP). When false, unit-level (PDF + unit ZIP). */
  batchLevel?: boolean;
}

type ExportFormat = "pdf" | "excel" | "zip";

interface ExportOption {
  format: ExportFormat;
  label: string;
  description: string;
  icon: string;
}

const UNIT_OPTIONS: ExportOption[] = [
  {
    format: "pdf",
    label: "Unit Report",
    description: "Printable checklist with photos",
    icon: "\u{1F4C4}",
  },
  {
    format: "zip",
    label: "Unit Photos",
    description: "ZIP archive with labeled photos",
    icon: "\u{1F4E6}",
  },
];

const BATCH_OPTIONS: ExportOption[] = [
  {
    format: "excel",
    label: "Excel Spreadsheet",
    description: "All units with item details (.xlsx)",
    icon: "\u{1F4CA}",
  },
  {
    format: "zip",
    label: "All Photos",
    description: "ZIP archive for entire batch",
    icon: "\u{1F4E6}",
  },
];

export function UnitExportButtons({
  batchId,
  unitId,
  batchName,
  property,
  unitLabel,
  batchLevel = false,
}: UnitExportButtonsProps) {
  const [activeFormat, setActiveFormat] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  const options = batchLevel ? BATCH_OPTIONS : UNIT_OPTIONS;

  const handleExport = async (format: ExportFormat) => {
    setActiveFormat(format);
    setError(null);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 180_000);

      let url = `/api/unit-turn-export/${batchId}?format=${format}`;
      if (unitId && format !== "excel") {
        url += `&unitId=${unitId}`;
      }

      let res: Response;
      try {
        res = await fetch(url, { signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Export failed (${res.status})`);
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");

      const cleanBatch = batchName
        .replace(/[^a-zA-Z0-9]/g, "-")
        .replace(/-+/g, "-");

      let filename: string;
      if (format === "pdf" && property && unitLabel) {
        const cleanProp = property.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-");
        filename = `${cleanBatch}-${cleanProp}-Unit-${unitLabel}-report.pdf`;
      } else if (format === "zip" && unitId && property && unitLabel) {
        const cleanProp = property.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-");
        filename = `${cleanBatch}-${cleanProp}-Unit-${unitLabel}-photos.zip`;
      } else if (format === "excel") {
        filename = `${cleanBatch}-unit-turn-data.xlsx`;
      } else {
        filename = `${cleanBatch}-unit-turn-photos.zip`;
      }

      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      console.error("Export error:", err);
      const msg =
        err.name === "AbortError"
          ? "Export timed out. Try again with fewer photos."
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
        {options.map((opt) => (
          <button
            key={opt.format + (opt.label === "All Photos" ? "-batch" : "")}
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

      {error && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
