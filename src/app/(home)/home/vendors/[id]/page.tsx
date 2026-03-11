import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getVendorBadges } from "@/app/actions/home-vendors";
import { VendorProfileContent } from "./vendor-profile-content";

export default async function VendorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: vendor } = await supabase
    .from("vendor_organizations")
    .select("*")
    .eq("id", id)
    .eq("status", "active")
    .single();

  if (!vendor) {
    notFound();
  }

  // Get ratings
  const { data: ratings } = await supabase
    .from("vendor_ratings")
    .select("id, rating, review, created_at, vendor_response, vendor_responded_at")
    .eq("vendor_org_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Check if user has saved/preferred this vendor
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isSaved = false;
  let isPreferred = false;

  if (user) {
    const { data: prefs } = await supabase
      .from("homeowner_vendor_preferences")
      .select("id, preference_type")
      .eq("user_id", user.id)
      .eq("vendor_org_id", id);

    isSaved = (prefs ?? []).some((p) => p.preference_type === "saved");
    isPreferred = (prefs ?? []).some((p) => p.preference_type === "preferred");
  }

  // Fetch trust badges
  const badgeMap = await getVendorBadges([id]);
  const badges = badgeMap[id] ?? null;

  return (
    <VendorProfileContent
      vendor={vendor}
      ratings={ratings ?? []}
      initialSaved={isSaved}
      initialPreferred={isPreferred}
      badges={badges}
    />
  );
}
