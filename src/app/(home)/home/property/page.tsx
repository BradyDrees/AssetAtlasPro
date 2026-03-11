import { createClient } from "@/lib/supabase/server";
import { getSystemPhotos } from "@/app/actions/home-property";
import { getHealthScore } from "@/app/actions/home-dashboard";
import { PropertyContent } from "./property-content";
import { HealthScoreBreakdown } from "@/components/home/health-score-breakdown";
import { PassportShare } from "@/components/home/passport-share";

export default async function PropertyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: property } = await supabase
    .from("homeowner_properties")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Fetch system photos and health score in parallel
  const [photosBySystem, healthScore] = await Promise.all([
    property ? getSystemPhotos(property.id) : {},
    getHealthScore(),
  ]);

  return (
    <>
      <PropertyContent property={property} photosBySystem={photosBySystem} />
      {healthScore && (
        <div className="max-w-3xl mx-auto mt-6">
          <HealthScoreBreakdown breakdown={healthScore.breakdown} />
        </div>
      )}
      {property && (
        <div className="max-w-3xl mx-auto mt-6">
          <PassportShare currentToken={property.passport_token ?? null} />
        </div>
      )}
    </>
  );
}
