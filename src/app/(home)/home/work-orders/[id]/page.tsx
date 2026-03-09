import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { WorkOrderDetailContent } from "./wo-detail-content";
import { getWorkOrderPhotos } from "@/app/actions/home-work-orders";

export default async function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: workOrder } = await supabase
    .from("vendor_work_orders")
    .select("*")
    .eq("id", id)
    .eq("homeowner_id", user!.id)
    .single();

  if (!workOrder) {
    notFound();
  }

  // Fetch vendor org details if assigned
  let vendorOrg: { id: string; name: string; avg_rating: number; total_ratings: number; logo_url: string | null; settings: Record<string, unknown> | null } | null = null;
  if (workOrder.vendor_org_id) {
    const { data } = await supabase
      .from("vendor_organizations")
      .select("id, name, avg_rating, total_ratings, logo_url, settings")
      .eq("id", workOrder.vendor_org_id)
      .single();
    vendorOrg = data;
  }

  // Fetch estimate with sections/items for this WO
  let estimateData: {
    id: string;
    estimate_number: string;
    total: number;
    status: string;
    tier_mode: string;
    selected_tier: string | null;
    sections: Array<{
      id: string;
      title: string;
      tier: string | null;
      subtotal: number;
      items: Array<{ description: string; quantity: number; unit_price: number; total: number }>;
    }>;
  } | null = null;

  const { data: estimate } = await supabase
    .from("vendor_estimates")
    .select("id, estimate_number, total, status, tier_mode, selected_tier")
    .eq("work_order_id", id)
    .in("status", ["sent", "approved"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (estimate) {
    const { data: sections } = await supabase
      .from("vendor_estimate_sections")
      .select("id, title, tier, subtotal, sort_order")
      .eq("estimate_id", estimate.id)
      .order("sort_order");

    const sectionIds = sections?.map((s) => s.id) ?? [];
    let items: Array<{ section_id: string; description: string; quantity: number; unit_price: number; total: number }> = [];
    if (sectionIds.length > 0) {
      const { data: itemData } = await supabase
        .from("vendor_estimate_items")
        .select("section_id, description, quantity, unit_price, total")
        .in("section_id", sectionIds)
        .order("sort_order");
      items = itemData ?? [];
    }

    estimateData = {
      id: estimate.id,
      estimate_number: estimate.estimate_number ?? "",
      total: Number(estimate.total) || 0,
      status: estimate.status,
      tier_mode: estimate.tier_mode ?? "none",
      selected_tier: estimate.selected_tier ?? null,
      sections: (sections ?? []).map((s) => ({
        id: s.id,
        title: s.title ?? "",
        tier: s.tier ?? null,
        subtotal: Number(s.subtotal) || 0,
        items: items
          .filter((i) => i.section_id === s.id)
          .map((i) => ({
            description: i.description ?? "",
            quantity: Number(i.quantity) || 0,
            unit_price: Number(i.unit_price) || 0,
            total: Number(i.total) || 0,
          })),
      })),
    };
  }

  const photos = await getWorkOrderPhotos(id);

  // Extract google review URL from vendor settings
  const googleReviewUrl = typeof vendorOrg?.settings?.google_review_url === "string"
    ? vendorOrg.settings.google_review_url
    : undefined;

  return (
    <WorkOrderDetailContent
      workOrder={workOrder}
      photos={photos}
      vendorOrg={vendorOrg}
      googleReviewUrl={googleReviewUrl}
      estimateData={estimateData}
    />
  );
}
