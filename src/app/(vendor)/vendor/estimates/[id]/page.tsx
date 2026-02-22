import { getEstimateDetail } from "@/app/actions/vendor-estimates";
import { EstimateBuilder } from "@/components/vendor/estimate-builder";
import { redirect } from "next/navigation";

interface EstimateDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EstimateDetailPage({
  params,
}: EstimateDetailPageProps) {
  const { id } = await params;
  const { estimate, sections, error } = await getEstimateDetail(id);

  if (error || !estimate) {
    redirect("/vendor/estimates");
  }

  return <EstimateBuilder estimate={estimate} sections={sections} />;
}
