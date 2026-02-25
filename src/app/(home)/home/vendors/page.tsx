import { createClient } from "@/lib/supabase/server";
import { VendorMarketplaceContent } from "./marketplace-content";

export default async function VendorMarketplacePage() {
  const supabase = await createClient();

  // Get all active vendors
  const { data: vendors } = await supabase
    .from("vendor_organizations")
    .select("id, name, logo_url, description, trades, city, state, service_radius_miles, avg_rating, total_ratings, response_time_label, emergency_available")
    .eq("status", "active")
    .order("avg_rating", { ascending: false });

  return <VendorMarketplaceContent vendors={vendors ?? []} />;
}
