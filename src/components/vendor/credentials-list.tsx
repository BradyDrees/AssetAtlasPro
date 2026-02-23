"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { VendorCredential } from "@/lib/vendor/types";
import { CredentialCard } from "@/components/vendor/credential-card";
import { CredentialUpload } from "@/components/vendor/credential-upload";

interface CredentialsListProps {
  credentials: VendorCredential[];
}

export function CredentialsList({ credentials }: CredentialsListProps) {
  const t = useTranslations("vendor.profile");
  const [showUpload, setShowUpload] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "expiring_soon" | "expired" | "revoked">("all");

  const filtered =
    filter === "all"
      ? credentials
      : credentials.filter((c) => c.status === filter);

  const counts = {
    all: credentials.length,
    active: credentials.filter((c) => c.status === "active").length,
    expiring_soon: credentials.filter((c) => c.status === "expiring_soon").length,
    expired: credentials.filter((c) => c.status === "expired").length,
    revoked: credentials.filter((c) => c.status === "revoked").length,
  };

  return (
    <>
      {/* Filter pills + Upload button */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(["all", "active", "expiring_soon", "expired", "revoked"] as const).map(
            (key) =>
              counts[key] > 0 || key === "all" ? (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors ${
                    filter === key
                      ? "bg-brand-600/20 text-brand-400 border-brand-500/30"
                      : "bg-surface-secondary text-content-tertiary border-edge-secondary hover:border-edge-primary"
                  }`}
                >
                  {t(`credentials.filter.${key}`)} ({counts[key]})
                </button>
              ) : null
          )}
        </div>

        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {t("credentials.upload")}
        </button>
      </div>

      {/* Credentials Grid */}
      {filtered.length === 0 ? (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
          <svg className="w-12 h-12 text-content-quaternary mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          <p className="text-content-tertiary text-sm">{t("credentials.noCredentials")}</p>
          <button
            onClick={() => setShowUpload(true)}
            className="mt-3 text-sm text-brand-400 hover:text-brand-300"
          >
            {t("credentials.uploadFirst")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((cred) => (
            <CredentialCard key={cred.id} credential={cred} />
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <CredentialUpload open={showUpload} onClose={() => setShowUpload(false)} />
    </>
  );
}
