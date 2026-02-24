"use server";

import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend-client";
import {
  woAssignedEmail,
  estimateSubmittedEmail,
  estimateDecisionEmail,
  invoiceSubmittedEmail,
  invoicePaidEmail,
  invoiceDisputedEmail,
  newChatMessageEmail,
} from "@/lib/email/templates";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.assetatlaspro.com";

// ─── Helper: get user profile ───
async function getProfile(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .single();
  return data;
}

async function getOrgName(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vendor_organizations")
    .select("name")
    .eq("id", orgId)
    .single();
  return data?.name ?? "Vendor";
}

// ─── Work Order Assigned → notify vendor user ───
export async function notifyWoAssigned(params: {
  vendorUserId: string;
  vendorOrgId: string;
  workOrderId: string;
  propertyName: string;
  description: string;
  priority: string;
}) {
  const profile = await getProfile(params.vendorUserId);
  if (!profile?.email) return;

  const email = woAssignedEmail({
    vendorName: profile.full_name ?? "Vendor",
    propertyName: params.propertyName ?? "Property",
    description: params.description ?? "",
    priority: params.priority,
    jobUrl: `${BASE_URL}/vendor/jobs/${params.workOrderId}`,
  });

  await sendEmail({ to: profile.email, ...email });
}

// ─── Estimate Submitted → notify PM ───
export async function notifyEstimateSubmitted(params: {
  pmUserId: string;
  vendorOrgId: string;
  estimateId: string;
  estimateNumber: string;
  propertyName: string;
  total: number;
}) {
  const pmProfile = await getProfile(params.pmUserId);
  if (!pmProfile?.email) return;

  const orgName = await getOrgName(params.vendorOrgId);

  const email = estimateSubmittedEmail({
    pmName: pmProfile.full_name ?? "PM",
    vendorName: orgName,
    estimateNumber: params.estimateNumber ?? "—",
    propertyName: params.propertyName ?? "Property",
    total: `$${params.total.toFixed(2)}`,
    reviewUrl: `${BASE_URL}/dashboard/vendor-estimates`,
  });

  await sendEmail({ to: pmProfile.email, ...email });
}

// ─── Estimate Approved/Declined → notify vendor owner ───
export async function notifyEstimateDecision(params: {
  vendorOrgId: string;
  estimateId: string;
  estimateNumber: string;
  decision: "approved" | "declined";
  reason?: string;
}) {
  const supabase = await createClient();
  // Get org owner
  const { data: owner } = await supabase
    .from("vendor_users")
    .select("user_id")
    .eq("vendor_org_id", params.vendorOrgId)
    .eq("role", "owner")
    .single();
  if (!owner) return;

  const profile = await getProfile(owner.user_id);
  if (!profile?.email) return;

  const email = estimateDecisionEmail({
    vendorName: profile.full_name ?? "Vendor",
    estimateNumber: params.estimateNumber ?? "—",
    decision: params.decision,
    reason: params.reason,
    estimateUrl: `${BASE_URL}/vendor/estimates/${params.estimateId}`,
  });

  await sendEmail({ to: profile.email, ...email });
}

// ─── Invoice Submitted → notify PM ───
export async function notifyInvoiceSubmitted(params: {
  pmUserId: string;
  vendorOrgId: string;
  invoiceId: string;
  invoiceNumber: string;
  propertyName: string;
  total: number;
}) {
  const pmProfile = await getProfile(params.pmUserId);
  if (!pmProfile?.email) return;

  const orgName = await getOrgName(params.vendorOrgId);

  const email = invoiceSubmittedEmail({
    pmName: pmProfile.full_name ?? "PM",
    vendorName: orgName,
    invoiceNumber: params.invoiceNumber ?? "—",
    propertyName: params.propertyName ?? "Property",
    total: `$${params.total.toFixed(2)}`,
    reviewUrl: `${BASE_URL}/dashboard/vendor-invoices`,
  });

  await sendEmail({ to: pmProfile.email, ...email });
}

// ─── Invoice Paid → notify vendor owner ───
export async function notifyInvoicePaid(params: {
  vendorOrgId: string;
  invoiceId: string;
  invoiceNumber: string;
  total: number;
}) {
  const supabase = await createClient();
  const { data: owner } = await supabase
    .from("vendor_users")
    .select("user_id")
    .eq("vendor_org_id", params.vendorOrgId)
    .eq("role", "owner")
    .single();
  if (!owner) return;

  const profile = await getProfile(owner.user_id);
  if (!profile?.email) return;

  const email = invoicePaidEmail({
    vendorName: profile.full_name ?? "Vendor",
    invoiceNumber: params.invoiceNumber ?? "—",
    total: `$${params.total.toFixed(2)}`,
    invoiceUrl: `${BASE_URL}/vendor/invoices/${params.invoiceId}`,
  });

  await sendEmail({ to: profile.email, ...email });
}

// ─── Invoice Disputed → notify vendor owner ───
export async function notifyInvoiceDisputed(params: {
  vendorOrgId: string;
  invoiceId: string;
  invoiceNumber: string;
  reason: string;
}) {
  const supabase = await createClient();
  const { data: owner } = await supabase
    .from("vendor_users")
    .select("user_id")
    .eq("vendor_org_id", params.vendorOrgId)
    .eq("role", "owner")
    .single();
  if (!owner) return;

  const profile = await getProfile(owner.user_id);
  if (!profile?.email) return;

  const email = invoiceDisputedEmail({
    vendorName: profile.full_name ?? "Vendor",
    invoiceNumber: params.invoiceNumber ?? "—",
    reason: params.reason,
    invoiceUrl: `${BASE_URL}/vendor/invoices/${params.invoiceId}`,
  });

  await sendEmail({ to: profile.email, ...email });
}

// ─── New Chat Message → notify recipient ───
export async function notifyChatMessage(params: {
  recipientUserId: string;
  senderName: string;
  senderRole: string;
  preview: string;
  workOrderId: string;
}) {
  const profile = await getProfile(params.recipientUserId);
  if (!profile?.email) return;

  const email = newChatMessageEmail({
    recipientName: profile.full_name ?? "User",
    senderName: params.senderName,
    senderRole: params.senderRole,
    preview: params.preview,
    chatUrl: `${BASE_URL}/vendor/jobs/${params.workOrderId}`,
  });

  await sendEmail({ to: profile.email, ...email });
}
