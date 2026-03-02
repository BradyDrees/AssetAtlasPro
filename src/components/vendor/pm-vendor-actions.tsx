"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  suspendVendor,
  terminateVendor,
  reactivateVendor,
  resendInvite,
} from "@/app/actions/pm-vendors";
import type { EnrichedPmVendor } from "@/lib/vendor/types";

interface PmVendorActionsProps {
  vendor: EnrichedPmVendor | null;
  action: string | null;
  onClose: () => void;
}

const ACTION_CONFIG: Record<
  string,
  { color: string; bgColor: string; borderColor: string }
> = {
  suspend: {
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/20",
  },
  terminate: {
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
  },
  reactivate: {
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
  },
  resend: {
    color: "text-brand-400",
    bgColor: "bg-brand-500/10",
    borderColor: "border-brand-500/20",
  },
};

export function PmVendorActions({ vendor, action, onClose }: PmVendorActionsProps) {
  const t = useTranslations("vendor.clients");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendLink, setResendLink] = useState<string | null>(null);

  const handleConfirm = useCallback(async () => {
    if (!vendor || !action) return;
    setProcessing(true);
    setError(null);

    let result: { success: boolean; error?: string; inviteLink?: string };

    switch (action) {
      case "suspend":
        result = await suspendVendor(vendor.relationship_id);
        break;
      case "terminate":
        result = await terminateVendor(vendor.relationship_id);
        break;
      case "reactivate":
        result = await reactivateVendor(vendor.relationship_id);
        break;
      case "resend":
        result = await resendInvite(vendor.relationship_id);
        if (result.success && result.inviteLink) {
          setResendLink(result.inviteLink);
          setProcessing(false);
          startTransition(() => router.refresh());
          return;
        }
        break;
      default:
        result = { success: false, error: "Unknown action" };
    }

    if (result.success) {
      startTransition(() => router.refresh());
      onClose();
    } else {
      setError(result.error ?? t("pmVendors.actionError"));
    }
    setProcessing(false);
  }, [vendor, action, t, router, onClose]);

  if (!vendor || !action) return null;

  const config = ACTION_CONFIG[action] ?? ACTION_CONFIG.suspend;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-surface-primary rounded-xl border border-edge-primary shadow-xl w-full max-w-sm">
        <div className="p-5 space-y-4">
          {resendLink ? (
            /* Resend success — show copyable link */
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">
                  {t("pmVendors.inviteResent")}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={resendLink}
                  readOnly
                  className="flex-1 rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-xs text-content-secondary font-mono"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={() => navigator.clipboard.writeText(resendLink)}
                  className="px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium transition-colors shrink-0"
                >
                  {t("pmVendors.copy")}
                </button>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
                >
                  {t("pmVendors.done")}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className={`rounded-lg p-4 ${config.bgColor} border ${config.borderColor}`}>
                <h3 className={`text-sm font-semibold ${config.color}`}>
                  {t(`pmVendors.confirm.${action}.title`)}
                </h3>
                <p className="text-xs text-content-tertiary mt-1">
                  {t(`pmVendors.confirm.${action}.body`, {
                    name: vendor.vendor_name,
                  })}
                </p>
              </div>

              {error && (
                <div className="rounded-lg px-4 py-3 text-sm bg-red-500/10 text-red-400 border border-red-500/20">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-edge-primary text-content-secondary text-sm hover:bg-surface-secondary transition-colors"
                >
                  {t("pmVendors.cancel")}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={processing || isPending}
                  className={`px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 transition-colors ${
                    action === "terminate"
                      ? "bg-red-600 hover:bg-red-500"
                      : action === "suspend"
                        ? "bg-yellow-600 hover:bg-yellow-500"
                        : "bg-brand-600 hover:bg-brand-500"
                  }`}
                >
                  {processing
                    ? t("pmVendors.processing")
                    : t(`pmVendors.confirm.${action}.confirm`)}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
