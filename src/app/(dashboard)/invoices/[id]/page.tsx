import { getPmInvoiceDetail } from "@/app/actions/pm-invoices";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { INVOICE_STATUS_COLORS } from "@/lib/vendor/invoice-types";
import type { InvoiceStatus } from "@/lib/vendor/types";
import { PmInvoiceActions } from "@/components/vendor/pm-invoice-actions";
import Link from "next/link";

interface PmInvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PmInvoiceDetailPage({ params }: PmInvoiceDetailPageProps) {
  const { id } = await params;
  const t = await getTranslations("vendor.invoices");
  const { invoice, items, error } = await getPmInvoiceDetail(id);

  if (error || !invoice) {
    redirect("/invoices");
  }

  const statusColor = INVOICE_STATUS_COLORS[invoice.status as InvoiceStatus] ?? "";
  const canAct = ["submitted", "pm_approved", "processing"].includes(invoice.status);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/invoices" className="p-2 text-content-tertiary hover:text-content-primary transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-content-tertiary">{invoice.invoice_number}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
              {t(`status.${invoice.status}` as Parameters<typeof t>[0])}
            </span>
          </div>
          <h1 className="text-xl font-bold text-content-primary truncate">
            {invoice.property_name || t("untitled")}
          </h1>
        </div>
      </div>

      {/* Invoice info */}
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {invoice.property_name && (
            <div>
              <span className="text-content-tertiary">{t("propertyName")}:</span>
              <span className="ml-2 text-content-primary">{invoice.property_name}</span>
            </div>
          )}
          {invoice.unit_info && (
            <div>
              <span className="text-content-tertiary">{t("unitInfo")}:</span>
              <span className="ml-2 text-content-primary">{invoice.unit_info}</span>
            </div>
          )}
          {invoice.due_date && (
            <div>
              <span className="text-content-tertiary">{t("dueDate")}:</span>
              <span className="ml-2 text-content-primary">{new Date(invoice.due_date + "T00:00:00").toLocaleDateString()}</span>
            </div>
          )}
          {invoice.paid_at && (
            <div>
              <span className="text-content-tertiary">{t("paidAt")}:</span>
              <span className="ml-2 text-content-primary">{new Date(invoice.paid_at).toLocaleDateString()}</span>
            </div>
          )}
        </div>
        {invoice.notes && <p className="mt-3 text-sm text-content-secondary">{invoice.notes}</p>}
      </div>

      {/* Dispute reason */}
      {invoice.dispute_reason && (
        <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-red-400 mb-1">{t("disputeReason")}</h3>
          <p className="text-sm text-red-300/80">{invoice.dispute_reason}</p>
        </div>
      )}

      {/* Line items */}
      <div className="bg-surface-primary rounded-xl border border-edge-primary overflow-hidden">
        <div className="p-3 bg-surface-secondary/50 border-b border-edge-primary">
          <h2 className="text-sm font-semibold text-content-primary">{t("lineItems")}</h2>
        </div>

        {items.length > 0 && (
          <div className="hidden sm:flex items-center gap-3 py-1.5 px-3 text-xs font-medium text-content-quaternary uppercase border-b border-edge-primary/50">
            <span className="flex-1">{t("description")}</span>
            <span className="w-16 text-center">{t("type")}</span>
            <span className="w-16 text-right">{t("qty")}</span>
            <span className="w-20 text-right">{t("price")}</span>
            <span className="w-24 text-right">{t("lineTotal")}</span>
          </div>
        )}

        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 py-2 px-3 text-sm border-b border-edge-primary/50 last:border-0">
            <span className="flex-1 text-content-primary">{item.description}</span>
            <span className="text-content-tertiary text-xs uppercase w-16 text-center hidden sm:block">
              {t(`itemType.${item.item_type}` as Parameters<typeof t>[0])}
            </span>
            <span className="text-content-secondary w-16 text-right hidden sm:block">{item.quantity}</span>
            <span className="text-content-secondary w-20 text-right hidden sm:block">${Number(item.unit_price).toFixed(2)}</span>
            <span className="text-content-primary font-medium w-24 text-right">${Number(item.total).toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="bg-surface-secondary rounded-xl border border-edge-primary p-4 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-content-secondary">{t("subtotal")}</span>
          <span className="text-content-primary font-medium">${Number(invoice.subtotal).toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-content-secondary">{t("tax")} ({invoice.tax_pct}%)</span>
          <span className="text-content-primary">${Number(invoice.tax_amount).toFixed(2)}</span>
        </div>
        <div className="border-t border-edge-secondary pt-2 flex items-center justify-between">
          <span className="text-content-primary font-semibold">{t("total")}</span>
          <span className="text-lg font-bold text-brand-400">${Number(invoice.total).toFixed(2)}</span>
        </div>
      </div>

      {/* PM Actions */}
      {canAct && <PmInvoiceActions invoiceId={invoice.id} status={invoice.status} />}
    </div>
  );
}
