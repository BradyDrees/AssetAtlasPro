"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { getChecklistTemplates, type ChecklistTemplate } from "@/app/actions/vendor-checklists";
import { ChecklistTemplateEditor } from "@/components/vendor/checklist-template-editor";

export default function ChecklistTemplatesPage() {
  const t = useTranslations("vendor.checklists");
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    const result = await getChecklistTemplates();
    setTemplates(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/vendor/profile/settings"
          className="p-2 text-content-tertiary hover:text-content-primary transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-content-primary">{t("templatesTitle")}</h1>
          <p className="text-xs text-content-tertiary">{t("templatesDescription")}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-surface-primary rounded-xl border border-edge-primary p-4 animate-pulse">
              <div className="h-5 bg-surface-secondary rounded w-1/2 mb-2" />
              <div className="h-3 bg-surface-secondary rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <ChecklistTemplateEditor
          templates={templates}
          onRefresh={loadTemplates}
        />
      )}
    </div>
  );
}
