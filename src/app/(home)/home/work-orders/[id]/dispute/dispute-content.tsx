"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { openDispute } from "@/app/actions/home-disputes";

interface WorkOrderRef {
  id: string;
  status: string;
  vendor_org_id: string | null;
  trade: string | null;
  description: string | null;
  warranty_expires_at: string | null;
}

interface Dispute {
  id: string;
  type: string;
  description: string;
  evidence_photos: string[];
  vendor_response: string | null;
  status: string;
  warranty_window_days: number;
  created_at: string;
  resolved_at: string | null;
}

const DISPUTE_STATUS_COLORS: Record<string, string> = {
  opened: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  vendor_responding: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  resolved: "bg-green-500/20 text-green-400 border-green-500/30",
  escalated: "bg-red-500/20 text-red-400 border-red-500/30",
  fixed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

export function DisputeContent({
  workOrder,
  vendorName,
  existingDispute,
}: {
  workOrder: WorkOrderRef;
  vendorName: string;
  existingDispute: Dispute | null;
}) {
  const t = useTranslations("home.disputes");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [disputeType, setDisputeType] = useState<"quality_issue" | "warranty_callback">("quality_issue");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const isCompleted = ["completed", "invoiced", "paid"].includes(workOrder.status);
  const warrantyExpired =
    workOrder.warranty_expires_at && new Date(workOrder.warranty_expires_at) < new Date();

  // If there's an existing active dispute, show status view
  if (existingDispute && !["resolved", "fixed"].includes(existingDispute.status)) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link
            href={`/home/work-orders/${workOrder.id}`}
            className="text-sm text-content-quaternary hover:text-content-primary transition-colors"
          >
            {t("back")}
          </Link>
          <h1 className="text-2xl font-bold text-content-primary mt-2">{t("statusTitle")}</h1>
        </div>

        {/* Dispute status card */}
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-content-primary">
              {existingDispute.type === "quality_issue" ? t("qualityIssue") : t("warrantyCallback")}
            </span>
            <span className={`text-xs font-medium px-3 py-1 rounded-full border ${DISPUTE_STATUS_COLORS[existingDispute.status] ?? ""}`}>
              {t(`status_${existingDispute.status}` as "status_opened")}
            </span>
          </div>

          <div>
            <p className="text-xs text-content-quaternary mb-1">{t("descriptionLabel")}</p>
            <p className="text-sm text-content-secondary">{existingDispute.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-content-quaternary">{t("openedOn")}</p>
              <p className="text-sm text-content-primary">{new Date(existingDispute.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-content-quaternary">{t("warrantyWindow")}</p>
              <p className="text-sm text-content-primary">{t("days", { count: existingDispute.warranty_window_days })}</p>
            </div>
          </div>

          {/* Vendor response */}
          <div className="border-t border-edge-secondary pt-4">
            <p className="text-xs text-content-quaternary mb-1">{t("vendorResponse")}</p>
            {existingDispute.vendor_response ? (
              <div className="bg-surface-secondary rounded-lg p-3">
                <p className="text-sm text-content-secondary">{existingDispute.vendor_response}</p>
              </div>
            ) : (
              <p className="text-sm text-content-quaternary italic">{t("awaitingResponse")}</p>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
          <div className="space-y-3">
            {(["opened", "vendor_responding", "resolved", "fixed"] as const).map((s) => {
              const statusOrder = ["opened", "vendor_responding", "resolved", "fixed"];
              const currentIdx = statusOrder.indexOf(existingDispute.status);
              const idx = statusOrder.indexOf(s);
              const isPast = idx <= currentIdx;
              const isCurrent = idx === currentIdx;

              return (
                <div key={s} className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full flex-shrink-0 ${
                      isCurrent
                        ? "bg-rose-500 ring-4 ring-rose-500/20"
                        : isPast
                          ? "bg-rose-500"
                          : "bg-surface-secondary border border-edge-secondary"
                    }`}
                  />
                  <span className={`text-sm ${isPast ? "text-content-primary font-medium" : "text-content-quaternary"}`}>
                    {t(`status_${s}` as "status_opened")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Show form to create new dispute
  const handleSubmit = () => {
    if (!description.trim() || !workOrder.vendor_org_id) return;
    setError("");

    startTransition(async () => {
      const result = await openDispute({
        work_order_id: workOrder.id,
        vendor_org_id: workOrder.vendor_org_id!,
        type: disputeType,
        description: description.trim(),
      });

      if (result.success) {
        router.refresh();
      } else {
        setError(result.error ?? t("error"));
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href={`/home/work-orders/${workOrder.id}`}
          className="text-sm text-content-quaternary hover:text-content-primary transition-colors"
        >
          {t("back")}
        </Link>
        <h1 className="text-2xl font-bold text-content-primary mt-2">{t("title")}</h1>
      </div>

      {/* Already resolved dispute notice */}
      {existingDispute && ["resolved", "fixed"].includes(existingDispute.status) && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <p className="text-sm text-green-400">
            {t(`status_${existingDispute.status}` as "status_resolved")} — {new Date(existingDispute.resolved_at ?? existingDispute.created_at).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Warranty expired warning */}
      {warrantyExpired && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <p className="text-sm text-amber-400">{t("warrantyExpired")}</p>
        </div>
      )}

      {/* Not completed warning */}
      {!isCompleted && (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
          <p className="text-sm text-content-quaternary">
            Work order must be completed before reporting an issue.
          </p>
        </div>
      )}

      {/* Dispute form */}
      {isCompleted && !warrantyExpired && (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-6 space-y-5">
          {/* Vendor info */}
          <div className="flex items-center gap-3 pb-4 border-b border-edge-secondary">
            <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center">
              <span className="text-xs font-bold text-rose-400">{vendorName.charAt(0)}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-content-primary">{vendorName}</p>
              <p className="text-xs text-content-quaternary capitalize">{workOrder.trade}</p>
            </div>
          </div>

          {/* Issue type */}
          <div>
            <label className="block text-sm font-medium text-content-primary mb-2">{t("typeLabel")}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDisputeType("quality_issue")}
                className={`p-4 rounded-xl border text-left transition-colors ${
                  disputeType === "quality_issue"
                    ? "border-rose-500/50 bg-rose-500/5"
                    : "border-edge-secondary bg-surface-secondary hover:border-edge-primary"
                }`}
              >
                <p className="text-sm font-medium text-content-primary">{t("qualityIssue")}</p>
                <p className="text-xs text-content-quaternary mt-0.5">{t("qualityIssueDesc")}</p>
              </button>
              <button
                type="button"
                onClick={() => setDisputeType("warranty_callback")}
                className={`p-4 rounded-xl border text-left transition-colors ${
                  disputeType === "warranty_callback"
                    ? "border-rose-500/50 bg-rose-500/5"
                    : "border-edge-secondary bg-surface-secondary hover:border-edge-primary"
                }`}
              >
                <p className="text-sm font-medium text-content-primary">{t("warrantyCallback")}</p>
                <p className="text-xs text-content-quaternary mt-0.5">{t("warrantyCallbackDesc")}</p>
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-content-primary mb-2">{t("descriptionLabel")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none"
              placeholder={t("descriptionPlaceholder")}
            />
          </div>

          {/* Evidence photos placeholder */}
          <div>
            <label className="block text-sm font-medium text-content-primary mb-2">{t("evidenceLabel")}</label>
            <div className="border-2 border-dashed border-edge-secondary rounded-lg p-6 text-center">
              <svg className="w-8 h-8 text-content-quaternary mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
              <p className="text-xs text-content-quaternary">{t("evidenceHint")}</p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!description.trim() || isPending}
            className="w-full px-4 py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-charcoal-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isPending ? t("submitting") : t("submit")}
          </button>
        </div>
      )}
    </div>
  );
}
