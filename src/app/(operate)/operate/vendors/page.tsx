import { getPmVendors } from "@/app/actions/pm-vendors";
import { PmVendorsList } from "@/components/vendor/pm-vendors-list";
import { PageHeader } from "@/components/ui/page-header";
import { getTranslations } from "next-intl/server";

export default async function PmVendorsPage() {
  const t = await getTranslations("vendor.clients");
  const { data: vendors } = await getPmVendors();

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <PageHeader title={t("pmVendors.title")} />
      <PmVendorsList initial={vendors} />
    </div>
  );
}
