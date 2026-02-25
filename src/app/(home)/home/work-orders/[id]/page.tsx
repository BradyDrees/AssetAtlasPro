import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { WorkOrderDetailContent } from "./wo-detail-content";

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

  return <WorkOrderDetailContent workOrder={workOrder} />;
}
