"use client";

import { useState, useTransition } from "react";
import { createPublicPaymentSession, type PublicInvoiceData } from "@/app/actions/public-invoice";

export function PublicInvoiceView({
  invoice,
  token,
}: {
  invoice: PublicInvoiceData;
  token: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isPendingPayment = invoice.status === "payment_pending";

  const handlePay = () => {
    setError(null);
    startTransition(async () => {
      const result = await createPublicPaymentSession(token);
      if (result.url) {
        window.location.href = result.url;
      } else {
        setError(result.error ?? "Failed to create payment session");
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Vendor header */}
        <div className="text-center mb-6">
          {invoice.vendor_logo ? (
            <img
              src={invoice.vendor_logo}
              alt=""
              className="h-12 mx-auto mb-3 object-contain"
            />
          ) : (
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-lg font-bold text-green-600">
                {invoice.vendor_name.charAt(0)}
              </span>
            </div>
          )}
          <h1 className="text-lg font-bold text-gray-900">{invoice.vendor_name}</h1>
        </div>

        {/* Invoice card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Invoice number + status */}
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Invoice</p>
                <p className="text-lg font-semibold text-gray-900">
                  #{invoice.invoice_number ?? invoice.id.slice(0, 8)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Amount Due</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${invoice.total.toFixed(2)}
                </p>
              </div>
            </div>
            {invoice.due_date && (
              <p className="text-xs text-gray-500 mt-2">
                Due: {new Date(invoice.due_date).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Property */}
          {invoice.property_name && (
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
              <p className="text-xs text-gray-500">Property</p>
              <p className="text-sm text-gray-700">{invoice.property_name}</p>
            </div>
          )}

          {/* Line items */}
          {invoice.items.length > 0 && (
            <div className="px-6 py-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs">
                    <th className="text-left pb-2">Description</th>
                    <th className="text-right pb-2">Qty</th>
                    <th className="text-right pb-2">Price</th>
                    <th className="text-right pb-2">Total</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  {invoice.items.map((item, idx) => (
                    <tr key={idx} className="border-t border-gray-50">
                      <td className="py-2">{item.description}</td>
                      <td className="text-right py-2">{item.quantity}</td>
                      <td className="text-right py-2">${item.unit_price.toFixed(2)}</td>
                      <td className="text-right py-2 font-medium">${item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Subtotal / Tax / Total */}
              <div className="border-t border-gray-200 mt-3 pt-3 space-y-1">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>${invoice.subtotal.toFixed(2)}</span>
                </div>
                {invoice.tax_amount > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Tax ({invoice.tax_pct}%)</span>
                    <span>${invoice.tax_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-gray-900 pt-1">
                  <span>Total</span>
                  <span>${invoice.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Pay button */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            {isPendingPayment ? (
              <div className="text-center py-3">
                <p className="text-sm text-amber-600 font-medium">
                  Payment is being processed...
                </p>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
                <button
                  onClick={handlePay}
                  disabled={isPending}
                  className="w-full py-3 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50"
                >
                  {isPending ? "Processing..." : `Pay $${invoice.total.toFixed(2)}`}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by Asset Atlas Pro
        </p>
      </div>
    </div>
  );
}
