"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  createChecklistTemplate,
  updateChecklistTemplate,
  deleteChecklistTemplate,
  type ChecklistTemplate,
  type ChecklistItem,
} from "@/app/actions/vendor-checklists";

interface ChecklistTemplateEditorProps {
  templates: ChecklistTemplate[];
  onRefresh: () => void;
}

export function ChecklistTemplateEditor({
  templates,
  onRefresh,
}: ChecklistTemplateEditorProps) {
  const t = useTranslations("vendor.checklists");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [trade, setTrade] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [items, setItems] = useState<Array<{ id?: string; label: string; required: boolean }>>([]);
  const [newItemLabel, setNewItemLabel] = useState("");

  const resetForm = useCallback(() => {
    setName("");
    setTrade("");
    setIsDefault(false);
    setItems([]);
    setNewItemLabel("");
  }, []);

  const startEdit = useCallback((template: ChecklistTemplate) => {
    setEditingId(template.id);
    setShowCreate(false);
    setName(template.name);
    setTrade(template.trade ?? "");
    setIsDefault(template.is_default);
    setItems(
      (template.items as ChecklistItem[]).map((i) => ({
        id: i.id,
        label: i.label,
        required: i.required,
      }))
    );
  }, []);

  const startCreate = useCallback(() => {
    setEditingId(null);
    setShowCreate(true);
    resetForm();
  }, [resetForm]);

  const handleAddItem = useCallback(() => {
    if (!newItemLabel.trim()) return;
    setItems((prev) => [...prev, { label: newItemLabel.trim(), required: false }]);
    setNewItemLabel("");
  }, [newItemLabel]);

  const handleRemoveItem = useCallback((idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleToggleRequired = useCallback((idx: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, required: !item.required } : item
      )
    );
  }, []);

  const handleMoveItem = useCallback((idx: number, direction: "up" | "down") => {
    setItems((prev) => {
      const newItems = [...prev];
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= newItems.length) return prev;
      [newItems[idx], newItems[swapIdx]] = [newItems[swapIdx], newItems[idx]];
      return newItems;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!name.trim() || items.length === 0) return;
    setSaving(true);

    if (editingId) {
      await updateChecklistTemplate(editingId, {
        name: name.trim(),
        trade: trade.trim() || undefined,
        items,
        is_default: isDefault,
      });
    } else {
      await createChecklistTemplate({
        name: name.trim(),
        trade: trade.trim() || undefined,
        items: items.map((i) => ({ label: i.label, required: i.required })),
        is_default: isDefault,
      });
    }

    setSaving(false);
    setEditingId(null);
    setShowCreate(false);
    resetForm();
    onRefresh();
  }, [editingId, name, trade, items, isDefault, resetForm, onRefresh]);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteChecklistTemplate(id);
      setDeleteConfirm(null);
      if (editingId === id) {
        setEditingId(null);
        resetForm();
      }
      onRefresh();
    },
    [editingId, resetForm, onRefresh]
  );

  const isFormActive = showCreate || editingId;

  return (
    <div className="space-y-4">
      {/* Template list */}
      {!isFormActive && (
        <>
          {templates.length === 0 ? (
            <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
              <svg className="w-10 h-10 mx-auto text-content-quaternary mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-content-tertiary mb-1">{t("noTemplates")}</p>
              <p className="text-xs text-content-quaternary mb-4">{t("noTemplatesDesc")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="bg-surface-primary rounded-xl border border-edge-primary p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-content-primary truncate">
                          {tmpl.name}
                        </h3>
                        {tmpl.is_default && (
                          <span className="text-[10px] font-medium text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded">
                            {t("default")}
                          </span>
                        )}
                      </div>
                      {tmpl.trade && (
                        <p className="text-xs text-content-quaternary capitalize mt-0.5">
                          {tmpl.trade}
                        </p>
                      )}
                      <p className="text-xs text-content-quaternary mt-1">
                        {(tmpl.items as ChecklistItem[]).length} {t("items")} •{" "}
                        {(tmpl.items as ChecklistItem[]).filter((i) => i.required).length} {t("requiredCount")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(tmpl)}
                        className="p-1.5 text-content-quaternary hover:text-content-primary transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                        </svg>
                      </button>
                      {deleteConfirm === tmpl.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(tmpl.id)}
                            className="px-2 py-1 text-[10px] bg-red-500 text-white rounded"
                          >
                            {t("confirmDelete")}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-2 py-1 text-[10px] text-content-quaternary"
                          >
                            {t("cancel")}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(tmpl.id)}
                          className="p-1.5 text-content-quaternary hover:text-red-400 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={startCreate}
            className="w-full py-2.5 rounded-xl border-2 border-dashed border-edge-secondary text-sm text-content-tertiary hover:text-content-primary hover:border-edge-primary transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t("createTemplate")}
          </button>
        </>
      )}

      {/* Create/Edit form */}
      {isFormActive && (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-5 space-y-4">
          <h3 className="text-sm font-semibold text-content-primary">
            {editingId ? t("editTemplate") : t("createTemplate")}
          </h3>

          {/* Name */}
          <div>
            <label className="text-xs font-medium text-content-secondary block mb-1">
              {t("templateName")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("templateNamePlaceholder")}
              className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary placeholder:text-content-quaternary"
            />
          </div>

          {/* Trade */}
          <div>
            <label className="text-xs font-medium text-content-secondary block mb-1">
              {t("trade")}
            </label>
            <input
              type="text"
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
              placeholder={t("tradePlaceholder")}
              className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary placeholder:text-content-quaternary"
            />
          </div>

          {/* Default toggle */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-edge-secondary"
            />
            <span className="text-xs text-content-secondary">{t("setAsDefault")}</span>
          </label>

          {/* Items list */}
          <div>
            <label className="text-xs font-medium text-content-secondary block mb-2">
              {t("checklistItems")}
            </label>

            {items.length > 0 && (
              <div className="space-y-1 mb-3">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-surface-secondary rounded-lg px-3 py-2"
                  >
                    {/* Reorder buttons */}
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => handleMoveItem(idx, "up")}
                        disabled={idx === 0}
                        className="text-content-quaternary hover:text-content-primary disabled:opacity-30"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleMoveItem(idx, "down")}
                        disabled={idx === items.length - 1}
                        className="text-content-quaternary hover:text-content-primary disabled:opacity-30"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>
                    </div>

                    <span className="flex-1 text-sm text-content-primary truncate">
                      {item.label}
                    </span>

                    <button
                      onClick={() => handleToggleRequired(idx)}
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors ${
                        item.required
                          ? "text-red-400 bg-red-500/10"
                          : "text-content-quaternary bg-surface-tertiary"
                      }`}
                    >
                      {item.required ? t("required") : t("optional")}
                    </button>

                    <button
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1 text-content-quaternary hover:text-red-400"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add item input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newItemLabel}
                onChange={(e) => setNewItemLabel(e.target.value)}
                placeholder={t("newItemPlaceholder")}
                className="flex-1 px-3 py-1.5 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary placeholder:text-content-quaternary"
                onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
              />
              <button
                onClick={handleAddItem}
                disabled={!newItemLabel.trim()}
                className="px-3 py-1.5 text-xs bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50"
              >
                {t("add")}
              </button>
            </div>
          </div>

          {/* Save / Cancel */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => {
                setEditingId(null);
                setShowCreate(false);
                resetForm();
              }}
              className="px-4 py-2 text-sm text-content-secondary hover:text-content-primary transition-colors"
            >
              {t("cancel")}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim() || items.length === 0}
              className="px-5 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50 transition-colors"
            >
              {saving ? t("saving") : t("save")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
