"use client";

import { useState, useCallback, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getPmVendorDetail, updatePmNotes, updatePaymentTerms } from "@/app/actions/pm-vendors";
import type { EnrichedPmVendor, PaymentTerms } from "@/lib/vendor/types";

interface PmVendorDrawerProps {
  vendor: EnrichedPmVendor | null;
  onClose: () => void;
  onAction: (vendor: EnrichedPmVendor, action: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  suspended: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  terminated: "bg-red-500/20 text-red-400 border-red-500/30",
};

const PAYMENT_OPTIONS: PaymentTerms[] = ["net_15", "net_30", "net_45", "net_60"];

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

export function PmVendorDrawer({ vendor, onClose, onAction }: PmVendorDrawerProps) {
  const t = useTranslations("vendor.clients");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [detail, setDetail] = useState<{
    credentials: Array<{
      id: string;
      type: string;
      name: string;
      status: string;
      expiration_date: string | null;
      document_number: string | null;
    }>;
    jobs: Array<{
      id: string;
      description: string | null;
      property_name: string | null;
      status: string;
      trade: string | null;
      priority: string | null;
      created_at: string;
    }>;
  } | null>(null);

  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState<PaymentTerms>("net_30");
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingTerms, setSavingTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load detail when vendor changes
  useEffect(() => {
    if (!vendor) {
      setDetail(null);
      return;
    }

    setNotes(vendor.notes ?? "");
    setTerms((vendor.payment_terms as PaymentTerms) ?? "net_30");
    setLoading(true);

    getPmVendorDetail(vendor.relationship_id).then((res) => {
      if (res.vendor) {
        setDetail({ credentials: res.credentials, jobs: res.jobs });
      }
      setLoading(false);
    });
  }, [vendor]);

  const handleSaveNotes = useCallback(async () => {
    if (!vendor) return;
    setSavingNotes(true);
    await updatePmNotes(vendor.relationship_id, notes);
    startTransition(() => router.refresh());
    setSavingNotes(false);
  }, [vendor, notes, router]);

  const handleTermsChange = useCallback(
    async (newTerms: PaymentTerms) => {
      if (!vendor) return;
      setTerms(newTerms);
      setSavingTerms(true);
      await updatePaymentTerms(vendor.relationship_id, newTerms);
      startTransition(() => router.refresh());
      setSavingTerms(false);
    },
    [vendor, router]
  );

  if (!vendor) return null;

  const credDot = vendor.credential_summary.missing_critical
    ? "bg-red-400"
    : vendor.credential_summary.warnings.length > 0
      ? "bg-yellow-400"
      : "bg-green-400";

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-surface-primary border-l border-edge-primary overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-surface-primary border-b border-edge-primary p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-lg bg-surface-secondary border border-edge-secondary flex items-center justify-center flex-shrink-0 text-content-tertiary font-semibold text-sm">
                {vendor.vendor_logo ? (
                  <img
                    src={vendor.vendor_logo}
                    alt={vendor.vendor_name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  vendor.vendor_name.slice(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-content-primary">
                  {vendor.vendor_name}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      STATUS_COLORS[vendor.status] ?? STATUS_COLORS.pending
                    }`}
                  >
                    {t(`status.${vendor.status}`)}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${credDot}`} />
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-secondary text-content-tertiary"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Contact info */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-content-quaternary uppercase tracking-wider">
              {t("pmVendors.contact")}
            </h3>
            {vendor.vendor_email && (
              <p className="text-sm text-content-secondary">{vendor.vendor_email}</p>
            )}
            {vendor.vendor_phone && (
              <p className="text-sm text-content-secondary">{vendor.vendor_phone}</p>
            )}
            {vendor.trades.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {vendor.trades.map((trade) => (
                  <span
                    key={trade}
                    className="px-2 py-0.5 rounded-full text-[10px] bg-surface-secondary text-content-tertiary border border-edge-secondary"
                  >
                    {trade}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Stats */}
          <section>
            <h3 className="text-xs font-semibold text-content-quaternary uppercase tracking-wider mb-2">
              {t("pmVendors.stats")}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface-secondary rounded-lg p-3 text-center">
                <p className="text-lg font-semibold text-content-primary">
                  {vendor.stats.active_jobs}
                </p>
                <p className="text-[10px] text-content-quaternary">{t("activeJobs")}</p>
              </div>
              <div className="bg-surface-secondary rounded-lg p-3 text-center">
                <p className="text-lg font-semibold text-content-primary">
                  {vendor.stats.total_jobs}
                </p>
                <p className="text-[10px] text-content-quaternary">{t("totalJobs")}</p>
              </div>
              <div className="bg-surface-secondary rounded-lg p-3 text-center">
                <p className="text-lg font-semibold text-brand-400">
                  {formatCents(vendor.stats.total_spent_cents)}
                </p>
                <p className="text-[10px] text-content-quaternary">{t("totalRevenue")}</p>
              </div>
            </div>
          </section>

          {/* Credentials */}
          <section>
            <h3 className="text-xs font-semibold text-content-quaternary uppercase tracking-wider mb-2">
              {t("pmVendors.credentials")}
            </h3>
            {loading ? (
              <div className="text-xs text-content-quaternary">{t("pmVendors.loading")}</div>
            ) : detail?.credentials.length ? (
              <div className="space-y-2">
                {detail.credentials.map((cred) => (
                  <div
                    key={cred.id}
                    className="flex items-center justify-between bg-surface-secondary rounded-lg p-3"
                  >
                    <div>
                      <p className="text-sm text-content-primary">{cred.name}</p>
                      <p className="text-xs text-content-quaternary">{cred.type.replace(/_/g, " ")}</p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        cred.status === "active"
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : cred.status === "expiring_soon"
                            ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                      }`}
                    >
                      {t(`status.${cred.status === "expiring_soon" ? "pending" : cred.status}`) || cred.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-content-quaternary">{t("pmVendors.noCredentials")}</p>
            )}

            {/* Warnings */}
            {vendor.credential_summary.warnings.length > 0 && (
              <div className="mt-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
                {vendor.credential_summary.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-yellow-400">
                    {w}
                  </p>
                ))}
              </div>
            )}
          </section>

          {/* Active jobs */}
          <section>
            <h3 className="text-xs font-semibold text-content-quaternary uppercase tracking-wider mb-2">
              {t("pmVendors.recentJobs")}
            </h3>
            {loading ? (
              <div className="text-xs text-content-quaternary">{t("pmVendors.loading")}</div>
            ) : detail?.jobs.length ? (
              <div className="space-y-2">
                {detail.jobs.slice(0, 10).map((job) => (
                  <div
                    key={job.id}
                    className="bg-surface-secondary rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-content-primary truncate">
                        {job.property_name ?? job.description ?? "Work Order"}
                      </p>
                      <span className="text-[10px] text-content-quaternary ml-2 shrink-0">
                        {job.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    {job.trade && (
                      <p className="text-xs text-content-quaternary mt-0.5">{job.trade}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-content-quaternary">{t("noJobHistory")}</p>
            )}
          </section>

          {/* Relationship settings */}
          <section>
            <h3 className="text-xs font-semibold text-content-quaternary uppercase tracking-wider mb-2">
              {t("pmVendors.settings")}
            </h3>

            {/* Payment terms */}
            <div className="mb-3">
              <label className="block text-sm text-content-secondary mb-1">
                {t("paymentTerms")}
              </label>
              <select
                value={terms}
                onChange={(e) => handleTermsChange(e.target.value as PaymentTerms)}
                disabled={savingTerms || isPending}
                className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary disabled:opacity-50"
              >
                {PAYMENT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt.replace("_", " ").toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm text-content-secondary mb-1">
                {t("pmVendors.notes")}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary placeholder:text-content-quaternary resize-none"
                placeholder={t("pmVendors.notesPlaceholder")}
              />
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes || isPending}
                className="mt-1.5 px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium disabled:opacity-50 transition-colors"
              >
                {savingNotes ? t("pmVendors.saving") : t("pmVendors.saveNotes")}
              </button>
            </div>
          </section>

          {/* Actions */}
          <section className="pb-5">
            <h3 className="text-xs font-semibold text-content-quaternary uppercase tracking-wider mb-2">
              {t("pmVendors.actions")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {vendor.status === "pending" && (
                <button
                  onClick={() => onAction(vendor, "resend")}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-edge-primary text-content-secondary hover:bg-surface-secondary transition-colors"
                >
                  {t("pmVendors.resendInvite")}
                </button>
              )}
              {vendor.status === "active" && (
                <button
                  onClick={() => onAction(vendor, "suspend")}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                >
                  {t("pmVendors.suspend")}
                </button>
              )}
              {vendor.status === "suspended" && (
                <button
                  onClick={() => onAction(vendor, "reactivate")}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors"
                >
                  {t("pmVendors.reactivate")}
                </button>
              )}
              {vendor.status !== "terminated" && (
                <button
                  onClick={() => onAction(vendor, "terminate")}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  {t("pmVendors.terminate")}
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
