"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createRecurringTemplate } from "@/app/actions/vendor-recurring-invoices";
import type { RecurringFrequency, RecurringInvoiceItem } from "@/lib/vendor/recurring-invoice-types";

const FREQUENCIES: RecurringFrequency[] = ["weekly", "biweekly", "monthly", "quarterly", "annual"];
const ITEM_TYPES = ["labor", "material", "other"] as const;

interface RecurringInvoiceFormProps {
  onClose: () => void;
  onCreated: () => void;
}

export function RecurringInvoiceForm({ onClose, onCreated }: RecurringInvoiceFormProps) {
  const t = useTranslations("vendor.recurring");

  const [title, setTitle] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [unitInfo, setUnitInfo] = useState("");
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
  const [nextDue, setNextDue] = useState("");
  const [taxPct, setTaxPct] = useState("0");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Line items
  const [items, setItems] = useState<RecurringInvoiceItem[]>([]);
  const [newDesc, setNewDesc] = useState("");
  const [newQty, setNewQty] = useState("1");
  const [newPrice, setNewPrice] = useState("");
  const [newType, setNewType] = useState<"labor" | "material" | "other">("labor");

  function addItem() {
    const desc = newDesc.trim();
    const qty = parseFloat(newQty) || 1;
    const price = parseFloat(newPrice) || 0;
    if (!desc || price <= 0) return;

    setItems([
      ...items,
      { description: desc, quantity: qty, unit_price: price, total: qty * price, item_type: newType },
    ]);
    setNewDesc("");
    setNewQty("1");
    setNewPrice("");
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const tax = subtotal * ((parseFloat(taxPct) || 0) / 100);
  const total = subtotal + tax;

  async function handleSubmit() {
    if (!title.trim() || !nextDue || items.length === 0) {
      setError(t("validationError"));
      return;
    }

    setSaving(true);
    setError("");

    const result = await createRecurringTemplate({
      title: title.trim(),
      property_name: propertyName.trim() || undefined,
      unit_info: unitInfo.trim() || undefined,
      items,
      tax_pct: parseFloat(taxPct) || 0,
      frequency,
      next_due: nextDue,
      notes: notes.trim() || undefined,
    });

    setSaving(false);

    if (result.error) {
      setError(result.error);
    } else {
      onCreated();
    }
  }

  const inputClass =
    "w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary placeholder:text-content-muted focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface-primary rounded-xl border border-edge-primary w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-lg font-semibold text-content-primary mb-4">{t("create")}</h2>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">{t("templateTitle")}</label>
            <input type="text" className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("titlePlaceholder")} />
          </div>

          {/* Property / Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">{t("propertyName")}</label>
              <input type="text" className={inputClass} value={propertyName} onChange={(e) => setPropertyName(e.target.value)} placeholder={t("propertyPlaceholder")} />
            </div>
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">{t("unitInfo")}</label>
              <input type="text" className={inputClass} value={unitInfo} onChange={(e) => setUnitInfo(e.target.value)} placeholder={t("unitPlaceholder")} />
            </div>
          </div>

          {/* Frequency + Next Due */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">{t("frequencyLabel")}</label>
              <select className={inputClass} value={frequency} onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}>
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>{t(`frequency.${f}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">{t("nextDue")}</label>
              <input type="date" className={inputClass} value={nextDue} onChange={(e) => setNextDue(e.target.value)} />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-2">{t("lineItems")}</label>

            {items.length > 0 && (
              <div className="space-y-2 mb-3">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-surface-secondary rounded-lg px-3 py-2 text-sm">
                    <span className="flex-1 text-content-primary truncate">{item.description}</span>
                    <span className="text-content-secondary text-xs">{item.quantity}x</span>
                    <span className="text-content-secondary text-xs">${item.unit_price.toFixed(2)}</span>
                    <span className="font-medium text-content-primary">${(item.quantity * item.unit_price).toFixed(2)}</span>
                    <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-300">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add item row */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <input type="text" className={inputClass} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder={t("itemDescription")} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }} />
              </div>
              <select className={inputClass + " w-24"} value={newType} onChange={(e) => setNewType(e.target.value as typeof newType)}>
                {ITEM_TYPES.map((it) => (
                  <option key={it} value={it}>{t(`itemType.${it}`)}</option>
                ))}
              </select>
              <input type="number" min={1} className={inputClass + " w-16"} value={newQty} onChange={(e) => setNewQty(e.target.value)} placeholder={t("qty")} />
              <input type="number" step="0.01" min={0} className={inputClass + " w-24"} value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder={t("price")} />
              <button onClick={addItem} className="px-3 py-2 rounded-lg text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors shrink-0">
                {t("addItem")}
              </button>
            </div>
          </div>

          {/* Tax + Totals */}
          <div className="flex items-center gap-3">
            <div className="w-24">
              <label className="block text-xs font-medium text-content-secondary mb-1">{t("taxPct")}</label>
              <input type="number" step="0.01" min={0} className={inputClass} value={taxPct} onChange={(e) => setTaxPct(e.target.value)} />
            </div>
            <div className="flex-1 text-right text-sm">
              <p className="text-content-secondary">{t("subtotal")}: ${subtotal.toFixed(2)}</p>
              {tax > 0 && <p className="text-content-secondary">{t("tax")}: ${tax.toFixed(2)}</p>}
              <p className="font-bold text-content-primary text-base">{t("total")}: ${total.toFixed(2)}</p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">{t("notes")}</label>
            <textarea className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notesPlaceholder")} />
          </div>
        </div>

        {error && <p className="text-sm text-red-400 mt-3">{error}</p>}

        {/* Actions */}
        <div className="flex gap-3 justify-end mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-content-secondary hover:bg-surface-secondary transition-colors">
            {t("cancelBtn")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !title.trim() || !nextDue || items.length === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 transition-colors"
          >
            {saving ? t("saving") : t("createBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}
