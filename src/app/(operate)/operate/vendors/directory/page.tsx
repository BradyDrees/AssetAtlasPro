import { getTranslations } from "next-intl/server";
import { searchVendorDirectory, getAvailableTrades, getAvailableCities } from "@/app/actions/vendor-directory";
import { PageHeader } from "@/components/ui/page-header";
import { VendorDirectoryBrowser } from "@/components/operate/vendor-directory-browser";

export default async function VendorDirectoryPage() {
  const t = await getTranslations("operate.vendors.directory");
  const [vendorsResult, trades, cities] = await Promise.all([
    searchVendorDirectory(),
    getAvailableTrades(),
    getAvailableCities(),
  ]);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
      />
      <VendorDirectoryBrowser
        initialVendors={vendorsResult.data}
        trades={trades}
        cities={cities}
      />
    </div>
  );
}
