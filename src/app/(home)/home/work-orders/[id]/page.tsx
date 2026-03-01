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
  let vendorOrg: { id: string; name: string; avg_rating: number; total_ratings: number; logo_url: string | null } | null = null;
  if (workOrder.vendor_org_id) {
    const { data } = await supabase
      .from("vendor_organizations")
      .select("id, name, avg_rating, total_ratings, logo_url")
      .eq("id", workOrder.vendor_org_id)
      .single();
    vendorOrg = data;
  }

  const photos = await getWorkOrderPhotos(id);

  return <WorkOrderDetailContent workOrder={workOrder} photos={photos} vendorOrg={vendorOrg} />;
}
