"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { getVendorInvoices } from "@/app/actions/vendor-invoices";
import type { VendorInvoice } from "@/lib/vendor/invoice-types";
import type { InvoiceStatus } from "@/lib/vendor/types";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { InvoiceCard } from "@/components/vendor/invoice-card";

const PIPELINE_STATUSES: InvoiceStatus[] = ["draft", "submitted", "pm_approved", "processing"];
const CLOSED_STATUSES: InvoiceStatus[] = ["paid", "disputed"];

export default function VendorInvoicesPage() {
  const t = useTranslations("vendor.invoices");
  const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pipeline" | "closed">("pipeline");

  const load = useCallback(async () => {
    setLoading(true);
    const statuses = tab === "pipeline" ? PIPELINE_STATUSES : CLOSED_STATUSES;
    const { data } = await getVendorInvoices({ status: statuses });
    setInvoices(data);
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  // Pipeline counts
  const pipelineCounts = {
    draft: invoices.filter((i) => i.status === "draft").length,
    submitted: invoices.filter((i) => i.status === "submitted").length,
    pm_approved: invoices.filter((i) => i.status === "pm_approved").length,
    processing: invoices.filter((i) => i.status === "processing").length,
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <Link
            href="/vendor/invoices/new"
            className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-500 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t("new")}
          </Link>
        }
      />

      {/* Pipeline visualization */}
      {tab === "pipeline" && !loading && invoices.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {(["draft", "submitted", "pm_approved", "processing"] as const).map((s) => (
            <div key={s} className="bg-surface-primary rounded-lg border border-edge-primary p-3 text-center">
              <p className="text-lg font-bold text-content-primary">{pipelineCounts[s]}</p>
              <p className="text-xs text-content-tertiary">{t(`status.${s}` as Parameters<typeof t>[0])}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-secondary rounded-lg p-1">
        <button
          onClick={() => setTab("pipeline")}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "pipeline" ? "bg-surface-primary text-content-primary shadow-sm" : "text-content-tertiary hover:text-content-secondary"
          }`}
        >
          {t("pipeline")}
        </button>
        <button
          onClick={() => setTab("closed")}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "closed" ? "bg-surface-primary text-content-primary shadow-sm" : "text-content-tertiary hover:text-content-secondary"
          }`}
        >
          {t("closed")}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface-primary rounded-xl border border-edge-primary p-4 animate-pulse">
              <div className="h-4 bg-surface-secondary rounded w-3/4 mb-2" />
              <div className="h-3 bg-surface-secondary rounded w-1/2 mb-3" />
              <div className="h-3 bg-surface-secondary rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <EmptyState
          icon="receipt"
          title={t("noInvoices")}
          subtitle={t("emptySubtitle")}
          action={tab === "pipeline" ? { label: t("createFirst"), href: "/vendor/invoices/new" } : undefined}
        />
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <InvoiceCard key={inv.id} invoice={inv} />
          ))}
        </div>
      )}
    </div>
  );
}
