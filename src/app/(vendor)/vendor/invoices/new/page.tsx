"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createInvoice } from "@/app/actions/vendor-invoices";

export default function NewInvoicePage() {
  const t = useTranslations("vendor.invoices");
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const [propertyName, setPropertyName] = useState("");
  const [unitInfo, setUnitInfo] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [taxPct, setTaxPct] = useState(0);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { data, error } = await createInvoice({
        property_name: propertyName || undefined,
        unit_info: unitInfo || undefined,
        notes: notes || undefined,
        due_date: dueDate || undefined,
        tax_pct: taxPct,
      });
      if (error) { alert(error); return; }
      if (data) router.push(`/vendor/invoices/${data.id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/vendor/invoices")} className="p-2 text-content-tertiary hover:text-content-primary transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-content-primary">{t("new")}</h1>
      </div>

      <div className="bg-surface-primary rounded-xl border border-edge-primary p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1">{t("propertyName")}</label>
            <input type="text" value={propertyName} onChange={(e) => setPropertyName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary placeholder:text-content-quaternary"
              placeholder={t("propertyNamePlaceholder")} />
          </div>
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1">{t("unitInfo")}</label>
            <input type="text" value={unitInfo} onChange={(e) => setUnitInfo(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary placeholder:text-content-quaternary"
              placeholder={t("unitInfoPlaceholder")} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1">{t("dueDate")}</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1">{t("taxRate")}</label>
            <div className="flex items-center gap-1">
              <input type="number" min={0} max={100} step={0.25} value={taxPct} onChange={(e) => setTaxPct(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary" />
              <span className="text-sm text-content-tertiary">%</span>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-content-secondary mb-1">{t("notes")}</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary resize-none placeholder:text-content-quaternary"
            placeholder={t("notesPlaceholder")} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button onClick={() => router.push("/vendor/invoices")} className="px-4 py-2 text-sm text-content-secondary hover:text-content-primary transition-colors">
          {t("cancel")}
        </button>
        <button onClick={handleCreate} disabled={creating}
          className="px-5 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50 transition-colors">
          {creating ? t("creating") : t("createInvoice")}
        </button>
      </div>
    </div>
  );
}
