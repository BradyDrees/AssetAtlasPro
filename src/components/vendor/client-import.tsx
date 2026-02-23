"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { importClientsFromCsv } from "@/app/actions/vendor-clients-direct";
import type { CreateClientInput } from "@/lib/vendor/expense-types";

interface ClientImportProps {
  onImported: () => void;
}

function parseCsvToClients(csv: string): CreateClientInput[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z_]/g, ""));
  const rows: CreateClientInput[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    if (vals.every((v) => !v)) continue;
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { if (vals[idx]) obj[h] = vals[idx]; });
    if (!obj.name) continue;
    rows.push({
      name: obj.name,
      contact_name: obj.contact_name || obj.contact || undefined,
      phone: obj.phone || undefined,
      email: obj.email || undefined,
      address: obj.address || undefined,
      city: obj.city || undefined,
      state: obj.state || undefined,
      zip: obj.zip || undefined,
      notes: obj.notes || undefined,
    });
  }
  return rows;
}

export function ClientImport({ onImported }: ClientImportProps) {
  const t = useTranslations("vendor.clients");
  const [open, setOpen] = useState(false);
  const [csvData, setCsvData] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsvData(reader.result as string);
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!csvData.trim()) return;
    startTransition(async () => {
      setError(null);
      setResult(null);
      const rows = parseCsvToClients(csvData);
      if (rows.length === 0) {
        setError("No valid rows found in CSV");
        return;
      }
      const importResult = await importClientsFromCsv(rows);
      if (importResult.error) {
        setError(importResult.error);
      } else {
        setResult({ imported: importResult.imported, errors: importResult.errors });
        if (importResult.imported > 0) onImported();
      }
    });
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-surface-secondary rounded-lg text-sm text-content-secondary hover:bg-surface-tertiary transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
        {t("direct.importCsv")}
      </button>
    );
  }

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-content-primary">{t("direct.importCsv")}</h3>
        <button onClick={() => { setOpen(false); setCsvData(""); setResult(null); setError(null); }} className="text-content-quaternary hover:text-content-secondary">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <p className="text-xs text-content-quaternary">{t("direct.importHint")}</p>
      <div className="border-2 border-dashed border-edge-secondary rounded-lg p-6 text-center">
        <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="csv-upload" />
        <label htmlFor="csv-upload" className="cursor-pointer">
          <svg className="w-8 h-8 text-content-quaternary mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
          <p className="text-sm text-content-tertiary">{t("direct.dropCsv")}</p>
        </label>
      </div>
      {csvData && <div className="text-xs text-content-quaternary">{csvData.split("\n").length - 1} {t("direct.rowsFound")}</div>}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {result && (
        <div className="p-3 rounded-lg bg-green-500/20 text-green-400 text-sm">
          {t("direct.imported", { count: result.imported })}
          {result.errors.length > 0 && (
            <div className="mt-2 text-xs text-yellow-400">
              {result.errors.slice(0, 5).map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}
        </div>
      )}
      <button onClick={handleImport} disabled={isPending || !csvData.trim()} className="w-full py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50">
        {isPending ? t("direct.importing") : t("direct.importButton")}
      </button>
    </div>
  );
}
