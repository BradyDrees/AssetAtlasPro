"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { PricebookItem } from "@/app/actions/vendor-templates";
import {
  createPricebookItem,
  updatePricebookItem,
  deletePricebookItem,
} from "@/app/actions/vendor-templates";

interface PricebookManagerProps {
  items: PricebookItem[];
}

export function PricebookManager({ items }: PricebookManagerProps) {
  const t = useTranslations("vendor.estimates");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [itemType, setItemType] = useState("labor");
  const [unit, setUnit] = useState("each");
  const [unitPrice, setUnitPrice] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.category ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group by category
  const grouped = filtered.reduce<Record<string, PricebookItem[]>>((acc, item) => {
    const cat = item.category ?? t("pricebook.uncategorized");
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const handleAdd = useCallback(async () => {
    if (!name.trim()) return;
    setSaving(true);
    await createPricebookItem({
      name: name.trim(),
      description: description.trim() || undefined,
      item_type: itemType,
      unit,
      unit_price: parseFloat(unitPrice) || 0,
      category: category.trim() || undefined,
    });
    setName("");
    setDescription("");
    setUnitPrice("");
    setCategory("");
    setShowAdd(false);
    setSaving(false);
    startTransition(() => router.refresh());
  }, [name, description, itemType, unit, unitPrice, category, router]);

  const handleDelete = useCallback(
    async (id: string) => {
      await deletePricebookItem(id);
      startTransition(() => router.refresh());
    },
    [router]
  );

  return (
    <div className="space-y-4">
      {/* Search + Add */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t("pricebook.searchPlaceholder")}
          className="flex-1 rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2.5 text-sm text-content-primary placeholder:text-content-quaternary"
        />
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {t("pricebook.addItem")}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("pricebook.namePlaceholder")}
              className="rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary placeholder:text-content-quaternary"
            />
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={t("pricebook.categoryPlaceholder")}
              className="rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary placeholder:text-content-quaternary"
            />
            <select
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
              className="rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary"
            >
              {["labor", "material", "equipment", "subcontractor", "other"].map((t2) => (
                <option key={t2} value={t2}>{t(`itemType.${t2}`)}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="number"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder={t("unitPrice")}
                step="0.01"
                className="flex-1 rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary placeholder:text-content-quaternary"
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-24 rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary"
              >
                {["each", "hour", "sqft", "lnft", "day", "lot", "unit"].map((u) => (
                  <option key={u} value={u}>{t(`unit.${u}`)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 rounded-lg text-sm text-content-secondary hover:bg-surface-secondary"
            >
              {t("cancel")}
            </button>
            <button
              onClick={handleAdd}
              disabled={saving || !name.trim()}
              className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium disabled:opacity-50"
            >
              {saving ? t("saving") : t("pricebook.addItem")}
            </button>
          </div>
        </div>
      )}

      {/* Items grouped by category */}
      {Object.keys(grouped).length === 0 ? (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
          <p className="text-content-tertiary text-sm">{t("pricebook.noItems")}</p>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat} className="bg-surface-primary rounded-xl border border-edge-primary overflow-hidden">
            <div className="px-4 py-2 bg-surface-secondary/50 border-b border-edge-secondary">
              <h3 className="text-xs font-medium text-content-tertiary uppercase">{cat}</h3>
            </div>
            <div className="divide-y divide-edge-secondary/50">
              {catItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-content-primary">{item.name}</p>
                    <p className="text-xs text-content-quaternary">
                      {item.item_type} · {item.unit} · ${Number(item.unit_price).toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg hover:bg-surface-secondary text-content-quaternary hover:text-red-400"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
