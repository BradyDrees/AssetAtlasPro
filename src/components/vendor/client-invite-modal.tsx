"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { sendClientInvite, getClientInviteUrl } from "@/app/actions/vendor-client-invite";

interface ClientInviteModalProps {
  open: boolean;
  onClose: () => void;
}

type InviteApp = "home" | "operate";

export function ClientInviteModal({ open, onClose }: ClientInviteModalProps) {
  const t = useTranslations("vendor.clients");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [sentVia, setSentVia] = useState<string[]>([]);
  const [copyUrl, setCopyUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    app: "home" as InviteApp,
    sendSms: true,
    sendEmail: true,
  });

  if (!open) return null;

  const update = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError("");
    setSuccess(false);

    const result = await sendClientInvite(form);
    setSending(false);

    if (result.success) {
      setSuccess(true);
      setSentVia(result.sentVia);
    } else {
      setError(result.error ?? "Failed to send invite");
    }
  };

  const handleCopyLink = async () => {
    const { url, error: err } = await getClientInviteUrl(form.app);
    if (err || !url) {
      setError(err ?? "Failed to generate link");
      return;
    }
    setCopyUrl(url);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setForm({ name: "", phone: "", email: "", app: "home", sendSms: true, sendEmail: true });
    setSuccess(false);
    setError("");
    setCopyUrl("");
    setCopied(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative bg-surface-primary rounded-xl border border-edge-primary shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-edge-primary">
          <h2 className="text-lg font-semibold text-content-primary">
            {t("clientInvite.title")}
          </h2>
          <p className="text-sm text-content-tertiary mt-0.5">
            {t("clientInvite.subtitle")}
          </p>
        </div>

        {success ? (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <svg className="w-5 h-5 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-green-400">
                  {t("clientInvite.sent")}
                </p>
                <p className="text-xs text-content-tertiary mt-0.5">
                  {sentVia.includes("sms") && sentVia.includes("email")
                    ? t("clientInvite.sentBoth")
                    : sentVia.includes("sms")
                      ? t("clientInvite.sentSms")
                      : t("clientInvite.sentEmail")}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-full px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
            >
              {t("clientInvite.done")}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="p-5 space-y-4">
            {/* App Selection */}
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1.5">
                {t("clientInvite.selectApp")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => update("app", "home")}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    form.app === "home"
                      ? "border-rose-500 bg-rose-500/10"
                      : "border-edge-primary bg-surface-secondary hover:bg-surface-tertiary"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <svg className={`w-4 h-4 ${form.app === "home" ? "text-rose-400" : "text-content-quaternary"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                    <span className={`text-sm font-medium ${form.app === "home" ? "text-rose-400" : "text-content-secondary"}`}>
                      {t("clientInvite.appHome")}
                    </span>
                  </div>
                  <p className="text-[10px] text-content-quaternary">
                    {t("clientInvite.appHomeDesc")}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => update("app", "operate")}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    form.app === "operate"
                      ? "border-green-500 bg-green-500/10"
                      : "border-edge-primary bg-surface-secondary hover:bg-surface-tertiary"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <svg className={`w-4 h-4 ${form.app === "operate" ? "text-green-400" : "text-content-quaternary"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                    </svg>
                    <span className={`text-sm font-medium ${form.app === "operate" ? "text-green-400" : "text-content-secondary"}`}>
                      {t("clientInvite.appOperate")}
                    </span>
                  </div>
                  <p className="text-[10px] text-content-quaternary">
                    {t("clientInvite.appOperateDesc")}
                  </p>
                </button>
              </div>
            </div>

            {/* Client Name */}
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">
                {t("clientInvite.name")} *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary placeholder:text-content-quaternary"
                placeholder={t("clientInvite.namePlaceholder")}
              />
            </div>

            {/* Delivery Methods */}
            <div className="space-y-3">
              <label className="block text-xs font-medium text-content-secondary">
                {t("clientInvite.deliveryMethod")}
              </label>

              {/* SMS Toggle + Phone */}
              <div className={`rounded-lg border p-3 transition-colors ${form.sendSms ? "border-brand-500/30 bg-brand-500/5" : "border-edge-primary bg-surface-secondary"}`}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.sendSms}
                    onChange={(e) => update("sendSms", e.target.checked)}
                    className="w-4 h-4 rounded border-edge-primary text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm font-medium text-content-primary">
                    {t("clientInvite.viaSms")}
                  </span>
                </label>
                {form.sendSms && (
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    className="mt-2 w-full rounded-lg border border-edge-primary bg-surface-primary px-3 py-2 text-sm text-content-primary placeholder:text-content-quaternary"
                    placeholder="(555) 123-4567"
                    required={form.sendSms}
                  />
                )}
              </div>

              {/* Email Toggle + Email */}
              <div className={`rounded-lg border p-3 transition-colors ${form.sendEmail ? "border-brand-500/30 bg-brand-500/5" : "border-edge-primary bg-surface-secondary"}`}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.sendEmail}
                    onChange={(e) => update("sendEmail", e.target.checked)}
                    className="w-4 h-4 rounded border-edge-primary text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm font-medium text-content-primary">
                    {t("clientInvite.viaEmail")}
                  </span>
                </label>
                {form.sendEmail && (
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    className="mt-2 w-full rounded-lg border border-edge-primary bg-surface-primary px-3 py-2 text-sm text-content-primary placeholder:text-content-quaternary"
                    placeholder="client@example.com"
                    required={form.sendEmail}
                  />
                )}
              </div>
            </div>

            {/* Copy Link */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-4.504a4.5 4.5 0 00-7.244-1.242l-4.5 4.5a4.5 4.5 0 006.364 6.364l1.757-1.757" />
                </svg>
                {copied ? t("clientInvite.copied") : t("clientInvite.copyLink")}
              </button>
              {copyUrl && (
                <p className="mt-1.5 text-[10px] text-content-quaternary break-all bg-surface-secondary rounded p-2">
                  {copyUrl}
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 rounded-lg border border-edge-primary bg-surface-secondary text-sm font-medium text-content-secondary hover:bg-surface-tertiary transition-colors"
              >
                {t("clientInvite.cancel")}
              </button>
              <button
                type="submit"
                disabled={sending || (!form.sendSms && !form.sendEmail)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {sending ? t("clientInvite.sending") : t("clientInvite.send")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
