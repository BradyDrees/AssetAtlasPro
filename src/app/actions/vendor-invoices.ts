"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole, logActivity } from "@/lib/vendor/role-helpers";
import {
  validateInvoiceTransition,
  vendorOrgRoleToTransitionRole,
} from "@/lib/vendor/state-machine";
import type { InvoiceStatus } from "@/lib/vendor/types";
import type {
  VendorInvoice,
  VendorInvoiceItem,
  CreateInvoiceInput,
  CreateInvoiceItemInput,
  UpdateInvoiceItemInput,
} from "@/lib/vendor/invoice-types";

// ============================================
// Invoice Queries
// ============================================

export async function getVendorInvoices(filters?: {
  status?: InvoiceStatus | InvoiceStatus[];
  page?: number;
  pageSize?: number;
}): Promise<{ data: VendorInvoice[]; total: number; page: number; pageSize: number; error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  const safePage = Math.max(1, filters?.page ?? 1);
  const safeSize = Math.min(Math.max(1, filters?.pageSize ?? 25), 100);
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;

  let query = supabase
    .from("vendor_invoices")
    .select("*", { count: "exact" })
    .eq("vendor_org_id", vendor_org_id)
    .range(from, to)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in("status", filters.status);
    } else {
      query = query.eq("status", filters.status);
    }
  }

  const { data, count, error } = await query;
  if (error) return { data: [], total: 0, page: safePage, pageSize: safeSize, error: error.message };
  return { data: (data ?? []) as VendorInvoice[], total: count ?? 0, page: safePage, pageSize: safeSize };
}

export async function getInvoiceDetail(invoiceId: string): Promise<{
  invoice: VendorInvoice | null;
  items: VendorInvoiceItem[];
  error?: string;
}> {
  await requireVendorRole();
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
// Invoice CRUD
// ============================================

export async function createInvoice(
  input: CreateInvoiceInput
): Promise<{ data?: VendorInvoice; error?: string }> {
  const vendorAuth = await requireVendorRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Generate invoice number
  const { count } = await supabase
    .from("vendor_invoices")
    .select("*", { count: "exact", head: true })
    .eq("vendor_org_id", vendorAuth.vendor_org_id);

  const invNumber = `INV-${String((count ?? 0) + 1).padStart(4, "0")}`;

  const { data, error } = await supabase
    .from("vendor_invoices")
    .insert({
      vendor_org_id: vendorAuth.vendor_org_id,
      pm_user_id: input.pm_user_id || null,
      work_order_id: input.work_order_id || null,
      estimate_id: input.estimate_id || null,
      invoice_number: invNumber,
      property_name: input.property_name || null,
      unit_info: input.unit_info || null,
      notes: input.notes || null,
      due_date: input.due_date || null,
      tax_pct: input.tax_pct ?? 0,
      status: "draft",
      updated_by: user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity({
    entityType: "invoice",
    entityId: data.id,
    action: "created",
    metadata: { invoice_number: invNumber },
  });

  return { data: data as VendorInvoice };
}

/** Generate invoice from a completed work order */
export async function generateFromWorkOrder(
  workOrderId: string
): Promise<{ data?: VendorInvoice; error?: string }> {
  const vendorAuth = await requireVendorRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Get the work order
  const { data: wo } = await supabase
    .from("vendor_work_orders")
    .select("*")
    .eq("id", workOrderId)
    .single();

  if (!wo) return { error: "Work order not found" };

  // Get materials for auto-fill
  const { data: materials } = await supabase
    .from("vendor_wo_materials")
    .select("*")
    .eq("work_order_id", workOrderId);

  // Get time entries
  const { data: timeEntries } = await supabase
    .from("vendor_wo_time_entries")
    .select("*")
    .eq("work_order_id", workOrderId);

  // Generate invoice number
  const { count } = await supabase
    .from("vendor_invoices")
    .select("*", { count: "exact", head: true })
    .eq("vendor_org_id", vendorAuth.vendor_org_id);

  const invNumber = `INV-${String((count ?? 0) + 1).padStart(4, "0")}`;

  const { data: invoice, error } = await supabase
    .from("vendor_invoices")
    .insert({
      vendor_org_id: vendorAuth.vendor_org_id,
      pm_user_id: wo.pm_user_id,
      work_order_id: workOrderId,
      invoice_number: invNumber,
      property_name: wo.property_name,
      unit_info: wo.unit_number,
      status: "draft",
      updated_by: user.id,
    })
    .select()
    .single();

  if (error || !invoice) return { error: error?.message || "Failed to create invoice" };

  // Auto-fill line items from materials
  const lineItems: Array<{
    invoice_id: string;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
    item_type: string;
  }> = [];

  for (const mat of materials ?? []) {
    lineItems.push({
      invoice_id: invoice.id,
      description: mat.description,
      quantity: Number(mat.quantity) || 1,
      unit_price: Number(mat.unit_cost) || 0,
      total: Number(mat.total) || 0,
      item_type: "material",
    });
  }

  // Add labor line items from time entries
  const totalMinutes = (timeEntries ?? []).reduce(
    (sum, te) => sum + (Number(te.duration_minutes) || 0),
    0
  );
  if (totalMinutes > 0) {
    const hours = Math.round((totalMinutes / 60) * 100) / 100;
    lineItems.push({
      invoice_id: invoice.id,
      description: "Labor",
      quantity: hours,
      unit_price: 0, // Vendor fills in rate
      total: 0,
      item_type: "labor",
    });
  }

  if (lineItems.length > 0) {
    await supabase.from("vendor_invoice_items").insert(lineItems);
  }

  await logActivity({
    entityType: "invoice",
    entityId: invoice.id,
    action: "created_from_wo",
    metadata: { work_order_id: workOrderId, invoice_number: invNumber },
  });

  return { data: invoice as VendorInvoice };
}

/** Generate invoice from an approved estimate */
export async function generateFromEstimate(
  estimateId: string
): Promise<{ data?: VendorInvoice; error?: string }> {
  const vendorAuth = await requireVendorRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Get estimate
  const { data: est } = await supabase
    .from("vendor_estimates")
    .select("*")
    .eq("id", estimateId)
    .single();

  if (!est) return { error: "Estimate not found" };

  // Get sections + items
  const { data: sections } = await supabase
    .from("vendor_estimate_sections")
    .select("id, name")
    .eq("estimate_id", estimateId);

  // Generate invoice number
  const { count } = await supabase
    .from("vendor_invoices")
    .select("*", { count: "exact", head: true })
    .eq("vendor_org_id", vendorAuth.vendor_org_id);

  const invNumber = `INV-${String((count ?? 0) + 1).padStart(4, "0")}`;

  const { data: invoice, error } = await supabase
    .from("vendor_invoices")
    .insert({
      vendor_org_id: vendorAuth.vendor_org_id,
      pm_user_id: est.pm_user_id,
      work_order_id: est.work_order_id,
      estimate_id: estimateId,
      invoice_number: invNumber,
      property_name: est.property_name,
      unit_info: est.unit_info,
      tax_pct: Number(est.tax_pct) || 0,
      status: "draft",
      updated_by: user.id,
    })
    .select()
    .single();

  if (error || !invoice) return { error: error?.message || "Failed to create invoice" };

  // Auto-fill from estimate items
  const lineItems: Array<{
    invoice_id: string;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
    item_type: string;
  }> = [];

  for (const section of sections ?? []) {
    const { data: items } = await supabase
      .from("vendor_estimate_items")
      .select("*")
      .eq("section_id", section.id);

    for (const item of items ?? []) {
      lineItems.push({
        invoice_id: invoice.id,
        description: `${section.name}: ${item.description}`,
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
        total: Number(item.total) || 0,
        item_type: item.item_type === "labor" || item.item_type === "material"
          ? item.item_type
          : "other",
      });
    }
  }

  if (lineItems.length > 0) {
    await supabase.from("vendor_invoice_items").insert(lineItems);
  }

  // Recalculate totals
  await recalculateInvoiceTotals(invoice.id);

  await logActivity({
    entityType: "invoice",
    entityId: invoice.id,
    action: "created_from_estimate",
    metadata: { estimate_id: estimateId, invoice_number: invNumber },
  });

  return { data: invoice as VendorInvoice };
}

// ============================================
// Invoice Item CRUD
// ============================================

export async function createInvoiceItem(
  input: CreateInvoiceItemInput
): Promise<{ data?: VendorInvoiceItem; error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  const qty = input.quantity ?? 1;
  const price = input.unit_price ?? 0;
  const total = Math.round(qty * price * 100) / 100;

  const { data, error } = await supabase
    .from("vendor_invoice_items")
    .insert({
      invoice_id: input.invoice_id,
      description: input.description,
      quantity: qty,
      unit_price: price,
      total,
      item_type: input.item_type || "labor",
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as VendorInvoiceItem };
}

export async function updateInvoiceItem(
  itemId: string,
  updates: UpdateInvoiceItemInput
): Promise<{ error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
  if (updates.unit_price !== undefined) updateData.unit_price = updates.unit_price;
  if (updates.item_type !== undefined) updateData.item_type = updates.item_type;

  // Recalculate total
  if (updates.quantity !== undefined || updates.unit_price !== undefined) {
    const { data: current } = await supabase
      .from("vendor_invoice_items")
      .select("quantity, unit_price")
      .eq("id", itemId)
      .single();

    if (current) {
      const qty = updates.quantity ?? current.quantity;
      const price = updates.unit_price ?? current.unit_price;
      updateData.total = Math.round(qty * price * 100) / 100;
    }
  }

  const { error } = await supabase
    .from("vendor_invoice_items")
    .update(updateData)
    .eq("id", itemId);

  if (error) return { error: error.message };
  return {};
}

export async function deleteInvoiceItem(itemId: string): Promise<{ error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  const { error } = await supabase
    .from("vendor_invoice_items")
    .delete()
    .eq("id", itemId);

  if (error) return { error: error.message };
  return {};
}

// ============================================
// Recalculate totals
// ============================================

export async function recalculateInvoiceTotals(
  invoiceId: string
): Promise<{ error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: items } = await supabase
    .from("vendor_invoice_items")
    .select("total")
    .eq("invoice_id", invoiceId);

  const subtotal = Math.round(
    (items ?? []).reduce((sum, item) => sum + (Number(item.total) || 0), 0) * 100
  ) / 100;

  const { data: inv } = await supabase
    .from("vendor_invoices")
    .select("tax_pct")
    .eq("id", invoiceId)
    .single();

  const taxPct = Number(inv?.tax_pct) || 0;
  const taxAmount = Math.round(subtotal * (taxPct / 100) * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  await supabase
    .from("vendor_invoices")
    .update({
      subtotal,
      tax_amount: taxAmount,
      total,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);

  return {};
}

// ============================================
// Status transitions
// ============================================

export async function submitInvoice(
  invoiceId: string
): Promise<{ error?: string }> {
  const vendorAuth = await requireVendorRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  await recalculateInvoiceTotals(invoiceId);

  const { data: inv } = await supabase
    .from("vendor_invoices")
    .select("status, pm_user_id")
    .eq("id", invoiceId)
    .single();

  if (!inv) return { error: "Invoice not found" };
  if (!inv.pm_user_id) return { error: "No PM assigned to this invoice" };

  const callerRole = vendorOrgRoleToTransitionRole(vendorAuth.role);
  const validation = validateInvoiceTransition(
    inv.status as InvoiceStatus,
    "submitted",
    callerRole
  );
  if (!validation.valid) return { error: validation.reason };

  await supabase
    .from("vendor_invoices")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);

  // Notify PM
  await supabase.from("vendor_notifications").insert({
    user_id: inv.pm_user_id,
    type: "invoice_received",
    title: "New invoice received",
    body: "A vendor has submitted an invoice for your review",
    reference_type: "invoice",
    reference_id: invoiceId,
  });

  await logActivity({
    entityType: "invoice",
    entityId: invoiceId,
    action: "submitted",
    oldValue: inv.status,
    newValue: "submitted",
  });

  return {};
}

// ============================================
// Payment, Aging, Bulk Actions (Workiz Enhancements)
// ============================================

/** Record a partial or full payment on an invoice */
export async function recordPayment(
  invoiceId: string,
  amount: number
): Promise<{ error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };
  if (amount <= 0) return { error: "Payment amount must be positive" };

  const { data: inv } = await supabase
    .from("vendor_invoices")
    .select("amount_paid, total, vendor_org_id, status")
    .eq("id", invoiceId)
    .single();

  if (!inv) return { error: "Invoice not found" };
  if (inv.vendor_org_id !== vendor_org_id) return { error: "Not authorized" };

  const newAmountPaid = (Number(inv.amount_paid) || 0) + amount;

  // Update amount_paid — DB trigger auto-computes balance_due
  const { error } = await supabase
    .from("vendor_invoices")
    .update({
      amount_paid: newAmountPaid,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);

  if (error) return { error: error.message };

  await logActivity({
    entityType: "invoice",
    entityId: invoiceId,
    action: "payment_recorded",
    metadata: { amount, new_total_paid: newAmountPaid },
  });

  return {};
}

/** Get invoice aging summary — buckets: 0-30, 31-60, 61-90, 90+ days */
export async function getInvoiceAgingSummary(): Promise<{
  buckets: { label: string; min_days: number; max_days: number | null; count: number; total: number }[];
  total_outstanding: number;
  error?: string;
}> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  const { data: invoices, error } = await supabase
    .from("vendor_invoices")
    .select("id, submitted_at, due_date, total, balance_due")
    .eq("vendor_org_id", vendor_org_id)
    .in("status", ["submitted", "pm_approved", "processing"]);

  if (error) return { buckets: [], total_outstanding: 0, error: error.message };

  const now = new Date();
  const bucketDefs = [
    { label: "0-30 days", min_days: 0, max_days: 30 as number | null },
    { label: "31-60 days", min_days: 31, max_days: 60 as number | null },
    { label: "61-90 days", min_days: 61, max_days: 90 as number | null },
    { label: "90+ days", min_days: 91, max_days: null as number | null },
  ];

  const buckets = bucketDefs.map((b) => ({ ...b, count: 0, total: 0 }));
  let totalOutstanding = 0;

  for (const inv of invoices ?? []) {
    const refDate = inv.submitted_at ? new Date(inv.submitted_at) : now;
    const daysOld = Math.floor((now.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
    const balance = Number(inv.balance_due) || Number(inv.total) || 0;
    totalOutstanding += balance;

    for (const bucket of buckets) {
      if (bucket.max_days === null) {
        if (daysOld >= bucket.min_days) {
          bucket.count++;
          bucket.total += balance;
        }
      } else if (daysOld >= bucket.min_days && daysOld <= bucket.max_days) {
        bucket.count++;
        bucket.total += balance;
        break;
      }
    }
  }

  return { buckets, total_outstanding: totalOutstanding };
}

/** Bulk invoice actions — send or remind */
export async function bulkInvoiceAction(
  invoiceIds: string[],
  action: "send" | "remind"
): Promise<{ processed: number; error?: string }> {
  const vendorAuth = await requireVendorRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { processed: 0, error: "Not authenticated" };
  if (invoiceIds.length === 0) return { processed: 0, error: "No invoices selected" };
  if (invoiceIds.length > 50) return { processed: 0, error: "Maximum 50 invoices at a time" };

  const { data: invoices, error } = await supabase
    .from("vendor_invoices")
    .select("id, status, pm_user_id, invoice_number")
    .eq("vendor_org_id", vendorAuth.vendor_org_id)
    .in("id", invoiceIds);

  if (error) return { processed: 0, error: error.message };
  if (!invoices || invoices.length === 0) return { processed: 0, error: "No matching invoices found" };

  let processed = 0;

  if (action === "send") {
    const drafts = invoices.filter((inv) => inv.status === "draft" && inv.pm_user_id);
    for (const inv of drafts) {
      await supabase
        .from("vendor_invoices")
        .update({
          status: "submitted",
          submitted_at: new Date().toISOString(),
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", inv.id);

      await supabase.from("vendor_notifications").insert({
        user_id: inv.pm_user_id!,
        type: "invoice_received",
        title: "New invoice received",
        body: `Invoice ${inv.invoice_number || inv.id} submitted for review`,
        reference_type: "invoice",
        reference_id: inv.id,
      });

      processed++;
    }
  } else if (action === "remind") {
    const eligible = invoices.filter(
      (inv) =>
        ["submitted", "pm_approved", "processing"].includes(inv.status) &&
        inv.pm_user_id
    );
    const notifications = eligible.map((inv) => ({
      user_id: inv.pm_user_id!,
      type: "invoice_reminder",
      title: "Invoice payment reminder",
      body: `Reminder: Invoice ${inv.invoice_number || inv.id} is awaiting payment`,
      reference_type: "invoice",
      reference_id: inv.id,
    }));

    if (notifications.length > 0) {
      await supabase.from("vendor_notifications").insert(notifications);
    }
    processed = notifications.length;
  }

  await logActivity({
    entityType: "invoice",
    entityId: invoiceIds[0],
    action: `bulk_${action}`,
    metadata: { count: processed, invoice_ids: invoiceIds },
  });

  return { processed };
}
