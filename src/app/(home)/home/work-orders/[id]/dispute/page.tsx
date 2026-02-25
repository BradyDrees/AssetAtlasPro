import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getDisputeForWorkOrder } from "@/app/actions/home-disputes";
import { DisputeContent } from "./dispute-content";

export default async function DisputePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  // Get work order
  const { data: wo } = await supabase
    .from("vendor_work_orders")
    .select("id, status, vendor_org_id, trade, description, warranty_expires_at")
    .eq("id", id)
    .eq("homeowner_id", user.id)
    .single();

  if (!wo) notFound();

  // Get vendor name
  let vendorName = "Unknown Vendor";
  if (wo.vendor_org_id) {
    const { data: vendor } = await supabase
      .from("vendor_organizations")
      .select("name")
      .eq("id", wo.vendor_org_id)
      .single();
    if (vendor) vendorName = vendor.name;
  }

  // Check for existing dispute
  const existingDispute = await getDisputeForWorkOrder(id);

  return (
    <DisputeContent
      workOrder={{
        id: wo.id,
        status: wo.status,
        vendor_org_id: wo.vendor_org_id,
        trade: wo.trade,
        description: wo.description,
        warranty_expires_at: wo.warranty_expires_at,
      }}
      vendorName={vendorName}
      existingDispute={existingDispute}
    />
  );
}
