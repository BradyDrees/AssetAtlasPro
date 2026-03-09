import { getEstimateDetail } from "@/app/actions/vendor-estimates";
import { EstimateBuilder } from "@/components/vendor/estimate-builder";
import { TierComparison } from "@/components/vendor/tier-comparison";
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

  const isTiered = estimate.tier_mode && estimate.tier_mode !== "none";

  return (
    <div className="space-y-6">
      {/* Show tier comparison above builder for tiered estimates */}
      {isTiered && sections && sections.length > 0 && (
        <TierComparison sections={sections} />
      )}

      {/* Selected tier badge if approved */}
      {estimate.selected_tier && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm text-green-400 font-medium">
            Customer selected: {estimate.selected_tier.charAt(0).toUpperCase() + estimate.selected_tier.slice(1)} tier
          </span>
        </div>
      )}

      <EstimateBuilder estimate={estimate} sections={sections} />
    </div>
  );
}
