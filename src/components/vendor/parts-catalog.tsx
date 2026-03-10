"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { CatalogItem, CreatePartInput } from "@/app/actions/vendor-inventory";
import {
  getCatalog,
  getCatalogCategories,
  createPart,
  updatePart,
  deletePart,
} from "@/app/actions/vendor-inventory";
import { PartsForm } from "./parts-form";

export function PartsCatalog() {
  const t = useTranslations("vendor.inventory");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [catalogResult, cats] = await Promise.all([
      getCatalog({
        search: search || undefined,
        category: category || undefined,
        lowStockOnly,
      }),
      getCatalogCategories(),
    ]);
    setItems(catalogResult.data);
    setCategories(cats);
    setLoading(false);
  }, [search, category, lowStockOnly]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  async function handleSave(input: CreatePartInput) {
    if (editingItem) {
      const { error } = await updatePart(editingItem.id, input);
      if (error) {
        alert(error);
        return;
      }
    } else {
      const { error } = await createPart(input);
      if (error) {
        alert(error);
        return;
      }
    }
    setShowForm(false);
    setEditingItem(null);
    fetchData();
  }

  async function handleDelete(item: CatalogItem) {
    if (!confirm(t("confirmDelete"))) return;
    const { error } = await deletePart(item.id);
    if (error) {
      alert(error);
      return;
    }
    fetchData();
  }

  function getStockStatus(item: CatalogItem): "low" | "out" | "ok" {
    if (item.current_stock <= 0) return "out";
    if (item.min_stock > 0 && item.current_stock <= item.min_stock) return "low";
    return "ok";
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-quaternary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("search")}
            className="w-full pl-10 pr-3 py-2.5 bg-surface-primary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </div>

        {/* Category filter */}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2.5 bg-surface-primary border border-edge-primary rounded-lg text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        >
          <option value="">{t("allCategories")}</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Low stock toggle */}
        <button
          onClick={() => setLowStockOnly(!lowStockOnly)}
          className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors whitespace-nowrap ${
            lowStockOnly
              ? "bg-amber-500/10 border-amber-500/30 text-amber-600"
              : "bg-surface-primary border-edge-primary text-content-secondary hover:text-content-primary"
          }`}
        >
          {t("lowStockOnly")}
        </button>

        {/* Add button */}
        <button
          onClick={() => {
            setEditingItem(null);
            setShowForm(true);
          }}
          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
        >
          + {t("addPart")}
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        /* Empty state */
        <div className="text-center py-16 bg-surface-primary rounded-xl border border-edge-primary">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-content-quaternary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
            />
          </svg>
          <p className="text-sm font-medium text-content-secondary">
            {search || category ? t("noResults") : t("noParts")}
          </p>
          {!search && !category && (
            <p className="text-xs text-content-quaternary mt-1">
              {t("noPartsHint")}
            </p>
          )}
        </div>
      ) : (
        /* Catalog grid */
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const status = getStockStatus(item);
            return (
              <div
                key={item.id}
                className="bg-surface-primary rounded-xl border border-edge-primary p-4 hover:border-edge-secondary transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-content-primary truncate">
                      {item.name}
                    </h3>
                    {item.sku && (
                      <p className="text-xs text-content-quaternary">{item.sku}</p>
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
                      status === "out"
                        ? "bg-red-500/10 text-red-600"
                        : status === "low"
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-green-500/10 text-green-600"
                    }`}
                  >
                    {status === "out"
                      ? t("outOfStock")
                      : status === "low"
                        ? t("lowStock")
                        : t("inStock")}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1 mb-3">
                  {item.category && (
                    <p className="text-xs text-content-tertiary">
                      {item.category}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-content-tertiary">
                      {item.current_stock} / {item.min_stock} {t(`units.${item.unit_of_measure}`)}
                    </span>
                    {item.unit_cost != null && (
                      <span className="text-content-secondary font-medium">
                        ${Number(item.unit_cost).toFixed(2)}
                      </span>
                    )}
                  </div>
                  {item.supplier && (
                    <p className="text-xs text-content-quaternary truncate">
                      {item.supplier}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-edge-secondary">
                  <button
                    onClick={() => {
                      setEditingItem(item);
                      setShowForm(true);
                    }}
                    className="flex-1 text-xs text-brand-600 hover:text-brand-700 font-medium py-1"
                  >
                    {t("edit")}
                  </button>
                  <div className="w-px h-4 bg-edge-secondary" />
                  <button
                    onClick={() => handleDelete(item)}
                    className="flex-1 text-xs text-red-500 hover:text-red-600 font-medium py-1"
                  >
                    {t("delete")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <PartsForm
          editItem={editingItem}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}
