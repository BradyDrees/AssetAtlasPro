"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { VendorWoMaterial } from "@/lib/vendor/work-order-types";
import {
  addMaterial,
  deleteMaterial,
} from "@/app/actions/vendor-work-orders";
import { getCatalog, decrementStock } from "@/app/actions/vendor-inventory";
import type { CatalogItem } from "@/app/actions/vendor-inventory";

interface MaterialsLogProps {
  workOrderId: string;
  materials: VendorWoMaterial[];
  readOnly?: boolean;
  onMutate?: () => void | Promise<void>;
}

export function MaterialsLog({
  workOrderId,
  materials,
  readOnly = false,
  onMutate,
}: MaterialsLogProps) {
  const t = useTranslations("vendor.jobs");
  const it = useTranslations("vendor.inventory");
  const [showAdd, setShowAdd] = useState(false);
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [loading, setLoading] = useState(false);

  // Catalog autocomplete state
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<CatalogItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Load catalog items when add form is shown
  useEffect(() => {
    if (showAdd) {
      getCatalog().then(({ data }) => setCatalogItems(data));
    }
  }, [showAdd]);

  // Filter suggestions based on description input
  useEffect(() => {
    if (description.trim().length < 2) {
      setFilteredItems([]);
      setShowSuggestions(false);
      return;
    }
    const query = description.toLowerCase();
    const matches = catalogItems.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        (item.sku && item.sku.toLowerCase().includes(query))
    );
    setFilteredItems(matches.slice(0, 8));
    setShowSuggestions(matches.length > 0);
  }, [description, catalogItems]);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectCatalogItem(item: CatalogItem) {
    setDescription(item.name);
    setUnitCost(item.unit_cost != null ? String(item.unit_cost) : "");
    setSelectedCatalogId(item.id);
    setShowSuggestions(false);
  }

  const totalCost = materials.reduce(
    (sum, m) => sum + (Number(m.total) || 0),
    0
  );

  async function handleAdd() {
    if (!description.trim() || !unitCost) return;
    setLoading(true);

    const qty = Number(quantity) || 1;
    const cost = Number(unitCost) || 0;

    const { error } = await addMaterial({
      work_order_id: workOrderId,
      description: description.trim(),
      quantity: qty,
      unit_cost: cost,
      catalog_item_id: selectedCatalogId || undefined,
    });

    if (error) {
      setLoading(false);
      alert(error);
      return;
    }

    // Decrement stock if linked to catalog item
    if (selectedCatalogId) {
      await decrementStock(selectedCatalogId, qty);
    }

    setDescription("");
    setQuantity("1");
    setUnitCost("");
    setSelectedCatalogId(null);
    setShowAdd(false);
    setLoading(false);
    onMutate?.();
  }

  async function handleDelete(materialId: string) {
    const { error } = await deleteMaterial(materialId, workOrderId);
    if (error) {
      alert(error);
    } else {
      onMutate?.();
    }
  }

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-content-primary">
          {t("materials.title")}
        </h3>
        {!readOnly && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium"
          >
            {showAdd ? t("materials.description") && "Cancel" : `+ ${t("materials.add")}`}
          </button>
        )}
      </div>

      {/* Add material form */}
      {showAdd && (
        <div className="mb-4 p-3 bg-surface-secondary rounded-lg space-y-2">
          {/* Description with catalog autocomplete */}
          <div className="relative" ref={suggestionsRef}>
            <input
              type="text"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setSelectedCatalogId(null);
              }}
              onFocus={() => {
                if (filteredItems.length > 0) setShowSuggestions(true);
              }}
              placeholder={t("materials.description")}
              className="w-full p-2 bg-surface-primary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
            {selectedCatalogId && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium px-1.5 py-0.5 bg-brand-500/10 text-brand-600 rounded">
                {it("title")}
              </span>
            )}

            {/* Suggestions dropdown */}
            {showSuggestions && filteredItems.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-surface-primary border border-edge-primary rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectCatalogItem(item)}
                    className="flex items-center justify-between w-full px-3 py-2 text-left hover:bg-surface-secondary transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-content-primary truncate">{item.name}</p>
                      {item.sku && (
                        <p className="text-xs text-content-quaternary">{item.sku}</p>
                      )}
                    </div>
                    {item.unit_cost != null && (
                      <span className="text-xs text-content-secondary font-medium ml-2 flex-shrink-0">
                        ${Number(item.unit_cost).toFixed(2)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={t("materials.quantity")}
              min="0.01"
              step="0.01"
              className="w-20 p-2 bg-surface-primary border border-edge-primary rounded-lg text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
            <input
              type="number"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              placeholder={t("materials.unitCost")}
              min="0"
              step="0.01"
              className="flex-1 p-2 bg-surface-primary border border-edge-primary rounded-lg text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
            <button
              onClick={handleAdd}
              disabled={loading || !description.trim() || !unitCost}
              className="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {loading ? "..." : "+"}
            </button>
          </div>
        </div>
      )}

      {/* Materials list */}
      {materials.length === 0 ? (
        <p className="text-xs text-content-quaternary">
          {t("materials.noMaterials")}
        </p>
      ) : (
        <div className="space-y-2">
          {materials.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between py-2 border-b border-edge-secondary last:border-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-content-primary truncate">
                  {m.description}
                </p>
                <p className="text-xs text-content-tertiary">
                  {m.quantity} × ${Number(m.unit_cost).toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-content-primary">
                  ${Number(m.total).toFixed(2)}
                </span>
                {!readOnly && (
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="text-content-quaternary hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <span className="text-sm font-semibold text-content-primary">
              {t("materials.total")}: ${totalCost.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
