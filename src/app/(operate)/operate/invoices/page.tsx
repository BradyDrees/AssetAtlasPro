import { getPmInvoices } from "@/app/actions/pm-invoices";
import { getTranslations, getLocale } from "next-intl/server";
import { INVOICE_STATUS_COLORS } from "@/lib/vendor/invoice-types";
import type { InvoiceStatus } from "@/lib/vendor/types";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format-date";

export default async function PmInvoicesPage() {
  const t = await getTranslations("vendor.invoices");
  const locale = (await getLocale()) as "en" | "es";
  const { data: invoices } = await getPmInvoices();

  const pending = invoices.filter((i) => ["submitted", "pm_approved", "processing"].includes(i.status));
  const closed = invoices.filter((i) => ["paid", "disputed"].includes(i.status));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader title={t("pmTitle")} />

      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-content-secondary uppercase tracking-wide">
            {t("pendingReview")} ({pending.length})
          </h2>
          {pending.map((inv) => {
            const statusColor = INVOICE_STATUS_COLORS[inv.status as InvoiceStatus] ?? "";
            return (
              <Link key={inv.id} href={`/invoices/${inv.id}`}
                className="block bg-surface-primary rounded-xl border border-edge-primary p-4 hover:border-green-500/50 transition-colors">
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
                  <span>{formatDate(inv.created_at, locale, { weekday: false })}</span>
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
        <EmptyState
          icon="receipt"
          title={t("pmNoInvoices")}
        />
      )}
    </div>
  );
}
