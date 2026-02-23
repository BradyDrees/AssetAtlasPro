import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function TaxReportPage() {
  const t = await getTranslations("vendor.reports");

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Link
          href="/vendor/reports"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-secondary text-content-secondary hover:text-content-primary transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-content-primary">
          {t("cards.tax.title")}
        </h1>
      </div>

      <div className="rounded-xl border border-edge-primary bg-surface-primary p-8 text-center">
        <p className="text-content-muted">{t("comingSoon")}</p>
      </div>
    </div>
  );
}