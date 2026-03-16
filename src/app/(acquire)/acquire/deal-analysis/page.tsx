import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import type { DealAnalysis } from "@/lib/deal-analysis-types";
import { DealAnalysisListClient } from "@/components/deal-analysis/deal-list-client";
import { PageHeader } from "@/components/ui/page-header";

export default async function DealAnalysisPage() {
  const supabase = await createClient();
  const t = await getTranslations();

  const { data: deals } = await supabase
    .from("deal_analyses")
    .select("*")
    .order("updated_at", { ascending: false });

  return (
    <div>
      <PageHeader title={t("dealAnalysis.title")} subtitle={t("dealAnalysis.subtitle")} />

      <DealAnalysisListClient deals={(deals as DealAnalysis[]) ?? []} />
    </div>
  );
}
