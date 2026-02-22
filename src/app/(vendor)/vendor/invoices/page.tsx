"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { getVendorInvoices } from "@/app/actions/vendor-invoices";
import type { VendorInvoice } from "@/lib/vendor/invoice-types";
import type { InvoiceStatus } from "@/lib/vendor/types";
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-content-primary">{t("title")}</h1>
        <Link
          href="/vendor/invoices/new"
          className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-500 transition-colors flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {t("new")}
        </Link>
      </div>

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
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
          <svg className="w-12 h-12 text-content-quaternary mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="text-content-tertiary">{t("noInvoices")}</p>
          {tab === "pipeline" && (
            <Link href="/vendor/invoices/new" className="inline-flex items-center gap-1.5 mt-3 text-sm text-brand-400 hover:text-brand-300 transition-colors">
              {t("createFirst")}
            </Link>
          )}
        </div>
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
