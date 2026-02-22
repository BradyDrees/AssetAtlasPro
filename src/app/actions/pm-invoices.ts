"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePmRole, logActivity } from "@/lib/vendor/role-helpers";
import type { VendorInvoice, VendorInvoiceItem } from "@/lib/vendor/invoice-types";

// ============================================
// PM Invoice Queries
// ============================================

export async function getPmInvoices(filters?: {
  status?: string | string[];
}): Promise<{ data: VendorInvoice[]; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: [], error: "Not authenticated" };

  let query = supabase
    .from("vendor_invoices")
    .select("*")
    .eq("pm_user_id", user.id)
    .neq("status", "draft")
    .order("created_at", { ascending: false });

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in("status", filters.status);
    } else {
      query = query.eq("status", filters.status);
    }
  }

  const { data, error } = await query;
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as VendorInvoice[] };
}

export async function getPmInvoiceDetail(invoiceId: string): Promise<{
  invoice: VendorInvoice | null;
  items: VendorInvoiceItem[];
  error?: string;
}> {
  await requirePmRole();
  const supabase = await createClient();

  const { data: invoice, error: invError } = await supabase
    .from("vendor_invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();

  if (invError || !invoice) {
    return { invoice: null, items: [], error: invError?.message || "Not found" };
  }

  const { data: items } = await supabase
    .from("vendor_invoice_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: true });

  return {
    invoice: invoice as VendorInvoice,
    items: (items ?? []) as VendorInvoiceItem[],
  };
}

// ============================================
// PM Invoice Actions
// ============================================

export async function approveInvoice(
  invoiceId: string
): Promise<{ error?: string }> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: inv } = await supabase
    .from("vendor_invoices")
    .select("status, vendor_org_id")
    .eq("id", invoiceId)
    .single();

  if (!inv) return { error: "Invoice not found" };

  const validFrom = ["submitted"];
  if (!validFrom.includes(inv.status)) {
    return { error: `Cannot approve from status "${inv.status}"` };
  }

  await supabase
    .from("vendor_invoices")
    .update({
      status: "pm_approved",
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);

  // Notify vendor
  const { data: vendorUsers } = await supabase
    .from("vendor_users")
    .select("user_id")
    .eq("vendor_org_id", inv.vendor_org_id)
    .eq("is_active", true);

  if (vendorUsers) {
    const notifications = vendorUsers.map((vu) => ({
      user_id: vu.user_id,
      type: "invoice_approved",
      title: "Invoice approved",
      body: "Your invoice has been approved by the PM",
      reference_type: "invoice",
      reference_id: invoiceId,
    }));
    await supabase.from("vendor_notifications").insert(notifications);
  }

  await logActivity({
    entityType: "invoice",
    entityId: invoiceId,
    action: "pm_approved",
    actorRole: "pm",
    oldValue: inv.status,
    newValue: "pm_approved",
  });

  return {};
}

export async function disputeInvoice(
  invoiceId: string,
  reason: string
): Promise<{ error?: string }> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: inv } = await supabase
    .from("vendor_invoices")
    .select("status, vendor_org_id")
    .eq("id", invoiceId)
    .single();

  if (!inv) return { error: "Invoice not found" };

  await supabase
    .from("vendor_invoices")
    .update({
      status: "disputed",
      dispute_reason: reason,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);

  // Notify vendor
  const { data: vendorUsers } = await supabase
    .from("vendor_users")
    .select("user_id")
    .eq("vendor_org_id", inv.vendor_org_id)
    .eq("is_active", true);

  if (vendorUsers) {
    const notifications = vendorUsers.map((vu) => ({
      user_id: vu.user_id,
      type: "invoice_disputed",
      title: "Invoice disputed",
      body: reason,
      reference_type: "invoice",
      reference_id: invoiceId,
    }));
    await supabase.from("vendor_notifications").insert(notifications);
  }

  await logActivity({
    entityType: "invoice",
    entityId: invoiceId,
    action: "disputed",
    actorRole: "pm",
    oldValue: inv.status,
    newValue: "disputed",
    metadata: { reason },
  });

  return {};
}

export async function markInvoicePaid(
  invoiceId: string
): Promise<{ error?: string }> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: inv } = await supabase
    .from("vendor_invoices")
    .select("status, vendor_org_id")
    .eq("id", invoiceId)
    .single();

  if (!inv) return { error: "Invoice not found" };

  const validFrom = ["pm_approved", "processing"];
  if (!validFrom.includes(inv.status)) {
    return { error: `Cannot mark paid from status "${inv.status}"` };
  }

  await supabase
    .from("vendor_invoices")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);

  // Notify vendor
  const { data: vendorUsers } = await supabase
    .from("vendor_users")
    .select("user_id")
    .eq("vendor_org_id", inv.vendor_org_id)
    .eq("is_active", true);

  if (vendorUsers) {
    const notifications = vendorUsers.map((vu) => ({
      user_id: vu.user_id,
      type: "invoice_paid",
      title: "Invoice paid",
      body: "Your invoice has been marked as paid",
      reference_type: "invoice",
      reference_id: invoiceId,
    }));
    await supabase.from("vendor_notifications").insert(notifications);
  }

  await logActivity({
    entityType: "invoice",
    entityId: invoiceId,
    action: "paid",
    actorRole: "pm",
    oldValue: inv.status,
    newValue: "paid",
  });

  return {};
}
