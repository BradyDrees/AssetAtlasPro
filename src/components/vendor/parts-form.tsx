"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import type { CatalogItem, CreatePartInput } from "@/app/actions/vendor-inventory";

interface PartsFormProps {
  editItem?: CatalogItem | null;
  onSave: (input: CreatePartInput) => Promise<void>;
  onCancel: () => void;
}

const UNIT_OPTIONS = ["each", "foot", "roll", "box", "bag", "gallon", "pound"] as const;

export function PartsForm({ editItem, onSave, onCancel }: PartsFormProps) {
  const t = useTranslations("vendor.inventory");
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(editItem?.name ?? "");
  const [sku, setSku] = useState(editItem?.sku ?? "");
  const [category, setCategory] = useState(editItem?.category ?? "");
  const [unitCost, setUnitCost] = useState(
    editItem?.unit_cost != null ? String(editItem.unit_cost) : ""
  );
  const [supplier, setSupplier] = useState(editItem?.supplier ?? "");
  const [currentStock, setCurrentStock] = useState(
    editItem ? String(editItem.current_stock) : "0"
  );
  const [minStock, setMinStock] = useState(
    editItem ? String(editItem.min_stock) : "0"
  );
  const [unit, setUnit] = useState(editItem?.unit_of_measure ?? "each");

  // Reset form when editItem changes
  useEffect(() => {
    if (editItem) {
      setName(editItem.name);
      setSku(editItem.sku ?? "");
      setCategory(editItem.category ?? "");
      setUnitCost(editItem.unit_cost != null ? String(editItem.unit_cost) : "");
      setSupplier(editItem.supplier ?? "");
      setCurrentStock(String(editItem.current_stock));
      setMinStock(String(editItem.min_stock));
      setUnit(editItem.unit_of_measure ?? "each");
    }
  }, [editItem]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        sku: sku.trim() || undefined,
        category: category.trim() || undefined,
        unit_cost: unitCost ? Number(unitCost) : undefined,
        supplier: supplier.trim() || undefined,
        current_stock: Number(currentStock) || 0,
        min_stock: Number(minStock) || 0,
        unit_of_measure: unit,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-surface-primary rounded-xl border border-edge-primary shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="p-5 space-y-4">
          <h2 className="text-lg font-semibold text-content-primary">
            {editItem ? t("edit") : t("addPart")}
          </h2>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">
              {t("name")} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              required
              className="w-full p-2.5 bg-surface-primary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>

          {/* SKU + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">
                {t("sku")}
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder={t("skuPlaceholder")}
                className="w-full p-2.5 bg-surface-primary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">
                {t("category")}
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder={t("categoryPlaceholder")}
                className="w-full p-2.5 bg-surface-primary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
          </div>

          {/* Unit Cost + Supplier */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">
                {t("unitCost")}
              </label>
              <input
                type="number"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full p-2.5 bg-surface-primary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">
                {t("supplier")}
              </label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder={t("supplierPlaceholder")}
                className="w-full p-2.5 bg-surface-primary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
          </div>

          {/* Stock + Min Stock + Unit */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">
                {t("currentStock")}
              </label>
              <input
                type="number"
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
                min="0"
                className="w-full p-2.5 bg-surface-primary border border-edge-primary rounded-lg text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">
                {t("minStock")}
              </label>
              <input
                type="number"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                min="0"
                className="w-full p-2.5 bg-surface-primary border border-edge-primary rounded-lg text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">
                {t("unitOfMeasure")}
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full p-2.5 bg-surface-primary border border-edge-primary rounded-lg text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {t(`units.${u}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-edge-primary">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-content-secondary hover:text-content-primary transition-colors"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {saving ? t("saving") : t("save")}
          </button>
        </div>
      </form>
    </div>
  );
}
