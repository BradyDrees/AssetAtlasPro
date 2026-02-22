"use client";

import { useTranslations } from "next-intl";

export default function VendorSchedulePage() {
  const t = useTranslations("vendor.schedule");

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-content-primary mb-6">
        {t("title")}
      </h1>
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
        <svg className="w-12 h-12 text-content-quaternary mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
        <p className="text-content-tertiary">{t("noJobs")}</p>
      </div>
    </div>
  );
}
