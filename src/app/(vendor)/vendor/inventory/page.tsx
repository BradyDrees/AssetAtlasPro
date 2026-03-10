import { getTranslations } from "next-intl/server";
import { PartsCatalog } from "@/components/vendor/parts-catalog";

export default async function InventoryPage() {
  const t = await getTranslations("vendor.inventory");

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-content-primary">{t("title")}</h1>
        <p className="text-content-tertiary mt-1">{t("subtitle")}</p>
      </div>
      <PartsCatalog />
    </div>
  );
}
