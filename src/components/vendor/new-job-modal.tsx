"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createVendorJob } from "@/app/actions/vendor-work-orders";

interface NewJobModalProps {
  open: boolean;
  onClose: () => void;
  tier?: "vendor" | "pro";
}

const TRADES = [
  "plumbing",
  "electrical",
  "hvac",
  "general",
  "painting",
  "flooring",
  "roofing",
  "landscaping",
  "appliance",
  "carpentry",
  "drywall",
  "pest_control",
  "locksmith",
  "cleaning",
  "other",
];

export function NewJobModal({ open, onClose, tier = "vendor" }: NewJobModalProps) {
  const t = useTranslations("vendor.jobs");
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    property_name: "",
    property_address: "",
    unit_number: "",
    description: "",
    trade: "",
    priority: "normal" as "normal" | "urgent" | "emergency",
    scheduled_date: "",
    scheduled_time_start: "",
    scheduled_time_end: "",
    tenant_name: "",
    tenant_phone: "",
  });

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const { data, error: err } = await createVendorJob({
      ...form,
      scheduled_date: form.scheduled_date || undefined,
      scheduled_time_start: form.scheduled_time_start || undefined,
      scheduled_time_end: form.scheduled_time_end || undefined,
    });

    setSaving(false);

    if (err) {
      setError(err);
      return;
    }

    if (data?.id) {
      onClose();
      router.push(`/${tier}/jobs/${data.id}`);
    }
  };

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-surface-primary rounded-xl border border-edge-primary shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-edge-primary">
          <h2 className="text-lg font-semibold text-content-primary">
            {t("newJob.title")}
          </h2>
          <p className="text-sm text-content-tertiary mt-0.5">
            {t("newJob.subtitle")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Property */}
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">
              {t("detail.property")} *
            </label>
            <input
              type="text"
              required
              value={form.property_name}
              onChange={(e) => update("property_name", e.target.value)}
              className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary placeholder:text-content-quaternary"
              placeholder={t("newJob.propertyPlaceholder")}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">
              {t("newJob.address")}
            </label>
            <input
              type="text"
              value={form.property_address}
              onChange={(e) => update("property_address", e.target.value)}
              className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary placeholder:text-content-quaternary"
              placeholder={t("newJob.addressPlaceholder")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">
                {t("detail.unit")}
              </label>
              <input
                type="text"
                value={form.unit_number}
                onChange={(e) => update("unit_number", e.target.value)}
                className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary placeholder:text-content-quaternary"
                placeholder="e.g. 101"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">
                {t("detail.trade")} *
              </label>
              <select
                required
                value={form.trade}
                onChange={(e) => update("trade", e.target.value)}
                className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary"
              >
                <option value="">{t("newJob.selectTrade")}</option>
                {TRADES.map((trade) => (
                  <option key={trade} value={trade}>
                    {trade.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">
              {t("detail.description")} *
            </label>
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary placeholder:text-content-quaternary resize-none"
              placeholder={t("newJob.descriptionPlaceholder")}
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">
              {t("newJob.priority")}
            </label>
            <div className="flex gap-2">
              {(["normal", "urgent", "emergency"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => update("priority", p)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    form.priority === p
                      ? p === "emergency"
                        ? "border-red-500 bg-red-500/10 text-red-400"
                        : p === "urgent"
                          ? "border-amber-500 bg-amber-500/10 text-amber-400"
                          : "border-brand-500 bg-brand-500/10 text-brand-400"
                      : "border-edge-primary bg-surface-secondary text-content-tertiary hover:bg-surface-tertiary"
                  }`}
                >
                  {t(`priority.${p}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">
              {t("newJob.schedule")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="date"
                value={form.scheduled_date}
                onChange={(e) => update("scheduled_date", e.target.value)}
                className="col-span-1 rounded-lg border border-edge-primary bg-surface-secondary px-2 py-2 text-sm text-content-primary"
              />
              <input
                type="time"
                value={form.scheduled_time_start}
                onChange={(e) => update("scheduled_time_start", e.target.value)}
                className="rounded-lg border border-edge-primary bg-surface-secondary px-2 py-2 text-sm text-content-primary"
              />
              <input
                type="time"
                value={form.scheduled_time_end}
                onChange={(e) => update("scheduled_time_end", e.target.value)}
                className="rounded-lg border border-edge-primary bg-surface-secondary px-2 py-2 text-sm text-content-primary"
              />
            </div>
          </div>

          {/* Tenant */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">
                {t("detail.tenant")}
              </label>
              <input
                type="text"
                value={form.tenant_name}
                onChange={(e) => update("tenant_name", e.target.value)}
                className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary placeholder:text-content-quaternary"
                placeholder={t("newJob.tenantPlaceholder")}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">
                {t("newJob.tenantPhone")}
              </label>
              <input
                type="tel"
                value={form.tenant_phone}
                onChange={(e) => update("tenant_phone", e.target.value)}
                className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary placeholder:text-content-quaternary"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-edge-primary bg-surface-secondary text-sm font-medium text-content-secondary hover:bg-surface-tertiary transition-colors"
            >
              {t("newJob.cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? t("newJob.creating") : t("newJob.create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
