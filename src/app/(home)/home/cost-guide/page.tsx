import { getTranslations } from "next-intl/server";
import { CostGuideBrowse } from "./cost-guide-browse";

export default async function CostGuidePage() {
  const t = await getTranslations("home.costGuide");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-content-primary">{t("title")}</h1>
        <p className="text-sm text-content-tertiary mt-1">{t("subtitle")}</p>
      </div>
      <CostGuideBrowse />
    </div>
  );
}
