"use client";

import { useTranslations } from "next-intl";

interface Props {
  onExport: () => void;
  loading?: boolean;
}

export default function ReportExportButton({ onExport, loading }: Props) {
  const t = useTranslations("vendor.reports");

  return (
    <button
      onClick={onExport}
      disabled={loading}
      className={
        "flex items-center gap-2 px-3 py-2 bg-surface-secondary rounded-lg text-sm " +
        "font-medium text-content-primary hover:bg-surface-tertiary transition-colors " +
        "disabled:opacity-50 disabled:cursor-not-allowed"
      }
    >
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
      </svg>
      {loading ? t("export.exporting") : t("export.csv")}
    </button>
  );
}