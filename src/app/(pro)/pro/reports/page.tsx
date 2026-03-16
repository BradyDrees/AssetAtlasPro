import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";

const REPORTS = [
  { slug: "jobs",       icon: "📋" },
  { slug: "sales",      icon: "💰" },
  { slug: "estimates",  icon: "📄" },
  { slug: "invoices",   icon: "🧾" },
  { slug: "timesheets", icon: "⏱️" },
  { slug: "tax",        icon: "🏦" },
] as const;

export default async function ReportsPage() {
  const t = await getTranslations("vendor.reports");

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Link
            key={r.slug}
            href={("/pro/reports/" + r.slug) as string}
            className="block rounded-xl border border-edge-primary bg-surface-primary p-5 hover:border-brand-500 hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{r.icon}</span>
              <div className="min-w-0">
                <h2 className="font-semibold text-content-primary">
                  {t("cards." + r.slug + ".title")}
                </h2>
                <p className="mt-1 text-sm text-content-secondary">
                  {t("cards." + r.slug + ".description")}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}