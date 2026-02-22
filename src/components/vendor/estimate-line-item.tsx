"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { VendorEstimateItem } from "@/lib/vendor/estimate-types";
import type { EstimateItemType } from "@/lib/vendor/types";

interface EstimateLineItemProps {
  item: VendorEstimateItem;
  onUpdate: (
    itemId: string,
    updates: Partial<{
      description: string;
      item_type: EstimateItemType;
      quantity: number;
      unit: string;
      unit_price: number;
      markup_pct: number;
      notes: string;
    }>
  ) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  readOnly?: boolean;
}

const ITEM_TYPES: EstimateItemType[] = [
  "labor",
  "material",
  "equipment",
  "subcontractor",
  "other",
];

const UNIT_OPTIONS = ["each", "hour", "sqft", "lnft", "day", "lot", "unit"];

export function EstimateLineItem({
  item,
  onUpdate,
  onDelete,
  readOnly = false,
}: EstimateLineItemProps) {
  const t = useTranslations("vendor.estimates");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [description, setDescription] = useState(item.description);
  const [itemType, setItemType] = useState<EstimateItemType>(item.item_type);
  const [quantity, setQuantity] = useState(item.quantity);
  const [unit, setUnit] = useState(item.unit);
  const [unitPrice, setUnitPrice] = useState(item.unit_price);
  const [notes, setNotes] = useState(item.notes || "");

  const lineTotal = quantity * unitPrice;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(item.id, {
        description,
        item_type: itemType,
        quantity,
        unit,
        unit_price: unitPrice,
        notes: notes || undefined,
      });
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(item.id);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    setDescription(item.description);
    setItemType(item.item_type);
    setQuantity(item.quantity);
    setUnit(item.unit);
    setUnitPrice(item.unit_price);
    setNotes(item.notes || "");
    setIsEditing(false);
  };

  if (readOnly) {
    return (
      <div className="flex items-center gap-3 py-2 px-3 text-sm border-b border-edge-primary/50 last:border-0">
        <span className="flex-1 text-content-primary">{item.description}</span>
        <span className="text-content-tertiary text-xs uppercase w-16 text-center">
          {t(`itemType.${item.item_type}` as Parameters<typeof t>[0])}
        </span>
        <span className="text-content-secondary w-16 text-right">
          {item.quantity} {item.unit}
        </span>
        <span className="text-content-secondary w-20 text-right">
          ${Number(item.unit_price).toFixed(2)}
        </span>
        <span className="text-content-primary font-medium w-24 text-right">
          ${Number(item.total).toFixed(2)}
        </span>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="bg-surface-tertiary/30 rounded-lg p-3 space-y-3 border border-edge-secondary">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("itemDescription")}
            className="col-span-full px-3 py-1.5 text-sm bg-surface-primary border border-edge-secondary rounded-lg text-content-primary placeholder:text-content-quaternary"
          />
          <select
            value={itemType}
            onChange={(e) => setItemType(e.target.value as EstimateItemType)}
            className="px-3 py-1.5 text-sm bg-surface-primary border border-edge-secondary rounded-lg text-content-primary"
          >
            {ITEM_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`itemType.${type}` as Parameters<typeof t>[0])}
              </option>
            ))}
          </select>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="px-3 py-1.5 text-sm bg-surface-primary border border-edge-secondary rounded-lg text-content-primary"
          >
            {UNIT_OPTIONS.map((u) => (
              <option key={u} value={u}>
                {t(`unit.${u}` as Parameters<typeof t>[0])}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <label className="text-xs text-content-tertiary whitespace-nowrap">
              {t("qty")}
            </label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1.5 text-sm bg-surface-primary border border-edge-secondary rounded-lg text-content-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-content-tertiary whitespace-nowrap">
              {t("unitPrice")}
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={unitPrice}
              onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1.5 text-sm bg-surface-primary border border-edge-secondary rounded-lg text-content-primary"
            />
          </div>
        </div>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("itemNotes")}
          className="w-full px-3 py-1.5 text-sm bg-surface-primary border border-edge-secondary rounded-lg text-content-primary placeholder:text-content-quaternary"
        />
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-content-primary">
            {t("lineTotal")}: ${lineTotal.toFixed(2)}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="px-3 py-1 text-xs text-content-secondary hover:text-content-primary transition-colors"
            >
              {t("cancel")}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !description.trim()}
              className="px-3 py-1 text-xs bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50 transition-colors"
            >
              {saving ? t("saving") : t("save")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2 py-2 px-3 text-sm border-b border-edge-primary/50 last:border-0 hover:bg-surface-secondary/50 transition-colors">
      <button
        onClick={() => setIsEditing(true)}
        className="flex-1 text-left flex items-center gap-3"
      >
        <span className="flex-1 text-content-primary">{item.description}</span>
        <span className="text-content-tertiary text-xs uppercase w-16 text-center hidden sm:block">
          {t(`itemType.${item.item_type}` as Parameters<typeof t>[0])}
        </span>
        <span className="text-content-secondary w-16 text-right hidden sm:block">
          {item.quantity} {item.unit}
        </span>
        <span className="text-content-secondary w-20 text-right hidden sm:block">
          ${Number(item.unit_price).toFixed(2)}
        </span>
        <span className="text-content-primary font-medium w-24 text-right">
          ${Number(item.total).toFixed(2)}
        </span>
      </button>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300 transition-all"
        title={t("deleteItem")}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
          />
        </svg>
      </button>
    </div>
  );
}
