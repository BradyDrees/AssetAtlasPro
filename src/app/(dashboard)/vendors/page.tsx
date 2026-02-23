import { getPmVendors } from "@/app/actions/pm-vendors";
import { PmVendorsList } from "@/components/vendor/pm-vendors-list";
import { getTranslations } from "next-intl/server";

export default async function PmVendorsPage() {
  const t = await getTranslations("vendor.clients");
  const { data: vendors } = await getPmVendors();

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-content-primary">
        {t("pmVendors.title")}
      </h1>
      <PmVendorsList vendors={vendors} />
    </div>
  );
}
