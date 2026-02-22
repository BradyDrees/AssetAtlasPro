"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  approveInvoice,
  disputeInvoice,
  markInvoicePaid,
} from "@/app/actions/pm-invoices";

interface PmInvoiceActionsProps {
  invoiceId: string;
  status: string;
}

export function PmInvoiceActions({ invoiceId, status }: PmInvoiceActionsProps) {
  const t = useTranslations("vendor.invoices");
  const router = useRouter();
  const [action, setAction] = useState<"idle" | "approve" | "dispute" | "pay">("idle");
  const [processing, setProcessing] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  const handleApprove = async () => {
    setProcessing(true);
    try {
      const result = await approveInvoice(invoiceId);
      if (result.error) { alert(result.error); return; }
      router.refresh();
      setAction("idle");
    } finally { setProcessing(false); }
  };

  const handleDispute = async () => {
    if (!disputeReason.trim()) return;
    setProcessing(true);
    try {
      const result = await disputeInvoice(invoiceId, disputeReason.trim());
      if (result.error) { alert(result.error); return; }
      router.refresh();
      setAction("idle");
      setDisputeReason("");
    } finally { setProcessing(false); }
  };

  const handleMarkPaid = async () => {
    setProcessing(true);
    try {
      const result = await markInvoicePaid(invoiceId);
      if (result.error) { alert(result.error); return; }
      router.refresh();
      setAction("idle");
    } finally { setProcessing(false); }
  };

  if (action === "idle") {
    return (
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
        <h3 className="text-sm font-semibold text-content-primary mb-3">{t("pmActions")}</h3>
        <div className="flex flex-wrap gap-3">
          {status === "submitted" && (
            <>
              <button onClick={() => setAction("approve")} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors">
                {t("approve")}
              </button>
              <button onClick={() => setAction("dispute")} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors">
                {t("dispute")}
              </button>
            </>
          )}
          {(status === "pm_approved" || status === "processing") && (
            <button onClick={() => setAction("pay")} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors">
              {t("markPaid")}
            </button>
          )}
          {status === "pm_approved" && (
            <button onClick={() => setAction("dispute")} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors">
              {t("dispute")}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (action === "approve") {
    return (
      <div className="bg-surface-primary rounded-xl border border-green-700/30 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-green-400">{t("confirmApproveTitle")}</h3>
        <p className="text-sm text-content-secondary">{t("confirmApproveMessage")}</p>
        <div className="flex gap-3">
          <button onClick={() => setAction("idle")} className="px-4 py-2 text-sm text-content-secondary hover:text-content-primary transition-colors">{t("cancel")}</button>
          <button onClick={handleApprove} disabled={processing} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50 transition-colors">
            {processing ? t("processing") : t("confirmApprove")}
          </button>
        </div>
      </div>
    );
  }

  if (action === "pay") {
    return (
      <div className="bg-surface-primary rounded-xl border border-green-700/30 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-green-400">{t("confirmPayTitle")}</h3>
        <p className="text-sm text-content-secondary">{t("confirmPayMessage")}</p>
        <div className="flex gap-3">
          <button onClick={() => setAction("idle")} className="px-4 py-2 text-sm text-content-secondary hover:text-content-primary transition-colors">{t("cancel")}</button>
          <button onClick={handleMarkPaid} disabled={processing} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50 transition-colors">
            {processing ? t("processing") : t("confirmPay")}
          </button>
        </div>
      </div>
    );
  }

  // Dispute
  return (
    <div className="bg-surface-primary rounded-xl border border-red-700/30 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-red-400">{t("disputeTitle")}</h3>
      <textarea
        value={disputeReason}
        onChange={(e) => setDisputeReason(e.target.value)}
        rows={3}
        className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary resize-none placeholder:text-content-quaternary"
        placeholder={t("disputeReasonPlaceholder")}
        autoFocus
      />
      <div className="flex gap-3">
        <button onClick={() => { setAction("idle"); setDisputeReason(""); }} className="px-4 py-2 text-sm text-content-secondary hover:text-content-primary transition-colors">{t("cancel")}</button>
        <button onClick={handleDispute} disabled={processing || !disputeReason.trim()} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50 transition-colors">
          {processing ? t("processing") : t("sendDispute")}
        </button>
      </div>
    </div>
  );
}
