"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  createDocumentTemplate,
  updateDocumentTemplate,
  deleteDocumentTemplate,
} from "@/app/actions/vendor-document-templates";
import type { VendorDocumentTemplate } from "@/lib/vendor/expense-types";
import type { DocumentTemplateType } from "@/lib/vendor/types";

const TEMPLATE_TYPES: DocumentTemplateType[] = [
  "terms",
  "contract",
  "warranty",
  "scope",
  "cover",
  "other",
];

const TYPE_COLORS: Record<string, string> = {
  terms: "bg-blue-500/20 text-blue-400",
  contract: "bg-purple-500/20 text-purple-400",
  warranty: "bg-green-500/20 text-green-400",
  scope: "bg-yellow-500/20 text-yellow-400",
  cover: "bg-pink-500/20 text-pink-400",
  other: "bg-gray-500/20 text-gray-400",
};

interface DocumentTemplateManagerProps {
  initialTemplates: VendorDocumentTemplate[];
}

export function DocumentTemplateManager({
  initialTemplates,
}: DocumentTemplateManagerProps) {
  const t = useTranslations("vendor.estimates");
  const [isPending, startTransition] = useTransition();
  const [templates, setTemplates] =
    useState<VendorDocumentTemplate[]>(initialTemplates);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<DocumentTemplateType>("terms");
  const [formContent, setFormContent] = useState("");
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function resetForm() {
    setFormName("");
    setFormType("terms");
    setFormContent("");
    setFormIsDefault(false);
    setEditingId(null);
    setShowForm(false);
  }

  function handleNew() {
    resetForm();
    setShowForm(true);
  }

  function handleEdit(tpl: VendorDocumentTemplate) {
    setEditingId(tpl.id);
    setFormName(tpl.name);
    setFormType(tpl.type as DocumentTemplateType);
    setFormContent(tpl.content);
    setFormIsDefault(tpl.is_default);
    setShowForm(true);
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteDocumentTemplate(id);
      if (result.success) {
        setTemplates((prev) => prev.filter((tp) => tp.id !== id));
      }
    });
  }

  function handleSave() {
    if (!formName.trim() || !formContent.trim()) return;

    startTransition(async () => {
      if (editingId) {
        const result = await updateDocumentTemplate(editingId, {
          name: formName.trim(),
          type: formType,
          content: formContent.trim(),
          is_default: formIsDefault,
        });
        if (result.success) {
          setTemplates((prev) => {
            let updated = prev.map((tp) =>
              tp.id === editingId
                ? { ...tp, name: formName.trim(), type: formType, content: formContent.trim(), is_default: formIsDefault }
                : tp
            );
            if (formIsDefault) {
              updated = updated.map((tp) =>
                tp.id !== editingId && tp.type === formType
                  ? { ...tp, is_default: false }
                  : tp
              );
            }
            return updated;
          });
          setMessage(t("templates.updated"));
          resetForm();
        }
      } else {
        const result = await createDocumentTemplate({
          name: formName.trim(),
          type: formType,
          content: formContent.trim(),
          is_default: formIsDefault,
        });
        if (result.template) {
          setTemplates((prev) => {
            let updated = [...prev, result.template!];
            if (formIsDefault) {
              updated = updated.map((tp) =>
                tp.id !== result.template!.id && tp.type === formType
                  ? { ...tp, is_default: false }
                  : tp
              );
            }
            return updated;
          });
          setMessage(t("templates.created"));
          resetForm();
        }
      }
      setTimeout(() => setMessage(null), 3000);
    });
  }

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-content-primary">
          {t("docTemplates.title")}
        </h2>
        <button
          onClick={handleNew}
          className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          {t("templates.newTemplate")}
        </button>
      </div>

      {/* Success message */}
      {message && (
        <div className="mb-4 px-4 py-2 bg-green-500/20 text-green-400 text-sm rounded-lg">
          {message}
        </div>
      )}

      {/* Create / Edit Form */}
      {showForm && (
        <div className="mb-6 bg-surface-secondary rounded-lg border border-edge-primary p-4 space-y-4">
          <h3 className="text-sm font-semibold text-content-primary">
            {editingId
              ? t("templates.editTemplate")
              : t("templates.newTemplate")}
          </h3>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">
              {t("templates.templateName")}
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-3 py-2 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">
              {t("templates.type")}
            </label>
            <select
              value={formType}
              onChange={(e) =>
                setFormType(e.target.value as DocumentTemplateType)
              }
              className="w-full px-3 py-2 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-brand-600"
            >
              {TEMPLATE_TYPES.map((tp) => (
                <option key={tp} value={tp}>
                  {t("docTemplates.types." + tp)}
                </option>
              ))}
            </select>
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">
              {t("templates.content")}
            </label>
            <textarea
              rows={8}
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              className="w-full px-3 py-2 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-brand-600 resize-y"
            />
          </div>

          {/* Default checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formIsDefault}
              onChange={(e) => setFormIsDefault(e.target.checked)}
              className="w-4 h-4 rounded border-edge-primary text-brand-600 focus:ring-brand-600"
            />
            <span className="text-sm text-content-secondary">
              {t("templates.setDefault")}
            </span>
          </label>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={isPending || !formName.trim() || !formContent.trim()}
              className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {isPending
                ? "..."
                : editingId
                  ? t("templates.update")
                  : t("templates.create")}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 text-content-secondary text-sm font-medium hover:text-content-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Template list */}
      {templates.length === 0 && !showForm ? (
        <p className="text-sm text-content-muted py-8 text-center">
          {t("docTemplates.noTemplates")}
        </p>
      ) : (
        <div className="space-y-2">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="flex items-center gap-3 bg-surface-secondary rounded-lg border border-edge-primary px-4 py-3"
            >
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-content-primary truncate">
                    {tpl.name}
                  </span>
                  <span
                    className={
                      "px-2 py-0.5 text-xs font-medium rounded-full " +
                      (TYPE_COLORS[tpl.type] || TYPE_COLORS.other)
                    }
                  >
                    {t("docTemplates.types." + tpl.type)}
                  </span>
                  {tpl.is_default && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-brand-500/20 text-brand-400">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-xs text-content-muted truncate">
                  {tpl.content.length > 100
                    ? tpl.content.slice(0, 100) + "..."
                    : tpl.content}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleEdit(tpl)}
                  className="p-2 text-content-secondary hover:text-content-primary transition-colors"
                  title="Edit"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(tpl.id)}
                  disabled={isPending}
                  className="p-2 text-content-secondary hover:text-red-400 disabled:opacity-50 transition-colors"
                  title="Delete"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
