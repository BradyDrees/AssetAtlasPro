import { getPmInvoices } from "@/app/actions/pm-invoices";
import { getTranslations } from "next-intl/server";
import { INVOICE_STATUS_COLORS } from "@/lib/vendor/invoice-types";
import type { InvoiceStatus } from "@/lib/vendor/types";
import Link from "next/link";

export default async function PmInvoicesPage() {
  const t = await getTranslations("vendor.invoices");
  const { data: invoices } = await getPmInvoices();

  const pending = invoices.filter((i) => ["submitted", "pm_approved", "processing"].includes(i.status));
  const closed = invoices.filter((i) => ["paid", "disputed"].includes(i.status));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-content-primary">{t("pmTitle")}</h1>

      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-content-secondary uppercase tracking-wide">
            {t("pendingReview")} ({pending.length})
          </h2>
          {pending.map((inv) => {
            const statusColor = INVOICE_STATUS_COLORS[inv.status as InvoiceStatus] ?? "";
            return (
              <Link key={inv.id} href={`/invoices/${inv.id}`}
                className="block bg-surface-primary rounded-xl border border-edge-primary p-4 hover:border-brand-500/50 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-mono text-content-tertiary">{inv.invoice_number}</span>
                    <h3 className="text-sm font-semibold text-content-primary truncate">
                      {inv.property_name || t("untitled")}
                    </h3>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusColor}`}>
                    {t(`status.${inv.status}` as Parameters<typeof t>[0])}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-content-tertiary">
                  <span>{new Date(inv.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                  <span className="font-semibold text-content-primary text-sm">
                    ${Number(inv.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {closed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-content-secondary uppercase tracking-wide">
            {t("closed")} ({closed.length})
          </h2>
          {closed.map((inv) => {
            const statusColor = INVOICE_STATUS_COLORS[inv.status as InvoiceStatus] ?? "";
            return (
              <Link key={inv.id} href={`/invoices/${inv.id}`}
                className="block bg-surface-primary rounded-xl border border-edge-primary p-4 hover:border-edge-secondary transition-colors opacity-80">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-content-secondary truncate">{inv.property_name || t("untitled")}</h3>
                    <span className="text-xs text-content-quaternary">{inv.invoice_number}</span>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                      {t(`status.${inv.status}` as Parameters<typeof t>[0])}
                    </span>
                    <p className="text-xs text-content-tertiary mt-1">
                      ${Number(inv.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {invoices.length === 0 && (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
          <svg className="w-12 h-12 text-content-quaternary mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="text-content-tertiary">{t("pmNoInvoices")}</p>
        </div>
      )}
    </div>
  );
}
