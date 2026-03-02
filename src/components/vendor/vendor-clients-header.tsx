"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { VendorInvitePmModal } from "./vendor-invite-pm-modal";

export function VendorClientsHeader() {
  const t = useTranslations("vendor.clients");
  const [showInvite, setShowInvite] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-content-primary">
          {t("title")}
        </h1>
        <button
          onClick={() => setShowInvite(true)}
          className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
        >
          {t("invitePm.title")}
        </button>
      </div>

      <VendorInvitePmModal
        open={showInvite}
        onClose={() => setShowInvite(false)}
      />
    </>
  );
}
