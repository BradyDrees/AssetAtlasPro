"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { VendorInvitePmModal } from "./vendor-invite-pm-modal";
import { ClientInviteModal } from "./client-invite-modal";

export function VendorClientsHeader() {
  const t = useTranslations("vendor.clients");
  const [showInvitePm, setShowInvitePm] = useState(false);
  const [showInviteClient, setShowInviteClient] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-content-primary">
          {t("title")}
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInviteClient(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-4.504a4.5 4.5 0 00-7.244-1.242l-4.5 4.5a4.5 4.5 0 006.364 6.364l1.757-1.757" />
            </svg>
            {t("clientInvite.button")}
          </button>
          <button
            onClick={() => setShowInvitePm(true)}
            className="px-4 py-2 rounded-lg border border-edge-primary bg-surface-secondary hover:bg-surface-tertiary text-sm font-medium text-content-secondary transition-colors"
          >
            {t("invitePm.title")}
          </button>
        </div>
      </div>

      <VendorInvitePmModal
        open={showInvitePm}
        onClose={() => setShowInvitePm(false)}
      />

      <ClientInviteModal
        open={showInviteClient}
        onClose={() => setShowInviteClient(false)}
      />
    </>
  );
}
