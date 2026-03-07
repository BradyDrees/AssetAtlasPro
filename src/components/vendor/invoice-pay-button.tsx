"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createInvoicePaymentSession } from "@/app/actions/vendor-invoice-payment";

interface InvoicePayButtonProps {
  invoiceId: string;
  /** Pre-existing payment URL (from prior session creation) */
  existingPaymentUrl?: string | null;
  total: number;
  balanceDue?: number | null;
  disabled?: boolean;
}

export function InvoicePayButton({
  invoiceId,
  existingPaymentUrl,
  total,
  balanceDue,
  disabled,
}: InvoicePayButtonProps) {
  const t = useTranslations("vendor.invoices");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount = balanceDue != null && balanceDue > 0 ? balanceDue : total;

  async function handlePay() {
    // If we already have a payment URL, just open it
    if (existingPaymentUrl) {
      window.open(existingPaymentUrl, "_blank");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await createInvoicePaymentSession(invoiceId);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.url) {
        window.open(result.url, "_blank");
      }
    } catch {
      setError("Failed to create payment session");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <button
        onClick={handlePay}
        disabled={disabled || loading}
        className="w-full px-5 py-2.5 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {/* Credit card icon */}
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
        </svg>
        {loading
          ? t("payment.processing")
          : `${t("payment.payNow")} — $${amount.toFixed(2)}`}
      </button>
      {error && (
        <p className="text-xs text-red-400 text-center">{error}</p>
      )}
    </div>
  );
}
