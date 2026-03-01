import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProjectDetailContent } from "./project-detail-content";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, title, description, status, template_name, total_trades, completed_trades, estimated_duration_days, estimated_cost_low, estimated_cost_high, actual_cost, created_at"
    )
    .eq("id", id)
    .eq("homeowner_id", user!.id)
    .single();

  if (!project) redirect("/home/projects");

  const { data: workOrders } = await supabase
    .from("vendor_work_orders")
    .select(
      "id, trade, description, status, sequence_order, depends_on, vendor_org_id, created_at"
    )
    .eq("project_id", id)
    .order("sequence_order", { ascending: true });

  // Get vendor org names for assigned WOs
  const vendorOrgIds = [
    ...new Set(
      (workOrders ?? [])
        .map((wo) => wo.vendor_org_id)
        .filter((id): id is string => id !== null)
    ),
  ];

  let vendorOrgs: Record<string, string> = {};
  if (vendorOrgIds.length > 0) {
    const { data: orgs } = await supabase
      .from("vendor_organizations")
      .select("id, name")
      .in("id", vendorOrgIds);

    vendorOrgs = Object.fromEntries(
      (orgs ?? []).map((o) => [o.id, o.name])
    );
  }

  return (
    <ProjectDetailContent
      project={project}
      workOrders={workOrders ?? []}
      vendorOrgs={vendorOrgs}
    />
  );
}
