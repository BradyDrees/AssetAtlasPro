import { getPmVendors } from "@/app/actions/pm-vendors";
import { PmVendorsList } from "@/components/vendor/pm-vendors-list";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function ProClientsPage() {
  const t = await getTranslations("vendor.clients");

  let vendors: Awaited<ReturnType<typeof getPmVendors>>["data"] = [];
  let hasPmAccess = true;
  try {
    const result = await getPmVendors();
    vendors = result.data;
  } catch {
    hasPmAccess = false;
  }

  if (!hasPmAccess) {
    return (
      <div className="max-w-4xl mx-auto space-y-5">
        <h1 className="text-2xl font-bold text-content-primary">
          {t("pmVendors.title")}
        </h1>
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-12 text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-content-quaternary opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
          <p className="text-sm text-content-tertiary">{t("pmVendors.noPmAccess")}</p>
          <Link
            href="/pro/jobs"
            className="inline-block mt-3 text-sm font-medium text-brand-500 hover:text-brand-400"
          >
            {t("pmVendors.backToJobs")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-content-primary">
        {t("pmVendors.title")}
      </h1>
      <PmVendorsList initial={vendors} />
    </div>
  );
}
