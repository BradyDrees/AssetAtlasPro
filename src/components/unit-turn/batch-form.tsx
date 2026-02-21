"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createBatch } from "@/app/actions/unit-turns";

interface BatchFormProps {
  onClose: () => void;
}

export function BatchForm({ onClose }: BatchFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const [name, setName] = useState("");
  const [month, setMonth] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError("");

    const result = await createBatch({
      name: name.trim(),
      month: month || null,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    onClose();
    router.push(`/unit-turns/${result.id}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-content-secondary mb-1">
          {t("forms.batchName")} <span className="text-red-500">{t("forms.required")}</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("forms.placeholders.batchName")}
          className="w-full px-3 py-2 border border-edge-secondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          autoFocus
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-content-secondary mb-1">
          {t("forms.date")} <span className="text-content-muted">{t("forms.dateOptional")}</span>
        </label>
        <input
          type="date"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-full px-3 py-2 border border-edge-secondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm text-content-tertiary hover:text-content-primary"
        >
          {t("common.cancel")}
        </button>
        <button
          type="submit"
          disabled={!name.trim() || loading}
          className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {loading ? t("forms.creating") : t("forms.createBatch")}
        </button>
      </div>
    </form>
  );
}
