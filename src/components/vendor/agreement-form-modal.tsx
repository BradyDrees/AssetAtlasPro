"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createAgreement } from "@/app/actions/vendor-agreements";
import type { AgreementFrequency } from "@/lib/vendor/agreement-types";

const FREQUENCIES: AgreementFrequency[] = [
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "semi_annual",
  "annual",
];

interface AgreementFormModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}

export function AgreementFormModal({ open, onClose, onCreated }: AgreementFormModalProps) {
  const t = useTranslations("vendor.agreements");

  const [serviceType, setServiceType] = useState("");
  const [trade, setTrade] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<AgreementFrequency>("monthly");
  const [price, setPrice] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!serviceType.trim()) return;

    setSaving(true);
    setError(null);

    const result = await createAgreement({
      service_type: serviceType.trim(),
      trade: trade.trim(),
      description: description.trim() || undefined,
      frequency,
      price: parseFloat(price) || 0,
      property_name: propertyName.trim() || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      notes: notes.trim() || undefined,
    });

    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.data) {
      onCreated(result.data.id);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4">
        <h3 className="text-lg font-semibold text-content-primary">{t("create")}</h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Service Type */}
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">{t("serviceType")}</label>
            <input
              type="text"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              placeholder={t("serviceTypePlaceholder")}
              required
              className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary placeholder:text-content-quaternary"
            />
          </div>

          {/* Trade */}
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">{t("trade")}</label>
            <input
              type="text"
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
              placeholder={t("tradePlaceholder")}
              className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary placeholder:text-content-quaternary"
            />
          </div>

          {/* Property Name */}
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">{t("propertyName")}</label>
            <input
              type="text"
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
              placeholder={t("propertyNamePlaceholder")}
              className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary placeholder:text-content-quaternary"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">{t("description")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              rows={2}
              className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary placeholder:text-content-quaternary resize-none"
            />
          </div>

          {/* Frequency + Price row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">{t("frequencyLabel")}</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as AgreementFrequency)}
                className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary"
              >
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {t(`frequency.${f}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">{t("price")}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary"
              />
            </div>
          </div>

          {/* Start / End dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">{t("startDate")}</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">{t("endDate")}</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">{t("notes")}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("notesPlaceholder")}
              rows={2}
              className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary placeholder:text-content-quaternary resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-content-secondary hover:text-content-primary transition-colors"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={saving || !serviceType.trim()}
              className="px-5 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50 transition-colors"
            >
              {saving ? t("saving") : t("save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
