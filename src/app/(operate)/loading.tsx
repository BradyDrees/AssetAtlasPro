"use client";

import { useTranslations } from "next-intl";

export default function Loading() {
  const t = useTranslations();
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="animate-spin rounded-full h-9 w-9 border-[3px] border-green-200 border-t-green-600" />
      <span className="text-sm text-content-muted font-medium">{t("common.loading")}</span>
    </div>
  );
}
