import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProjectDetailContent } from "./project-detail-content";
import type { BidInvitation } from "@/app/actions/home-project-bids";

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
        .filter((vid): vid is string => vid !== null)
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

  // Fetch bid invitations for all WOs in this project
  const { data: bids } = await supabase
    .from("project_bid_invitations")
    .select("*")
    .eq("project_id", id)
    .order("invited_at", { ascending: true });

  // Enrich bids with vendor names and estimate totals
  const bidsMap: Record<string, BidInvitation[]> = {};
  if (bids && bids.length > 0) {
    const bidOrgIds = [...new Set(bids.map((b) => b.vendor_org_id))];
    const { data: bidOrgs } = await supabase
      .from("vendor_organizations")
      .select("id, name")
      .in("id", bidOrgIds);

    const bidOrgMap = Object.fromEntries(
      (bidOrgs ?? []).map((o) => [o.id, o.name])
    );

    const estimateIds = bids
      .map((b) => b.estimate_id)
      .filter((eid): eid is string => eid !== null);

    let estMap: Record<string, number> = {};
    if (estimateIds.length > 0) {
      const { data: ests } = await supabase
        .from("vendor_estimates")
        .select("id, total")
        .in("id", estimateIds);

      estMap = Object.fromEntries(
        (ests ?? []).map((e) => [e.id, Number(e.total) || 0])
      );
    }

    for (const b of bids) {
      const woId = b.work_order_id;
      if (!bidsMap[woId]) bidsMap[woId] = [];
      bidsMap[woId].push({
        ...b,
        vendor_name: bidOrgMap[b.vendor_org_id] ?? "Unknown",
        estimate_total: b.estimate_id ? (estMap[b.estimate_id] ?? null) : null,
      });
    }
  }

  return (
    <ProjectDetailContent
      project={project}
      workOrders={workOrders ?? []}
      vendorOrgs={vendorOrgs}
      initialBids={bidsMap}
    />
  );
}
