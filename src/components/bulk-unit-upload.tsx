"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  bulkCreateInspectionUnits,
  type BulkUnitRow,
} from "@/app/actions/inspection-units";

interface BulkUnitUploadProps {
  projectId: string;
  projectSectionId: string;
  onClose: () => void;
}

interface ParsedRow {
  building: string;
  unit_number: string;
  days_vacant: number | null;
  rent_ready: boolean | null;
  description: string;
}

// Flexible column matching helpers
function matchesUnit(h: string): boolean {
  return (
    h === "unit" || h === "unit_number" || h === "unit number" || h === "unit #" ||
    h === "unit no" || h === "unit no." || h === "unitno" || h === "units" ||
    h === "apt" || h === "apt #" || h === "apt no" || h === "apt." ||
    h === "apartment" || h === "apartment #" || h === "suite" || h === "suite #" ||
    h === "space" || h === "space #" || h === "number" || h === "no." || h === "no" ||
    h === "unit/apt" || h === "unit/apt #"
  );
}
function matchesBuilding(h: string): boolean {
  return (
    h === "building" || h === "bldg" || h === "building #" || h === "bldg #" ||
    h === "bldg." || h === "building no" || h === "bldg no" || h === "bldg no." ||
    h === "building name" || h === "structure" || h === "block"
  );
}
function matchesDaysVacant(h: string): boolean {
  return (
    h === "days vacant" || h === "days_vacant" || h === "daysvacant" || h === "vacant days" ||
    h === "days" || h === "vacant" || h === "vacancy days" || h === "# days vacant"
  );
}
function matchesRentReady(h: string): boolean {
  return (
    h === "rent ready" || h === "rent_ready" || h === "rentready" || h === "ready" ||
    h === "rent-ready" || h === "market ready" || h === "move-in ready" || h === "move in ready"
  );
}
function matchesDescription(h: string): boolean {
  return (
    h === "description" || h === "desc" || h === "notes" || h === "unit notes" ||
    h === "comments" || h === "note" || h === "remark" || h === "remarks" ||
    h === "comment" || h === "detail" || h === "details"
  );
}

export function BulkUnitUpload({
  projectId,
  projectSectionId,
  onClose,
}: BulkUnitUploadProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [parseError, setParseError] = useState("");

  const parseCSV = (text: string): ParsedRow[] => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) return [];

    // Parse header
    const headerLine = lines[0];
    const headers = headerLine.split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));

    const unitIdx = headers.findIndex(matchesUnit);
    const buildingIdx = headers.findIndex(matchesBuilding);
    const daysIdx = headers.findIndex(matchesDaysVacant);
    const rentIdx = headers.findIndex(matchesRentReady);
    const descIdx = headers.findIndex(matchesDescription);

    if (unitIdx === -1) {
      throw new Error(
        `Could not find a "Unit" column. Found headers: [${headers.join(", ")}]. Expected one of: Unit, Unit #, Unit No, Apt, Apartment, Suite, Space, Number`
      );
    }

    const parsed: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      const unitNum = (cols[unitIdx] ?? "").trim();
      if (!unitNum) continue;

      const building = buildingIdx >= 0 ? (cols[buildingIdx] ?? "").trim() : "";
      const daysStr = daysIdx >= 0 ? (cols[daysIdx] ?? "").trim() : "";
      const rentStr = rentIdx >= 0 ? (cols[rentIdx] ?? "").trim().toLowerCase() : "";
      const desc = descIdx >= 0 ? (cols[descIdx] ?? "").trim() : "";

      parsed.push({
        building: building || "A",
        unit_number: unitNum,
        days_vacant: daysStr ? parseInt(daysStr) || null : null,
        rent_ready: rentStr === "yes" || rentStr === "true" || rentStr === "1"
          ? true
          : rentStr === "no" || rentStr === "false" || rentStr === "0"
            ? false
            : null,
        description: desc,
      });
    }

    return parsed;
  };

  // Handle CSV fields with commas inside quotes
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFile = async (file: File) => {
    setParseError("");
    setResult(null);
    setFileName(file.name);

    try {
      if (
        file.name.endsWith(".xlsx") ||
        file.name.endsWith(".xls")
      ) {
        // Use ExcelJS for Excel files
        const ExcelJS = await import("exceljs");
        const wb = new ExcelJS.Workbook();
        const buffer = await file.arrayBuffer();
        await wb.xlsx.load(buffer);

        const ws = wb.worksheets[0];
        if (!ws || ws.rowCount < 2) {
          setParseError("Spreadsheet is empty or has no data rows.");
          return;
        }

        // Read header row — use actualColumnCount to handle all columns including empties
        const headerRow = ws.getRow(1);
        const headers: string[] = [];
        const colCount = ws.columnCount || 20;
        for (let c = 1; c <= colCount; c++) {
          const cell = headerRow.getCell(c);
          const raw = (cell.value?.toString() ?? "").trim().toLowerCase().replace(/['"]/g, "");
          headers[c - 1] = raw;
        }

        const unitIdx = headers.findIndex(matchesUnit);
        const buildingIdx = headers.findIndex(matchesBuilding);
        const daysIdx = headers.findIndex(matchesDaysVacant);
        const rentIdx = headers.findIndex(matchesRentReady);
        const descIdx = headers.findIndex(matchesDescription);

        if (unitIdx === -1) {
          setParseError(
            `Could not find a "Unit" column. Found headers: [${headers.join(", ")}]. Expected one of: Unit, Unit #, Unit No, Apt, Apartment, Suite, Space, Number`
          );
          return;
        }

        const parsed: ParsedRow[] = [];
        for (let r = 2; r <= ws.rowCount; r++) {
          const row = ws.getRow(r);
          const getCellVal = (idx: number) =>
            idx >= 0 ? (row.getCell(idx + 1).value?.toString() ?? "").trim() : "";

          const unitNum = getCellVal(unitIdx);
          if (!unitNum) continue;

          const building = getCellVal(buildingIdx) || "A";
          const daysStr = getCellVal(daysIdx);
          const rentStr = getCellVal(rentIdx).toLowerCase();
          const desc = getCellVal(descIdx);

          parsed.push({
            building,
            unit_number: unitNum,
            days_vacant: daysStr ? parseInt(daysStr) || null : null,
            rent_ready: rentStr === "yes" || rentStr === "true" || rentStr === "1"
              ? true
              : rentStr === "no" || rentStr === "false" || rentStr === "0"
                ? false
                : null,
            description: desc,
          });
        }

        setRows(parsed);
      } else {
        // CSV / plain text
        const text = await file.text();
        const parsed = parseCSV(text);
        setRows(parsed);
      }
    } catch (err: any) {
      setParseError(err.message || "Failed to parse file");
    }
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    try {
      const bulkRows: BulkUnitRow[] = rows.map((r) => ({
        building: r.building,
        unit_number: r.unit_number,
        days_vacant: r.days_vacant,
        rent_ready: r.rent_ready,
        description: r.description,
      }));

      const res = await bulkCreateInspectionUnits(
        projectId,
        projectSectionId,
        bulkRows
      );
      setResult(res);
      router.refresh();
    } catch (err: any) {
      setResult({
        created: 0,
        skipped: 0,
        errors: [err.message || "Import failed"],
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-surface-primary rounded-lg border border-edge-primary p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-content-secondary">
          Import Units from Spreadsheet
        </h4>
        <button
          onClick={onClose}
          className="text-sm text-content-muted hover:text-content-secondary"
        >
          Cancel
        </button>
      </div>

      {/* File picker */}
      {rows.length === 0 && !result && (
        <div>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-edge-secondary rounded-lg p-6 text-center cursor-pointer hover:border-brand-500 hover:bg-brand-50/30 transition-all"
          >
            <svg
              className="w-8 h-8 mx-auto mb-2 text-content-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-sm text-content-secondary font-medium">
              Drop a file or click to browse
            </p>
            <p className="text-xs text-content-muted mt-1">
              .xlsx, .xls, or .csv
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          <div className="mt-3 p-3 bg-surface-secondary rounded-lg">
            <p className="text-xs font-medium text-content-tertiary mb-1">
              Expected columns:
            </p>
            <p className="text-xs text-content-muted">
              <span className="font-medium text-content-secondary">Unit</span>{" "}
              (required),{" "}
              <span className="font-medium text-content-secondary">Building</span>{" "}
              (optional, defaults to &quot;A&quot;),{" "}
              <span className="font-medium text-content-secondary">Days Vacant</span>{" "}
              (optional),{" "}
              <span className="font-medium text-content-secondary">Rent Ready</span>{" "}
              (Yes/No, optional),{" "}
              <span className="font-medium text-content-secondary">Description</span>{" "}
              (optional)
            </p>
          </div>
          {parseError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{parseError}</p>
            </div>
          )}
        </div>
      )}

      {/* Preview table */}
      {rows.length > 0 && !result && (
        <div>
          <p className="text-xs text-content-muted mb-2">
            {fileName} &mdash; {rows.length} unit{rows.length !== 1 ? "s" : ""}{" "}
            found
          </p>
          <div className="max-h-64 overflow-auto border border-edge-secondary rounded-lg">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-tertiary text-content-tertiary text-left sticky top-0">
                  <th className="px-3 py-2 font-medium">Building</th>
                  <th className="px-3 py-2 font-medium">Unit</th>
                  <th className="px-3 py-2 font-medium">Days Vacant</th>
                  <th className="px-3 py-2 font-medium">Rent Ready</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-t border-edge-tertiary hover:bg-surface-secondary/50"
                  >
                    <td className="px-3 py-1.5 text-content-primary">
                      {row.building}
                    </td>
                    <td className="px-3 py-1.5 text-content-primary font-medium">
                      {row.unit_number}
                    </td>
                    <td className="px-3 py-1.5 text-content-secondary">
                      {row.days_vacant ?? "—"}
                    </td>
                    <td className="px-3 py-1.5">
                      {row.rent_ready === true ? (
                        <span className="text-green-600">Yes</span>
                      ) : row.rent_ready === false ? (
                        <span className="text-red-600">No</span>
                      ) : (
                        <span className="text-content-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-content-secondary max-w-[200px] truncate">
                      {row.description || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2 mt-3 justify-end">
            <button
              onClick={() => {
                setRows([]);
                setFileName("");
              }}
              className="px-3 py-1.5 text-sm text-content-tertiary hover:text-content-primary"
            >
              Back
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-4 py-1.5 bg-brand-600 text-white text-sm rounded-md hover:bg-brand-700 disabled:opacity-50 font-medium"
            >
              {importing
                ? "Importing..."
                : `Import ${rows.length} Unit${rows.length !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-3">
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-700">
              Import complete: {result.created} created
              {result.skipped > 0 && `, ${result.skipped} skipped (duplicates)`}
            </p>
          </div>
          {result.errors.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs font-medium text-red-700 mb-1">Errors:</p>
              {result.errors.map((err, i) => (
                <p key={i} className="text-xs text-red-600">
                  {err}
                </p>
              ))}
            </div>
          )}
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
