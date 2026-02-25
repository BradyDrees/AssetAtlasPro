import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import type { DealAnalysis } from "@/lib/deal-analysis-types";
import { DealAnalysisListClient } from "@/components/deal-analysis/deal-list-client";

export default async function DealAnalysisPage() {
  const supabase = await createClient();
  const t = await getTranslations();

  const { data: deals } = await supabase
    .from("deal_analyses")
    .select("*")
    .order("updated_at", { ascending: false });

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">
            {t("dealAnalysis.title")}
          </h1>
          <p className="text-sm text-content-tertiary mt-1">
            {t("dealAnalysis.subtitle")}
          </p>
        </div>
      </div>

      <DealAnalysisListClient deals={(deals as DealAnalysis[]) ?? []} />
    </div>
  );
}
