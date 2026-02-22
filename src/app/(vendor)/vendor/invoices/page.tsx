"use client";

import { useTranslations } from "next-intl";

export default function VendorInvoicesPage() {
  const t = useTranslations("vendor.invoices");

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-content-primary mb-6">
        {t("title")}
      </h1>
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
        <svg className="w-12 h-12 text-content-quaternary mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <p className="text-content-tertiary">{t("noInvoices")}</p>
      </div>
    </div>
  );
}
