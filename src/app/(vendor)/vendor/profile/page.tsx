"use client";

import { useTranslations } from "next-intl";

export default function VendorProfilePage() {
  const t = useTranslations("vendor.profile");

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-content-primary mb-6">
        {t("title")}
      </h1>
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
        <svg className="w-12 h-12 text-content-quaternary mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-content-tertiary">{t("comingSoon")}</p>
      </div>
    </div>
  );
}
