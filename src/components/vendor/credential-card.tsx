"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { VendorCredential } from "@/lib/vendor/types";
import { CREDENTIAL_STATUS_COLORS } from "@/lib/vendor/types";
import { deleteCredential, revokeCredential } from "@/app/actions/vendor-profile";

interface CredentialCardProps {
  credential: VendorCredential;
}

/** Days until expiration — returns null if no expiration date */
function daysUntilExpiration(expirationDate: string | null): number | null {
  if (!expirationDate) return null;
  const now = new Date();
  const exp = new Date(expirationDate);
  return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/** Format file size */
function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CredentialCard({ credential }: CredentialCardProps) {
  const t = useTranslations("vendor.profile");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const daysLeft = daysUntilExpiration(credential.expiration_date);
  const statusColors = CREDENTIAL_STATUS_COLORS[credential.status];

  // Expiration indicator color
  const expirationColor =
    credential.status === "expired"
      ? "text-red-400"
      : credential.status === "expiring_soon"
        ? "text-yellow-400"
        : "text-green-400";

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    await deleteCredential(credential.id);
    startTransition(() => router.refresh());
    setDeleting(false);
  }, [credential.id, router]);

  const handleRevoke = useCallback(async () => {
    setRevoking(true);
    await revokeCredential(credential.id);
    startTransition(() => router.refresh());
    setRevoking(false);
  }, [credential.id, router]);

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary hover:border-edge-secondary transition-colors">
      {/* Clickable header area */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4"
      >
        <div className="flex items-start justify-between">
          {/* Left: Type icon + info */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* Type icon */}
            <div className="w-10 h-10 rounded-lg bg-surface-secondary border border-edge-secondary flex items-center justify-center flex-shrink-0">
              <CredentialTypeIcon type={credential.type} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-medium text-content-primary truncate">
                  {credential.name}
                </h3>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColors}`}
                >
                  {t(`credentials.${credential.status}`)}
                </span>
              </div>

              <p className="text-xs text-content-tertiary mt-0.5">
                {t(`credentials.types.${credential.type}`)}
              </p>

              {credential.expiration_date && (
                <p className={`text-xs mt-1 ${expirationColor}`}>
                  {t("credentials.expires")}: {new Date(credential.expiration_date).toLocaleDateString()}
                  {daysLeft !== null && daysLeft > 0 && (
                    <> ({daysLeft} {t("credentials.daysLeft")})</>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Expand chevron */}
          <svg
            className={`w-4 h-4 text-content-quaternary flex-shrink-0 ml-2 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded detail section */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-edge-secondary pt-3 space-y-3">
          {credential.document_number && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-content-tertiary">{t("credentials.docNumber")}</span>
              <span className="text-content-primary font-mono">#{credential.document_number}</span>
            </div>
          )}

          {credential.issued_date && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-content-tertiary">{t("credentials.issued")}</span>
              <span className="text-content-primary">{new Date(credential.issued_date).toLocaleDateString()}</span>
            </div>
          )}

          {credential.expiration_date && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-content-tertiary">{t("credentials.expires")}</span>
              <span className={expirationColor}>{new Date(credential.expiration_date).toLocaleDateString()}</span>
            </div>
          )}

          {/* File info */}
          {credential.file_name && (
            <div className="flex items-center gap-2 text-xs">
              <svg className="w-3.5 h-3.5 text-content-quaternary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <span className="text-content-quaternary truncate">{credential.file_name}</span>
              {credential.file_size && (
                <span className="text-content-quaternary">({formatFileSize(credential.file_size)})</span>
              )}
            </div>
          )}

          {/* Actions row */}
          <div className="flex items-center gap-2 pt-1">
            {credential.status !== "revoked" && (
              <button
                onClick={(e) => { e.stopPropagation(); handleRevoke(); }}
                disabled={revoking || isPending}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 hover:bg-yellow-400/20 disabled:opacity-50"
              >
                {revoking ? t("credentials.revoking") : t("credentials.revoke")}
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(); }}
              disabled={deleting || isPending}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-400/10 border border-red-400/20 hover:bg-red-400/20 disabled:opacity-50"
            >
              {deleting ? t("credentials.deleting") : t("credentials.delete")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Icon per credential type */
function CredentialTypeIcon({ type }: { type: string }) {
  const iconClass = "w-5 h-5 text-content-tertiary";

  switch (type) {
    case "insurance_gl":
    case "insurance_wc":
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      );
    case "license":
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
        </svg>
      );
    case "w9":
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
    case "certification":
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
        </svg>
      );
    case "bond":
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
  }
}
