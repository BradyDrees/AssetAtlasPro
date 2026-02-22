"use client";

import { useTranslations } from "next-intl";

export default function VendorClientsPage() {
  const t = useTranslations("vendor.clients");

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-content-primary mb-6">
        {t("title")}
      </h1>
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
        <svg className="w-12 h-12 text-content-quaternary mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
        <p className="text-content-tertiary">{t("noClients")}</p>
      </div>
    </div>
  );
}
