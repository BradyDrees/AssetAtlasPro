"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { VendorInvoice } from "@/lib/vendor/invoice-types";
import { INVOICE_STATUS_COLORS } from "@/lib/vendor/invoice-types";
import type { InvoiceStatus } from "@/lib/vendor/types";

interface InvoiceCardProps {
  invoice: VendorInvoice;
}

export function InvoiceCard({ invoice }: InvoiceCardProps) {
  const t = useTranslations("vendor.invoices");

  const statusColor =
    INVOICE_STATUS_COLORS[invoice.status as InvoiceStatus] ?? "";

  const formattedDate = new Date(invoice.created_at).toLocaleDateString(
    undefined,
    { month: "short", day: "numeric", year: "numeric" }
  );

  return (
    <Link
      href={`/vendor/invoices/${invoice.id}`}
      className="block bg-surface-primary rounded-xl border border-edge-primary p-4 hover:border-brand-500/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-content-tertiary">
              {invoice.invoice_number}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-content-primary truncate">
            {invoice.property_name || t("untitled")}
          </h3>
          {invoice.unit_info && (
            <p className="text-xs text-content-tertiary truncate">
              {invoice.unit_info}
            </p>
          )}
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusColor}`}
        >
          {t(`status.${invoice.status}` as Parameters<typeof t>[0])}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-content-tertiary">
        <div className="flex items-center gap-3">
          <span>{formattedDate}</span>
          {invoice.due_date && (
            <span>
              {t("due")}: {new Date(invoice.due_date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
        <span className="font-semibold text-content-primary text-sm">
          ${Number(invoice.total).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      </div>

      {invoice.dispute_reason && invoice.status === "disputed" && (
        <div className="mt-2 p-2 bg-red-900/20 border border-red-700/30 rounded-lg">
          <p className="text-xs text-red-400 line-clamp-2">
            {invoice.dispute_reason}
          </p>
        </div>
      )}
    </Link>
  );
}
