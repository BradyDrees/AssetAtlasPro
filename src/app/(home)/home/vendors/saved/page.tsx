import { createClient } from "@/lib/supabase/server";
import { SavedVendorsContent } from "./saved-vendors-content";

export default async function SavedVendorsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get saved vendor preferences
  const { data: prefs } = await supabase
    .from("homeowner_vendor_preferences")
    .select("id, vendor_org_id, preference_type, trade, created_at")
    .eq("user_id", user!.id)
    .in("preference_type", ["saved", "preferred"])
    .order("created_at", { ascending: false });

  // Get vendor details for each pref
  const vendorIds = [...new Set((prefs ?? []).map((p) => p.vendor_org_id))];

  let vendors: Array<{ id: string; name: string; logo_url: string | null; trades: string[]; avg_rating: number; total_ratings: number }> = [];

  if (vendorIds.length > 0) {
    const { data } = await supabase
      .from("vendor_organizations")
      .select("id, name, logo_url, trades, avg_rating, total_ratings")
      .in("id", vendorIds);
    vendors = data ?? [];
  }

  return <SavedVendorsContent prefs={prefs ?? []} vendors={vendors} />;
}
