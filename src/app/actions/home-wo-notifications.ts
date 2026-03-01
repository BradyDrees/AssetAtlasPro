"use server";

import { createClient } from "@/lib/supabase/server";

export async function notifyVendorNewWO(params: {
  woId: string;
  vendorOrgId: string;
  trade: string;
  description: string;
  urgency: string;
}) {
  const supabase = await createClient();

  const { data: members } = await supabase
    .from("vendor_users")
    .select("user_id")
    .eq("vendor_org_id", params.vendorOrgId)
    .eq("is_active", true);

  const userIds = (members ?? []).map((m) => m.user_id);
  if (!userIds.length) return;

  await supabase.from("vendor_notifications").insert(
    userIds.map((uid) => ({
      user_id: uid,
      type: "new_work_order",
      title: "New Work Order",
      body: `${params.trade} \u2022 ${params.urgency}`,
      reference_type: "work_order",
      reference_id: params.woId,
      is_read: false,
    }))
  );
}

export async function notifyHomeownerSubmission(params: {
  homeownerId: string;
  woId: string;
  trade: string;
  vendorAssigned: boolean;
}) {
  const supabase = await createClient();

  await supabase.from("vendor_notifications").insert({
    user_id: params.homeownerId,
    type: "wo_submitted",
    title: "Work order submitted",
    body: params.vendorAssigned
      ? `We're notifying a vendor now (${params.trade}).`
      : `Submitted (${params.trade}). You can choose a vendor.`,
    reference_type: "work_order",
    reference_id: params.woId,
    is_read: false,
  });
}

export async function notifyHomeownerStatusChange(params: {
  homeownerId: string;
  woId: string;
  newStatus: string;
  vendorOrgName?: string | null;
}) {
  const supabase = await createClient();

  await supabase.from("vendor_notifications").insert({
    user_id: params.homeownerId,
    type: "wo_status",
    title: "Work order update",
    body: params.vendorOrgName
      ? `${params.vendorOrgName}: ${params.newStatus.replace(/_/g, " ")}`
      : `Status: ${params.newStatus.replace(/_/g, " ")}`,
    reference_type: "work_order",
    reference_id: params.woId,
    is_read: false,
  });
}
