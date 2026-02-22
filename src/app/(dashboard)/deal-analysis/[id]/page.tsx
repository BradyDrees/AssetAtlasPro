import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DealAnalysis } from "@/lib/deal-analysis-types";
import { DealTabs } from "@/components/deal-analysis/deal-tabs";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DealAnalysisDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: deal, error } = await supabase
    .from("deal_analyses")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !deal) {
    notFound();
  }

  return <DealTabs deal={deal as DealAnalysis} />;
}
