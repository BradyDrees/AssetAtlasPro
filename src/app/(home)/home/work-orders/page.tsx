import { createClient } from "@/lib/supabase/server";
import { WorkOrdersContent } from "./work-orders-content";

export default async function WorkOrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: workOrders } = await supabase
    .from("vendor_work_orders")
    .select("*")
    .eq("homeowner_id", user!.id)
    .order("created_at", { ascending: false });

  return <WorkOrdersContent workOrders={workOrders ?? []} />;
}
