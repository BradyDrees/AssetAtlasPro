"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { getRecurringTemplates } from "@/app/actions/vendor-recurring-invoices";
import type { RecurringInvoiceTemplate } from "@/lib/vendor/recurring-invoice-types";
import { RecurringInvoiceCard } from "@/components/vendor/recurring-invoice-card";
import { RecurringInvoiceForm } from "@/components/vendor/recurring-invoice-form";

export default function RecurringInvoicesPage() {
  const t = useTranslations("vendor.recurring");
  const [templates, setTemplates] = useState<RecurringInvoiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "paused" | "cancelled">("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    const statusFilter = filter === "all" ? undefined : filter;
    const { data } = await getRecurringTemplates(
      statusFilter ? { status: statusFilter as "active" | "paused" | "cancelled" } : undefined
    );
    setTemplates(data);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Link
        href="/pro/invoices"
        className="inline-flex items-center gap-1 text-sm text-content-tertiary hover:text-content-primary"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        {t("backToInvoices")}
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-content-primary">{t("title")}</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors"
        >
          {t("create")}
        </button>
      </div>

      <div className="flex gap-2">
        {(["all", "active", "paused", "cancelled"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f
                ? "bg-brand-600 text-white"
                : "bg-surface-secondary text-content-secondary hover:bg-surface-tertiary"
            }`}
          >
            {t(`filter.${f}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface-primary rounded-xl border border-edge-primary p-5 animate-pulse">
              <div className="h-5 bg-surface-secondary rounded w-1/3 mb-3" />
              <div className="h-4 bg-surface-secondary rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
          <p className="text-content-tertiary text-sm">{t("noTemplates")}</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-3 px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors"
          >
            {t("createFirst")}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((tpl) => (
            <RecurringInvoiceCard
              key={tpl.id}
              template={tpl}
              onMutate={loadData}
              basePath="/pro/invoices"
            />
          ))}
        </div>
      )}

      {showCreate && (
        <RecurringInvoiceForm
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
