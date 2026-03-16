import { getPricebookItems } from "@/app/actions/vendor-templates";
import { PricebookManager } from "@/components/vendor/pricebook-manager";
import { getTranslations } from "next-intl/server";

export default async function PricebookPage() {
  const t = await getTranslations("vendor.estimates");
  const { data: items } = await getPricebookItems();

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <h1 className="text-3xl font-bold text-content-primary tracking-tight">
        {t("pricebook.title")}
      </h1>
      <PricebookManager items={items} />
    </div>
  );
}
