"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { inviteVendor } from "@/app/actions/pm-vendors";

interface VendorRow {
  id: string;
  vendor_org_id: string;
  vendor_name: string;
  vendor_email: string | null;
  vendor_phone: string | null;
  trades: string[];
  status: string;
  payment_terms: string;
  created_at: string;
}

interface PmVendorsListProps {
  vendors: VendorRow[];
}

export function PmVendorsList({ vendors }: PmVendorsListProps) {
  const t = useTranslations("vendor.clients");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [inviteMsg, setInviteMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  const handleInvite = useCallback(async () => {
    if (!email.trim()) return;
    setSending(true);
    setInviteMsg(null);

    const result = await inviteVendor(email.trim());
    if (result.success) {
      const link = `${window.location.origin}/vendor/accept-invite/${result.token}`;
      setInviteMsg({ type: "success", text: `${t("pmVendors.inviteSent")} ${link}` });
      setEmail("");
      startTransition(() => router.refresh());
    } else {
      setInviteMsg({ type: "error", text: result.error ?? t("pmVendors.inviteError") });
    }
    setSending(false);
  }, [email, t, router]);

  const statusColors: Record<string, string> = {
    active: "bg-green-500/20 text-green-400 border-green-500/30",
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  };

  return (
    <div className="space-y-5">
      {/* Invite form */}
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-5">
        <h2 className="text-base font-semibold text-content-primary mb-3">
          {t("pmVendors.inviteVendor")}
        </h2>
        <div className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("pmVendors.emailPlaceholder")}
            className="flex-1 rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2.5 text-sm text-content-primary placeholder:text-content-quaternary"
          />
          <button
            onClick={handleInvite}
            disabled={sending || isPending || !email.trim()}
            className="px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium disabled:opacity-50 transition-colors shrink-0"
          >
            {sending ? t("pmVendors.sending") : t("pmVendors.invite")}
          </button>
        </div>
        {inviteMsg && (
          <div
            className={`mt-3 rounded-lg px-4 py-3 text-sm ${
              inviteMsg.type === "success"
                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}
          >
            {inviteMsg.text}
          </div>
        )}
      </div>

      {/* Vendor list */}
      {vendors.length === 0 ? (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
          <p className="text-content-tertiary text-sm">{t("pmVendors.noVendors")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {vendors.map((v) => (
            <div
              key={v.id}
              className="bg-surface-primary rounded-xl border border-edge-primary p-5"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-content-primary">{v.vendor_name}</h3>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        statusColors[v.status] ?? statusColors.pending
                      }`}
                    >
                      {t(`status.${v.status}`)}
                    </span>
                  </div>
                  {v.vendor_email && (
                    <p className="text-xs text-content-tertiary">{v.vendor_email}</p>
                  )}
                </div>
              </div>
              {v.trades.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {v.trades.slice(0, 5).map((trade) => (
                    <span
                      key={trade}
                      className="px-2 py-0.5 rounded-full text-[10px] bg-surface-secondary text-content-tertiary border border-edge-secondary"
                    >
                      {trade}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-content-quaternary mt-2">
                {t("paymentTerms")}: {v.payment_terms} · {t("since")}: {new Date(v.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
