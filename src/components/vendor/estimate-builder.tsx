"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type {
  VendorEstimate,
  VendorEstimateSection,
  VendorEstimateItem,
} from "@/lib/vendor/estimate-types";
import type { EstimateItemType } from "@/lib/vendor/types";
import {
  updateEstimate,
  createSection,
  deleteSection as deleteSectionAction,
  createItem,
  updateItem,
  deleteItem as deleteItemAction,
  recalculateEstimateTotals,
  sendEstimateToPm,
} from "@/app/actions/vendor-estimates";
import { EstimateSectionCard } from "./estimate-section-card";
import { EstimateSummary } from "./estimate-summary";

interface EstimateBuilderProps {
  estimate: VendorEstimate;
  sections: (VendorEstimateSection & { items: VendorEstimateItem[] })[];
}

export function EstimateBuilder({
  estimate: initialEstimate,
  sections: initialSections,
}: EstimateBuilderProps) {
  const t = useTranslations("vendor.estimates");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [estimate, setEstimate] = useState(initialEstimate);
  const [sections, setSections] = useState(initialSections);
  const [saving, setSaving] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [showSendModal, setShowSendModal] = useState(false);
  const [sending, setSending] = useState(false);

  const isEditable = estimate.status === "draft" || estimate.status === "changes_requested";

  // Refresh data from server
  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  // ---- Header fields ----

  const handleFieldSave = useCallback(
    async (
      field: string,
      value: string | number
    ) => {
      setSaving(true);
      try {
        await updateEstimate(estimate.id, { [field]: value });
        setEstimate((prev) => ({ ...prev, [field]: value }));
      } finally {
        setSaving(false);
      }
    },
    [estimate.id]
  );

  // ---- Markup / Tax ----

  const handleMarkupChange = useCallback(
    async (pct: number) => {
      setEstimate((prev) => {
        const markupAmount = prev.subtotal * (pct / 100);
        const afterMarkup = prev.subtotal + markupAmount;
        const taxAmount = afterMarkup * (prev.tax_pct / 100);
        return {
          ...prev,
          markup_pct: pct,
          markup_amount: markupAmount,
          tax_amount: taxAmount,
          total: afterMarkup + taxAmount,
        };
      });
      await updateEstimate(estimate.id, { markup_pct: pct });
      await recalculateEstimateTotals(estimate.id);
      refresh();
    },
    [estimate.id, refresh]
  );

  const handleTaxChange = useCallback(
    async (pct: number) => {
      setEstimate((prev) => {
        const afterMarkup = prev.subtotal + prev.markup_amount;
        const taxAmount = afterMarkup * (pct / 100);
        return {
          ...prev,
          tax_pct: pct,
          tax_amount: taxAmount,
          total: afterMarkup + taxAmount,
        };
      });
      await updateEstimate(estimate.id, { tax_pct: pct });
      await recalculateEstimateTotals(estimate.id);
      refresh();
    },
    [estimate.id, refresh]
  );

  // ---- Sections ----

  const handleAddSection = useCallback(async () => {
    if (!newSectionName.trim()) return;
    const { data } = await createSection({
      estimate_id: estimate.id,
      name: newSectionName.trim(),
      sort_order: sections.length,
    });
    if (data) {
      setSections((prev) => [...prev, { ...data, items: [] }]);
      setNewSectionName("");
    }
  }, [estimate.id, newSectionName, sections.length]);

  const handleUpdateSection = useCallback(
    async (sectionId: string, updates: { name?: string }) => {
      const { updateSection } = await import("@/app/actions/vendor-estimates");
      await updateSection(sectionId, updates);
      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, ...updates } : s))
      );
    },
    []
  );

  const handleDeleteSection = useCallback(
    async (sectionId: string) => {
      await deleteSectionAction(sectionId);
      setSections((prev) => prev.filter((s) => s.id !== sectionId));
      await recalculateEstimateTotals(estimate.id);
      refresh();
    },
    [estimate.id, refresh]
  );

  // ---- Items ----

  const handleAddItem = useCallback(
    async (sectionId: string, description: string) => {
      const { data } = await createItem({
        section_id: sectionId,
        description,
        sort_order:
          (sections.find((s) => s.id === sectionId)?.items.length ?? 0),
      });
      if (data) {
        setSections((prev) =>
          prev.map((s) =>
            s.id === sectionId ? { ...s, items: [...s.items, data] } : s
          )
        );
      }
    },
    [sections]
  );

  const handleUpdateItem = useCallback(
    async (
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
    ) => {
      await updateItem(itemId, updates);
      await recalculateEstimateTotals(estimate.id);

      // Optimistic update for the item
      setSections((prev) =>
        prev.map((s) => ({
          ...s,
          items: s.items.map((i) => {
            if (i.id !== itemId) return i;
            const qty = updates.quantity ?? i.quantity;
            const price = updates.unit_price ?? i.unit_price;
            const mkp = updates.markup_pct ?? i.markup_pct;
            const base = qty * price;
            const total = base + base * (mkp / 100);
            return { ...i, ...updates, total } as VendorEstimateItem;
          }),
        }))
      );

      refresh();
    },
    [estimate.id, refresh]
  );

  const handleDeleteItem = useCallback(
    async (itemId: string) => {
      await deleteItemAction(itemId);
      setSections((prev) =>
        prev.map((s) => ({
          ...s,
          items: s.items.filter((i) => i.id !== itemId),
        }))
      );
      await recalculateEstimateTotals(estimate.id);
      refresh();
    },
    [estimate.id, refresh]
  );

  // ---- Send to PM ----

  const handleSend = useCallback(async () => {
    setSending(true);
    try {
      const result = await sendEstimateToPm(estimate.id);
      if (result.error) {
        alert(result.error);
        return;
      }
      setShowSendModal(false);
      router.push("/vendor/estimates");
    } finally {
      setSending(false);
    }
  }, [estimate.id, router]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back link + header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/vendor/estimates")}
          className="p-2 text-content-tertiary hover:text-content-primary transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-content-tertiary">
              {estimate.estimate_number}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                estimate.status === "draft"
                  ? "bg-gray-900/30 text-gray-400"
                  : estimate.status === "changes_requested"
                    ? "bg-amber-900/30 text-amber-400"
                    : "bg-blue-900/30 text-blue-400"
              }`}
            >
              {t(`status.${estimate.status}` as Parameters<typeof t>[0])}
            </span>
            {(saving || isPending) && (
              <span className="text-xs text-content-quaternary">
                {t("saving")}...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Change request banner */}
      {estimate.status === "changes_requested" && estimate.change_request_notes && (
        <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-amber-400 mb-1">
            {t("changesRequested")}
          </h3>
          <p className="text-sm text-amber-300/80">
            {estimate.change_request_notes}
          </p>
        </div>
      )}

      {/* Estimate header fields */}
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 space-y-4">
        <h2 className="text-sm font-semibold text-content-primary">
          {t("estimateDetails")}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-content-tertiary mb-1">
              {t("estimateTitle")}
            </label>
            <input
              type="text"
              value={estimate.title || ""}
              onChange={(e) =>
                setEstimate((prev) => ({ ...prev, title: e.target.value }))
              }
              onBlur={(e) => handleFieldSave("title", e.target.value)}
              disabled={!isEditable}
              className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary disabled:opacity-60"
              placeholder={t("titlePlaceholder")}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-content-tertiary mb-1">
              {t("propertyName")}
            </label>
            <input
              type="text"
              value={estimate.property_name || ""}
              onChange={(e) =>
                setEstimate((prev) => ({
                  ...prev,
                  property_name: e.target.value,
                }))
              }
              onBlur={(e) => handleFieldSave("property_name", e.target.value)}
              disabled={!isEditable}
              className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary disabled:opacity-60"
              placeholder={t("propertyNamePlaceholder")}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-content-tertiary mb-1">
              {t("propertyAddress")}
            </label>
            <input
              type="text"
              value={estimate.property_address || ""}
              onChange={(e) =>
                setEstimate((prev) => ({
                  ...prev,
                  property_address: e.target.value,
                }))
              }
              onBlur={(e) =>
                handleFieldSave("property_address", e.target.value)
              }
              disabled={!isEditable}
              className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary disabled:opacity-60"
              placeholder={t("addressPlaceholder")}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-content-tertiary mb-1">
              {t("unitInfo")}
            </label>
            <input
              type="text"
              value={estimate.unit_info || ""}
              onChange={(e) =>
                setEstimate((prev) => ({
                  ...prev,
                  unit_info: e.target.value,
                }))
              }
              onBlur={(e) => handleFieldSave("unit_info", e.target.value)}
              disabled={!isEditable}
              className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary disabled:opacity-60"
              placeholder={t("unitInfoPlaceholder")}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-content-tertiary mb-1">
            {t("description")}
          </label>
          <textarea
            value={estimate.description || ""}
            onChange={(e) =>
              setEstimate((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
            onBlur={(e) => handleFieldSave("description", e.target.value)}
            disabled={!isEditable}
            rows={3}
            className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary disabled:opacity-60 resize-none"
            placeholder={t("descriptionPlaceholder")}
          />
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-content-primary">
            {t("sections")}
          </h2>
          <span className="text-xs text-content-quaternary">
            {sections.length} {sections.length === 1 ? t("section") : t("sectionsLabel")}
          </span>
        </div>

        {sections.map((section) => (
          <EstimateSectionCard
            key={section.id}
            section={section}
            onUpdateSection={handleUpdateSection}
            onDeleteSection={handleDeleteSection}
            onAddItem={handleAddItem}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            readOnly={!isEditable}
          />
        ))}

        {/* Add section */}
        {isEditable && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddSection();
              }}
              placeholder={t("newSectionPlaceholder")}
              className="flex-1 px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary placeholder:text-content-quaternary"
            />
            <button
              onClick={handleAddSection}
              disabled={!newSectionName.trim()}
              className="px-4 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary hover:bg-surface-tertiary disabled:opacity-50 transition-colors flex items-center gap-1.5"
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
              {t("addSection")}
            </button>
          </div>
        )}
      </div>

      {/* Financial summary */}
      <EstimateSummary
        subtotal={Number(estimate.subtotal) || 0}
        markupPct={Number(estimate.markup_pct) || 0}
        markupAmount={Number(estimate.markup_amount) || 0}
        taxPct={Number(estimate.tax_pct) || 0}
        taxAmount={Number(estimate.tax_amount) || 0}
        total={Number(estimate.total) || 0}
        onMarkupPctChange={isEditable ? handleMarkupChange : undefined}
        onTaxPctChange={isEditable ? handleTaxChange : undefined}
        readOnly={!isEditable}
      />

      {/* Internal notes */}
      {isEditable && (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
          <label className="block text-xs font-medium text-content-tertiary mb-1">
            {t("internalNotes")}
          </label>
          <textarea
            value={estimate.internal_notes || ""}
            onChange={(e) =>
              setEstimate((prev) => ({
                ...prev,
                internal_notes: e.target.value,
              }))
            }
            onBlur={(e) => handleFieldSave("internal_notes", e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary resize-none"
            placeholder={t("internalNotesPlaceholder")}
          />
        </div>
      )}

      {/* Action buttons */}
      {isEditable && (
        <div className="flex items-center justify-end gap-3 pb-6">
          <button
            onClick={() => router.push("/vendor/estimates")}
            className="px-4 py-2 text-sm text-content-secondary hover:text-content-primary transition-colors"
          >
            {t("backToList")}
          </button>
          <button
            onClick={() => setShowSendModal(true)}
            disabled={!estimate.pm_user_id || sections.length === 0}
            className="px-5 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50 transition-colors flex items-center gap-2"
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
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
            {t("sendToPm")}
          </button>
        </div>
      )}

      {/* Send confirmation modal */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-surface-primary rounded-xl border border-edge-primary p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-semibold text-content-primary">
              {t("confirmSendTitle")}
            </h3>
            <p className="text-sm text-content-secondary">
              {t("confirmSendMessage")}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSendModal(false)}
                className="px-4 py-2 text-sm text-content-secondary hover:text-content-primary transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50 transition-colors"
              >
                {sending ? t("sending") : t("confirmSend")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
