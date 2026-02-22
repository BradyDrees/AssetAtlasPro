"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { VendorInvoice, VendorInvoiceItem } from "@/lib/vendor/invoice-types";
import type { InvoiceItemType } from "@/lib/vendor/types";
import {
  createInvoiceItem,
  updateInvoiceItem,
  deleteInvoiceItem,
  recalculateInvoiceTotals,
  submitInvoice,
} from "@/app/actions/vendor-invoices";

interface InvoiceBuilderProps {
  invoice: VendorInvoice;
  items: VendorInvoiceItem[];
}

export function InvoiceBuilder({
  invoice: initialInvoice,
  items: initialItems,
}: InvoiceBuilderProps) {
  const t = useTranslations("vendor.invoices");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [invoice, setInvoice] = useState(initialInvoice);
  const [items, setItems] = useState(initialItems);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New item form
  const [newDesc, setNewDesc] = useState("");
  const [newQty, setNewQty] = useState(1);
  const [newPrice, setNewPrice] = useState(0);
  const [newType, setNewType] = useState<InvoiceItemType>("labor");
  const [addingItem, setAddingItem] = useState(false);

  const isEditable = invoice.status === "draft" || invoice.status === "disputed";

  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  const handleAddItem = useCallback(async () => {
    if (!newDesc.trim()) return;
    setAddingItem(true);
    try {
      const { data } = await createInvoiceItem({
        invoice_id: invoice.id,
        description: newDesc.trim(),
        quantity: newQty,
        unit_price: newPrice,
        item_type: newType,
      });
      if (data) {
        setItems((prev) => [...prev, data]);
        setNewDesc("");
        setNewQty(1);
        setNewPrice(0);
        await recalculateInvoiceTotals(invoice.id);
        refresh();
      }
    } finally {
      setAddingItem(false);
    }
  }, [invoice.id, newDesc, newQty, newPrice, newType, refresh]);

  const handleDeleteItem = useCallback(
    async (itemId: string) => {
      await deleteInvoiceItem(itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      await recalculateInvoiceTotals(invoice.id);
      refresh();
    },
    [invoice.id, refresh]
  );

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      const result = await submitInvoice(invoice.id);
      if (result.error) {
        alert(result.error);
        return;
      }
      setShowSubmitModal(false);
      router.push("/vendor/invoices");
    } finally {
      setSubmitting(false);
    }
  }, [invoice.id, router]);

  const subtotal = items.reduce((sum, i) => sum + Number(i.total || 0), 0);
  const taxPct = Number(invoice.tax_pct) || 0;
  const taxAmount = subtotal * (taxPct / 100);
  const total = subtotal + taxAmount;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/vendor/invoices")}
          className="p-2 text-content-tertiary hover:text-content-primary transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-content-tertiary">{invoice.invoice_number}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              invoice.status === "draft" ? "bg-gray-900/30 text-gray-400"
                : invoice.status === "disputed" ? "bg-red-900/30 text-red-400"
                  : "bg-blue-900/30 text-blue-400"
            }`}>
              {t(`status.${invoice.status}` as Parameters<typeof t>[0])}
            </span>
            {isPending && <span className="text-xs text-content-quaternary">{t("saving")}...</span>}
          </div>
          {invoice.property_name && (
            <h1 className="text-lg font-bold text-content-primary truncate mt-1">{invoice.property_name}</h1>
          )}
        </div>
      </div>

      {/* Dispute banner */}
      {invoice.status === "disputed" && invoice.dispute_reason && (
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

        {/* Column headers */}
        {items.length > 0 && (
          <div className="hidden sm:flex items-center gap-3 py-1.5 px-3 text-xs font-medium text-content-quaternary uppercase border-b border-edge-primary/50">
            <span className="flex-1">{t("description")}</span>
            <span className="w-16 text-center">{t("type")}</span>
            <span className="w-16 text-right">{t("qty")}</span>
            <span className="w-20 text-right">{t("price")}</span>
            <span className="w-24 text-right">{t("lineTotal")}</span>
            {isEditable && <span className="w-8" />}
          </div>
        )}

        {items.map((item) => (
          <div key={item.id} className="group flex items-center gap-3 py-2 px-3 text-sm border-b border-edge-primary/50 last:border-0 hover:bg-surface-secondary/50 transition-colors">
            <span className="flex-1 text-content-primary">{item.description}</span>
            <span className="text-content-tertiary text-xs uppercase w-16 text-center hidden sm:block">
              {t(`itemType.${item.item_type}` as Parameters<typeof t>[0])}
            </span>
            <span className="text-content-secondary w-16 text-right hidden sm:block">{item.quantity}</span>
            <span className="text-content-secondary w-20 text-right hidden sm:block">${Number(item.unit_price).toFixed(2)}</span>
            <span className="text-content-primary font-medium w-24 text-right">${Number(item.total).toFixed(2)}</span>
            {isEditable && (
              <button
                onClick={() => handleDeleteItem(item.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300 transition-all w-8"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            )}
          </div>
        ))}

        {items.length === 0 && (
          <div className="py-6 text-center text-sm text-content-quaternary">{t("noItems")}</div>
        )}

        {/* Add item form */}
        {isEditable && (
          <div className="p-3 border-t border-edge-primary/50 space-y-2">
            <div className="flex flex-wrap items-end gap-2">
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder={t("itemDescPlaceholder")}
                className="flex-1 min-w-[200px] px-3 py-1.5 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary placeholder:text-content-quaternary"
              />
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as InvoiceItemType)}
                className="px-2 py-1.5 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary"
              >
                <option value="labor">{t("itemType.labor")}</option>
                <option value="material">{t("itemType.material")}</option>
                <option value="other">{t("itemType.other")}</option>
              </select>
              <input
                type="number"
                min={0}
                step={0.5}
                value={newQty}
                onChange={(e) => setNewQty(parseFloat(e.target.value) || 0)}
                className="w-16 px-2 py-1.5 text-sm text-center bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary"
                placeholder={t("qty")}
              />
              <input
                type="number"
                min={0}
                step={0.01}
                value={newPrice}
                onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                className="w-24 px-2 py-1.5 text-sm text-right bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary"
                placeholder={t("price")}
              />
              <button
                onClick={handleAddItem}
                disabled={addingItem || !newDesc.trim()}
                className="px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50 transition-colors"
              >
                {t("addItem")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Financial summary */}
      <div className="bg-surface-secondary rounded-xl border border-edge-primary p-4 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-content-secondary">{t("subtotal")}</span>
          <span className="text-content-primary font-medium">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-content-secondary">{t("tax")} ({taxPct}%)</span>
          <span className="text-content-primary">${taxAmount.toFixed(2)}</span>
        </div>
        <div className="border-t border-edge-secondary pt-2 flex items-center justify-between">
          <span className="text-content-primary font-semibold">{t("total")}</span>
          <span className="text-lg font-bold text-brand-400">${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Actions */}
      {isEditable && (
        <div className="flex items-center justify-end gap-3 pb-6">
          <button
            onClick={() => router.push("/vendor/invoices")}
            className="px-4 py-2 text-sm text-content-secondary hover:text-content-primary transition-colors"
          >
            {t("backToList")}
          </button>
          <button
            onClick={() => setShowSubmitModal(true)}
            disabled={!invoice.pm_user_id || items.length === 0}
            className="px-5 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
            {t("submitToPm")}
          </button>
        </div>
      )}

      {/* Submit modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-surface-primary rounded-xl border border-edge-primary p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-semibold text-content-primary">{t("confirmSubmitTitle")}</h3>
            <p className="text-sm text-content-secondary">{t("confirmSubmitMessage")}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowSubmitModal(false)} className="px-4 py-2 text-sm text-content-secondary hover:text-content-primary transition-colors">
                {t("cancel")}
              </button>
              <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50 transition-colors">
                {submitting ? t("submitting") : t("confirmSubmit")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
