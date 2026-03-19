import Link from "next/link";
import { getPmVendors } from "@/app/actions/pm-vendors";
import { PmVendorsList } from "@/components/vendor/pm-vendors-list";
import { PageHeader } from "@/components/ui/page-header";
import { getTranslations } from "next-intl/server";

export default async function PmVendorsPage() {
  const [t, td] = await Promise.all([
    getTranslations("vendor.clients"),
    getTranslations("operate.vendors.directory"),
  ]);
  const { data: vendors } = await getPmVendors();

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <PageHeader
        title={t("pmVendors.title")}
        action={
          <Link
            href="/operate/vendors/directory"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            {td("title")}
          </Link>
        }
      />
      <PmVendorsList initial={vendors} />
    </div>
  );
}
