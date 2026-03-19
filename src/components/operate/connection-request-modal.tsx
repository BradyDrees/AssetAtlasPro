"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { requestVendorConnection } from "@/app/actions/vendor-directory";
import type { DirectoryVendor } from "@/app/actions/vendor-directory";

interface ConnectionRequestModalProps {
  vendor: DirectoryVendor;
  onClose: () => void;
  onSuccess: () => void;
}

export function ConnectionRequestModal({
  vendor,
  onClose,
  onSuccess,
}: ConnectionRequestModalProps) {
  const t = useTranslations("operate.vendors.connection");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    const result = await requestVendorConnection(
      vendor.id,
      message.trim() || undefined
    );

    setLoading(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } else {
      switch (result.errorCode) {
        case "rate_limit":
          setError(t("errorRateLimit"));
          break;
        case "already_connected":
          setError(t("errorAlreadyConnected"));
          break;
        case "already_pending":
          setError(t("errorAlreadyPending"));
          break;
        case "cooldown":
          setError(t("errorCooldown"));
          break;
        default:
          setError(t("errorGeneric"));
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface-secondary border border-edge-primary rounded-xl w-full max-w-md p-6 shadow-xl">
        {success ? (
          /* Success state */
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-content-primary font-semibold text-lg mb-1">
              {t("successTitle")}
            </h3>
            <p className="text-content-tertiary text-sm">
              {t("successMessage", { vendorName: vendor.name })}
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-content-primary font-semibold text-lg">
                  {t("modalTitle")}
                </h3>
                <p className="text-content-tertiary text-sm mt-0.5">
                  {t("modalSubtitle", { vendorName: vendor.name })}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-content-quaternary hover:text-content-secondary transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Vendor preview */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-tertiary mb-4">
              {vendor.logo_url ? (
                <img
                  src={vendor.logo_url}
                  alt={vendor.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center">
                  <span className="text-green-400 font-bold">
                    {vendor.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="text-content-primary font-medium text-sm">{vendor.name}</p>
                <p className="text-content-quaternary text-xs">
                  {vendor.trades.slice(0, 3).join(", ")}
                </p>
              </div>
            </div>

            {/* Message field */}
            <div className="mb-4">
              <label className="block text-content-secondary text-sm font-medium mb-1.5">
                {t("messageLabel")}
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                placeholder={t("messagePlaceholder")}
                rows={4}
                className="w-full rounded-lg bg-surface-primary border border-edge-primary text-content-primary placeholder:text-content-quaternary p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/40"
              />
              <p className="text-content-quaternary text-xs mt-1 text-right">
                {message.length}/500
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-lg border border-edge-primary text-content-secondary hover:bg-surface-tertiary transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {loading ? t("sending") : t("sendRequest")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
