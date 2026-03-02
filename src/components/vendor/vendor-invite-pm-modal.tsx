"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { invitePm } from "@/app/actions/vendor-clients";

interface VendorInvitePmModalProps {
  open: boolean;
  onClose: () => void;
}

export function VendorInvitePmModal({ open, onClose }: VendorInvitePmModalProps) {
  const t = useTranslations("vendor.clients");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    text: string;
    link?: string;
  } | null>(null);

  const handleInvite = useCallback(async () => {
    if (!email.trim()) return;
    setSending(true);
    setResult(null);

    const res = await invitePm(email.trim());
    if (res.success && res.inviteLink) {
      setResult({
        type: "success",
        text: t("invitePm.sent"),
        link: res.inviteLink,
      });
      setEmail("");
      startTransition(() => router.refresh());
    } else {
      setResult({
        type: "error",
        text: res.error ?? t("invitePm.error"),
      });
    }
    setSending(false);
  }, [email, t, router]);

  const handleCopy = useCallback(() => {
    if (result?.link) {
      navigator.clipboard.writeText(result.link);
    }
  }, [result]);

  const handleClose = useCallback(() => {
    setEmail("");
    setResult(null);
    setSending(false);
    onClose();
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={handleClose} />

      <div className="relative bg-surface-primary rounded-xl border border-edge-primary shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-edge-primary">
          <h2 className="text-lg font-semibold text-content-primary">
            {t("invitePm.title")}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-surface-secondary text-content-tertiary"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {!result?.link ? (
            <>
              <div>
                <label className="block text-sm font-medium text-content-secondary mb-1.5">
                  {t("invitePm.emailLabel")}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("invitePm.emailPlaceholder")}
                  className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2.5 text-sm text-content-primary placeholder:text-content-quaternary"
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                  autoFocus
                />
                <p className="text-xs text-content-quaternary mt-1">
                  {t("invitePm.hint")}
                </p>
              </div>

              {result?.type === "error" && (
                <div className="rounded-lg px-4 py-3 text-sm bg-red-500/10 text-red-400 border border-red-500/20">
                  {result.text}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">{result.text}</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-content-tertiary mb-1">
                  {t("invitePm.copyLink")}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={result.link}
                    readOnly
                    className="flex-1 rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-xs text-content-secondary font-mono"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={handleCopy}
                    className="px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium transition-colors shrink-0"
                  >
                    {t("invitePm.copy")}
                  </button>
                </div>
              </div>

              <p className="text-xs text-content-quaternary">
                {t("invitePm.linkExpiry")}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-edge-primary">
          {result?.link ? (
            <button
              onClick={handleClose}
              className="px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
            >
              {t("invitePm.done")}
            </button>
          ) : (
            <>
              <button
                onClick={handleClose}
                className="px-5 py-2.5 rounded-lg border border-edge-primary text-content-secondary text-sm font-medium hover:bg-surface-secondary transition-colors"
              >
                {t("invitePm.cancel")}
              </button>
              <button
                onClick={handleInvite}
                disabled={sending || isPending || !email.trim()}
                className="px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {sending ? t("invitePm.sending") : t("invitePm.send")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
