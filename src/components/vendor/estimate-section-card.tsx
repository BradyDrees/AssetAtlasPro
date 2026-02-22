"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { VendorEstimateSection, VendorEstimateItem } from "@/lib/vendor/estimate-types";
import type { EstimateItemType } from "@/lib/vendor/types";
import { EstimateLineItem } from "./estimate-line-item";

interface EstimateSectionCardProps {
  section: VendorEstimateSection & { items: VendorEstimateItem[] };
  onUpdateSection: (
    sectionId: string,
    updates: { name?: string }
  ) => Promise<void>;
  onDeleteSection: (sectionId: string) => Promise<void>;
  onAddItem: (sectionId: string, description: string) => Promise<void>;
  onUpdateItem: (
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
  onDeleteItem: (itemId: string) => Promise<void>;
  readOnly?: boolean;
}

export function EstimateSectionCard({
  section,
  onUpdateSection,
  onDeleteSection,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  readOnly = false,
}: EstimateSectionCardProps) {
  const t = useTranslations("vendor.estimates");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [sectionName, setSectionName] = useState(section.name);
  const [newItemDesc, setNewItemDesc] = useState("");
  const [addingItem, setAddingItem] = useState(false);

  const handleNameSave = async () => {
    if (sectionName.trim() && sectionName !== section.name) {
      await onUpdateSection(section.id, { name: sectionName.trim() });
    }
    setIsEditingName(false);
  };

  const handleAddItem = async () => {
    if (!newItemDesc.trim()) return;
    setAddingItem(true);
    try {
      await onAddItem(section.id, newItemDesc.trim());
      setNewItemDesc("");
    } finally {
      setAddingItem(false);
    }
  };

  const sectionSubtotal = section.items.reduce(
    (sum, item) => sum + Number(item.total || 0),
    0
  );

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary overflow-hidden">
      {/* Section header */}
      <div className="flex items-center gap-2 p-3 bg-surface-secondary/50 border-b border-edge-primary">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 text-content-tertiary hover:text-content-primary transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 4.5l7.5 7.5-7.5 7.5"
            />
          </svg>
        </button>

        {isEditingName && !readOnly ? (
          <input
            type="text"
            value={sectionName}
            onChange={(e) => setSectionName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleNameSave();
              if (e.key === "Escape") {
                setSectionName(section.name);
                setIsEditingName(false);
              }
            }}
            autoFocus
            className="flex-1 px-2 py-0.5 text-sm font-semibold bg-surface-primary border border-edge-secondary rounded text-content-primary"
          />
        ) : (
          <button
            onClick={() => !readOnly && setIsEditingName(true)}
            className="flex-1 text-left text-sm font-semibold text-content-primary hover:text-brand-400 transition-colors"
          >
            {section.name}
          </button>
        )}

        <span className="text-sm font-medium text-content-secondary">
          ${sectionSubtotal.toFixed(2)}
        </span>

        {!readOnly && (
          <button
            onClick={() => onDeleteSection(section.id)}
            className="p-1 text-content-quaternary hover:text-red-400 transition-colors"
            title={t("deleteSection")}
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
        )}
      </div>

      {/* Items */}
      {!isCollapsed && (
        <div>
          {/* Column headers (desktop only) */}
          {section.items.length > 0 && (
            <div className="hidden sm:flex items-center gap-3 py-1.5 px-3 text-xs font-medium text-content-quaternary uppercase border-b border-edge-primary/50">
              <span className="flex-1">{t("description")}</span>
              <span className="w-16 text-center">{t("type")}</span>
              <span className="w-16 text-right">{t("qty")}</span>
              <span className="w-20 text-right">{t("price")}</span>
              <span className="w-24 text-right">{t("lineTotal")}</span>
              {!readOnly && <span className="w-6" />}
            </div>
          )}

          {section.items.map((item) => (
            <EstimateLineItem
              key={item.id}
              item={item}
              onUpdate={onUpdateItem}
              onDelete={onDeleteItem}
              readOnly={readOnly}
            />
          ))}

          {section.items.length === 0 && (
            <div className="py-4 text-center text-sm text-content-quaternary">
              {t("noItems")}
            </div>
          )}

          {/* Add item row */}
          {!readOnly && (
            <div className="flex items-center gap-2 p-3 border-t border-edge-primary/50">
              <input
                type="text"
                value={newItemDesc}
                onChange={(e) => setNewItemDesc(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddItem();
                }}
                placeholder={t("addItemPlaceholder")}
                className="flex-1 px-3 py-1.5 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary placeholder:text-content-quaternary"
              />
              <button
                onClick={handleAddItem}
                disabled={addingItem || !newItemDesc.trim()}
                className="px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50 transition-colors flex items-center gap-1"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                {t("addItem")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
