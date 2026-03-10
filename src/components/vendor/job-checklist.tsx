"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  getWoChecklist,
  toggleChecklistItem,
  updateChecklistItemNotes,
  addCustomChecklistItem,
  autoApplyChecklist,
  applyTemplateToWo,
  createBlankChecklist,
  getChecklistTemplates,
  type WoChecklist,
  type ChecklistItem,
  type ChecklistTemplate,
} from "@/app/actions/vendor-checklists";

interface JobChecklistProps {
  woId: string;
  trade?: string;
  readOnly?: boolean;
}

export function JobChecklist({ woId, trade, readOnly = false }: JobChecklistProps) {
  const t = useTranslations("vendor.checklists");
  const [checklist, setChecklist] = useState<WoChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemLabel, setNewItemLabel] = useState("");
  const [newItemRequired, setNewItemRequired] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [showTemplateSelect, setShowTemplateSelect] = useState(false);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const loadChecklist = useCallback(async () => {
    const result = await getWoChecklist(woId);
    setChecklist(result.data);
    setLoading(false);
  }, [woId]);

  useEffect(() => {
    loadChecklist();
  }, [loadChecklist]);

  const handleToggle = useCallback(
    async (itemId: string) => {
      if (readOnly) return;
      setToggling(itemId);
      const result = await toggleChecklistItem(woId, itemId);
      if (!result.error) {
        await loadChecklist();
      }
      setToggling(null);
    },
    [woId, readOnly, loadChecklist]
  );

  const handleAddItem = useCallback(async () => {
    if (!newItemLabel.trim()) return;
    setAddingItem(true);
    const result = await addCustomChecklistItem(woId, newItemLabel.trim(), newItemRequired);
    if (!result.error) {
      setNewItemLabel("");
      setNewItemRequired(false);
      setShowAddItem(false);
      await loadChecklist();
    }
    setAddingItem(false);
  }, [woId, newItemLabel, newItemRequired, loadChecklist]);

  const handleNotesUpdate = useCallback(
    async (itemId: string, notes: string) => {
      await updateChecklistItemNotes(woId, itemId, notes);
      await loadChecklist();
    },
    [woId, loadChecklist]
  );

  const handleAutoApply = useCallback(async () => {
    setLoading(true);
    const result = await autoApplyChecklist(woId, trade);
    if (!result.error && result.data) {
      setChecklist(result.data);
    }
    setLoading(false);
  }, [woId, trade]);

  const handleApplyTemplate = useCallback(
    async (templateId: string) => {
      setLoading(true);
      const result = await applyTemplateToWo(woId, templateId);
      if (!result.error && result.data) {
        setChecklist(result.data);
      }
      setShowTemplateSelect(false);
      setLoading(false);
    },
    [woId]
  );

  const handleCreateBlank = useCallback(async () => {
    setLoading(true);
    const result = await createBlankChecklist(woId);
    if (!result.error && result.data) {
      setChecklist(result.data);
    }
    setLoading(false);
  }, [woId]);

  const handleLoadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    const result = await getChecklistTemplates();
    setTemplates(result.data);
    setLoadingTemplates(false);
    setShowTemplateSelect(true);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
        <div className="h-5 bg-surface-secondary rounded w-1/3 animate-pulse mb-3" />
        <div className="space-y-2">
          <div className="h-10 bg-surface-secondary rounded animate-pulse" />
          <div className="h-10 bg-surface-secondary rounded animate-pulse" />
        </div>
      </div>
    );
  }

  // No checklist yet — show setup options
  if (!checklist) {
    return (
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
        <h3 className="text-sm font-semibold text-content-primary mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t("title")}
        </h3>

        {readOnly ? (
          <p className="text-sm text-content-quaternary">{t("noChecklist")}</p>
        ) : showTemplateSelect ? (
          <div className="space-y-2">
            {loadingTemplates ? (
              <div className="h-20 bg-surface-secondary rounded animate-pulse" />
            ) : templates.length === 0 ? (
              <p className="text-sm text-content-quaternary">{t("noTemplates")}</p>
            ) : (
              templates.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => handleApplyTemplate(tmpl.id)}
                  className="w-full text-left px-3 py-2.5 rounded-lg border border-edge-secondary bg-surface-secondary hover:bg-surface-tertiary text-sm transition-colors"
                >
                  <p className="font-medium text-content-primary">{tmpl.name}</p>
                  {tmpl.trade && (
                    <p className="text-xs text-content-quaternary capitalize">{tmpl.trade}</p>
                  )}
                  <p className="text-xs text-content-quaternary">
                    {(tmpl.items as ChecklistItem[]).length} {t("items")}
                  </p>
                </button>
              ))
            )}
            <button
              onClick={() => setShowTemplateSelect(false)}
              className="text-xs text-content-tertiary hover:text-content-primary"
            >
              {t("cancel")}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleAutoApply}
              className="px-3 py-1.5 text-xs bg-brand-600 text-white rounded-lg hover:bg-brand-500 transition-colors"
            >
              {t("autoApply")}
            </button>
            <button
              onClick={handleLoadTemplates}
              className="px-3 py-1.5 text-xs bg-surface-secondary border border-edge-secondary text-content-secondary rounded-lg hover:bg-surface-tertiary transition-colors"
            >
              {t("fromTemplate")}
            </button>
            <button
              onClick={handleCreateBlank}
              className="px-3 py-1.5 text-xs bg-surface-secondary border border-edge-secondary text-content-secondary rounded-lg hover:bg-surface-tertiary transition-colors"
            >
              {t("blankChecklist")}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Render checklist
  const items = checklist.items as ChecklistItem[];
  const progress = checklist.total_count > 0
    ? Math.round((checklist.completed_count / checklist.total_count) * 100)
    : 0;

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-edge-primary">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-content-primary flex items-center gap-2">
            <svg className="w-4 h-4 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t("title")}
          </h3>
          <span className="text-xs text-content-quaternary">
            {checklist.completed_count}/{checklist.total_count}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              progress === 100 ? "bg-green-500" : "bg-brand-500"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Items */}
      <div className="divide-y divide-edge-primary/50">
        {items.map((item) => (
          <div key={item.id} className="px-4 py-2.5">
            <div className="flex items-start gap-3">
              {/* Checkbox */}
              <button
                onClick={() => handleToggle(item.id)}
                disabled={readOnly || toggling === item.id}
                className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  item.completed
                    ? "bg-green-500 border-green-500"
                    : "border-edge-secondary hover:border-brand-400"
                } ${readOnly ? "cursor-default" : "cursor-pointer"} ${
                  toggling === item.id ? "opacity-50" : ""
                }`}
              >
                {item.completed && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm ${
                      item.completed
                        ? "text-content-quaternary line-through"
                        : "text-content-primary"
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.required && (
                    <span className="text-[10px] font-medium text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                      {t("required")}
                    </span>
                  )}
                </div>

                {/* Notes preview */}
                {item.notes && !expandedItem && (
                  <p className="text-xs text-content-quaternary mt-0.5 truncate">
                    {item.notes}
                  </p>
                )}

                {/* Completed info */}
                {item.completed && item.completed_at && (
                  <p className="text-[10px] text-content-quaternary mt-0.5">
                    {new Date(item.completed_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>

              {/* Expand button */}
              {!readOnly && (
                <button
                  onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                  className="p-1 text-content-quaternary hover:text-content-secondary"
                >
                  <svg className={`w-4 h-4 transition-transform ${expandedItem === item.id ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              )}
            </div>

            {/* Expanded notes editor */}
            {expandedItem === item.id && !readOnly && (
              <div className="mt-2 ml-8">
                <textarea
                  defaultValue={item.notes ?? ""}
                  onBlur={(e) => handleNotesUpdate(item.id, e.target.value)}
                  placeholder={t("notesPlaceholder")}
                  rows={2}
                  className="w-full bg-surface-secondary border border-edge-secondary rounded-lg px-3 py-2 text-xs text-content-primary placeholder:text-content-quaternary resize-none"
                />
              </div>
            )}
          </div>
        ))}

        {items.length === 0 && (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-content-quaternary">{t("empty")}</p>
          </div>
        )}
      </div>

      {/* Add custom item */}
      {!readOnly && (
        <div className="px-4 py-3 border-t border-edge-primary bg-surface-secondary/50">
          {showAddItem ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newItemLabel}
                  onChange={(e) => setNewItemLabel(e.target.value)}
                  placeholder={t("newItemPlaceholder")}
                  className="flex-1 px-3 py-1.5 text-sm bg-surface-primary border border-edge-secondary rounded-lg text-content-primary placeholder:text-content-quaternary"
                  onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                  autoFocus
                />
                <button
                  onClick={handleAddItem}
                  disabled={addingItem || !newItemLabel.trim()}
                  className="px-3 py-1.5 text-xs bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50 transition-colors"
                >
                  {t("add")}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-content-tertiary">
                  <input
                    type="checkbox"
                    checked={newItemRequired}
                    onChange={(e) => setNewItemRequired(e.target.checked)}
                    className="rounded border-edge-secondary"
                  />
                  {t("markRequired")}
                </label>
                <button
                  onClick={() => { setShowAddItem(false); setNewItemLabel(""); }}
                  className="text-xs text-content-quaternary hover:text-content-primary"
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddItem(true)}
              className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {t("addItem")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
