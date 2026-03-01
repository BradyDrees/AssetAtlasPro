import { createClient } from "@/lib/supabase/server";
import { MatchingContent } from "./matching-content";

export default async function MatchingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "match_preset, match_weight_proximity, match_weight_rating, match_weight_availability, match_weight_response, match_weight_price"
    )
    .eq("id", user.id)
    .single();

  return (
    <MatchingContent
      preset={(profile?.match_preset as "balanced" | "best_price" | "best_vendor" | "fastest" | "custom") ?? "balanced"}
      weights={{
        proximity: profile?.match_weight_proximity ?? 20,
        rating: profile?.match_weight_rating ?? 20,
        availability: profile?.match_weight_availability ?? 20,
        response: profile?.match_weight_response ?? 20,
        price: profile?.match_weight_price ?? 20,
      }}
    />
  );
}
