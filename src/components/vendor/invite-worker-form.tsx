"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { inviteWorker } from "@/app/actions/vendor-worker-invites";
import type { PendingInvite } from "@/app/actions/vendor-team";

const ROLE_OPTIONS = [
  { value: "tech", labelKey: "roleTech" },
  { value: "office_manager", labelKey: "roleOfficeManager" },
  { value: "admin", labelKey: "roleAdmin" },
] as const;

export function InviteWorkerForm({
  onClose,
  onInvited,
}: {
  onClose: () => void;
  onInvited: (invite: PendingInvite) => void;
}) {
  const t = useTranslations("vendor.workers");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "office_manager" | "tech">("tech");
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInviteLink(null);

    startTransition(async () => {
      const res = await inviteWorker(email.trim().toLowerCase(), role);
      if (res.error) {
        setError(res.error);
      } else if (res.inviteLink) {
        setInviteLink(res.inviteLink);
        // Create a preview invite object for parent
        onInvited({
          id: crypto.randomUUID(), // Temporary ID — will be replaced on refresh
          email: email.trim().toLowerCase(),
          role,
          invite_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          invited_by_name: null,
        });
      }
    });
  }

  async function copyLink() {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-content-primary">{t("inviteWorker")}</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-surface-secondary text-content-quaternary"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {inviteLink ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <svg className="w-5 h-5 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-green-400">{t("inviteSent")}</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={inviteLink}
              className="flex-1 text-xs bg-surface-secondary border border-edge-secondary rounded-lg px-3 py-2 text-content-secondary"
            />
            <button
              type="button"
              onClick={copyLink}
              className="px-3 py-2 text-xs font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors"
            >
              {copied ? t("copied") : t("copyLink")}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-content-tertiary mb-1">
              {t("emailLabel")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              required
              className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary placeholder:text-content-quaternary focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-content-tertiary mb-1">
              {t("roleLabel")}
            </label>
            <div className="flex gap-2">
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRole(opt.value as "admin" | "office_manager" | "tech")}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    role === opt.value
                      ? "bg-brand-500/20 text-brand-400 border-brand-500/30"
                      : "bg-surface-secondary text-content-tertiary border-edge-secondary hover:border-brand-500/30"
                  }`}
                >
                  {t(opt.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-secondary text-content-tertiary hover:bg-surface-tertiary transition-colors"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={isPending || !email.trim()}
              className="px-4 py-1.5 text-xs font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {isPending ? t("sending") : t("sendInvite")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
