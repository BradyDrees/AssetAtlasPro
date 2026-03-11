"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole, logActivity } from "@/lib/vendor/role-helpers";
import type {
  RecurringInvoiceTemplate,
  CreateRecurringTemplateInput,
  UpdateRecurringTemplateInput,
  RecurringTemplateStatus,
} from "@/lib/vendor/recurring-invoice-types";
import { advanceNextDue } from "@/lib/vendor/recurring-invoice-types";

// ============================================
// Queries
// ============================================

/** List recurring invoice templates for the current vendor org */
export async function getRecurringTemplates(filters?: {
  status?: RecurringTemplateStatus;
}): Promise<{ data: RecurringInvoiceTemplate[]; error?: string }> {
  const vendorAuth = await requireVendorRole();
  const supabase = await createClient();

  let query = supabase
    .from("recurring_invoice_templates")
    .select("*")
    .eq("vendor_org_id", vendorAuth.vendor_org_id)
    .order("next_due", { ascending: true });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch recurring templates:", error);
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as RecurringInvoiceTemplate[] };
}

/** Get a single recurring template by ID */
export async function getRecurringTemplateDetail(
  templateId: string
): Promise<{ data: RecurringInvoiceTemplate | null; error?: string }> {
  const vendorAuth = await requireVendorRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recurring_invoice_templates")
    .select("*")
    .eq("id", templateId)
    .eq("vendor_org_id", vendorAuth.vendor_org_id)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as RecurringInvoiceTemplate };
}

// ============================================
// Create / Update
// ============================================

/** Create a new recurring invoice template */
export async function createRecurringTemplate(
  input: CreateRecurringTemplateInput
): Promise<{ data?: { id: string }; error?: string }> {
  const vendorAuth = await requireVendorRole();

  if (vendorAuth.role === "tech") {
    return { error: "Not authorized to create recurring invoices" };
  }

  const supabase = await createClient();

  // Calculate totals from items
  const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxPct = input.tax_pct ?? 0;
  const taxAmount = Math.round(subtotal * (taxPct / 100) * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  // Ensure each item has a calculated total
  const itemsWithTotals = input.items.map((item) => ({
    ...item,
    total: Math.round(item.quantity * item.unit_price * 100) / 100,
  }));

  const { data, error } = await supabase
    .from("recurring_invoice_templates")
    .insert({
      vendor_org_id: vendorAuth.vendor_org_id,
      pm_user_id: input.pm_user_id || null,
      title: input.title,
      property_name: input.property_name || null,
      unit_info: input.unit_info || null,
      items: itemsWithTotals,
      subtotal,
      tax_pct: taxPct,
      tax_amount: taxAmount,
      total,
      frequency: input.frequency,
      next_due: input.next_due,
      notes: input.notes || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create recurring template:", error);
    return { error: error.message };
  }

  await logActivity({
    entityType: "invoice",
    entityId: data.id,
    action: "recurring_template_created",
    metadata: { title: input.title, frequency: input.frequency },
  });

  return { data: { id: data.id } };
}

/** Update an existing recurring invoice template */
export async function updateRecurringTemplate(
  templateId: string,
  updates: UpdateRecurringTemplateInput
): Promise<{ error?: string }> {
  const vendorAuth = await requireVendorRole();

  if (vendorAuth.role === "tech") {
    return { error: "Not authorized" };
  }

  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.pm_user_id !== undefined) updateData.pm_user_id = updates.pm_user_id || null;
  if (updates.property_name !== undefined) updateData.property_name = updates.property_name || null;
  if (updates.unit_info !== undefined) updateData.unit_info = updates.unit_info || null;
  if (updates.frequency !== undefined) updateData.frequency = updates.frequency;
  if (updates.next_due !== undefined) updateData.next_due = updates.next_due;
  if (updates.notes !== undefined) updateData.notes = updates.notes || null;

  // Recalculate totals if items or tax_pct changed
  if (updates.items !== undefined || updates.tax_pct !== undefined) {
    // Need current data for fallback
    const { data: current } = await supabase
      .from("recurring_invoice_templates")
      .select("items, tax_pct")
      .eq("id", templateId)
      .single();

    const items = updates.items ?? (current?.items as typeof updates.items) ?? [];
    const taxPct = updates.tax_pct ?? current?.tax_pct ?? 0;

    const itemsWithTotals = items.map((item) => ({
      ...item,
      total: Math.round(item.quantity * item.unit_price * 100) / 100,
    }));

    const subtotal = itemsWithTotals.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = Math.round(subtotal * (taxPct / 100) * 100) / 100;

    updateData.items = itemsWithTotals;
    updateData.tax_pct = taxPct;
    updateData.subtotal = subtotal;
    updateData.tax_amount = taxAmount;
    updateData.total = Math.round((subtotal + taxAmount) * 100) / 100;
  }

  const { error } = await supabase
    .from("recurring_invoice_templates")
    .update(updateData)
    .eq("id", templateId)
    .eq("vendor_org_id", vendorAuth.vendor_org_id);

  if (error) {
    return { error: error.message };
  }

  return {};
}

// ============================================
// Status Changes
// ============================================

/** Pause a recurring template */
export async function pauseRecurringTemplate(templateId: string): Promise<{ error?: string }> {
  return changeTemplateStatus(templateId, "paused");
}

/** Resume a recurring template */
export async function resumeRecurringTemplate(templateId: string): Promise<{ error?: string }> {
  return changeTemplateStatus(templateId, "active");
}

/** Cancel a recurring template */
export async function cancelRecurringTemplate(templateId: string): Promise<{ error?: string }> {
  return changeTemplateStatus(templateId, "cancelled");
}

async function changeTemplateStatus(
  templateId: string,
  newStatus: RecurringTemplateStatus
): Promise<{ error?: string }> {
  const vendorAuth = await requireVendorRole();

  if (vendorAuth.role === "tech") {
    return { error: "Not authorized" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("recurring_invoice_templates")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", templateId)
    .eq("vendor_org_id", vendorAuth.vendor_org_id);

  if (error) {
    return { error: error.message };
  }

  await logActivity({
    entityType: "invoice",
    entityId: templateId,
    action: `recurring_template_${newStatus}`,
  });

  return {};
}

// ============================================
// Generate Invoice from Template
// ============================================

/** Generate a real invoice from a recurring template and advance next_due */
export async function generateInvoiceFromTemplate(
  templateId: string
): Promise<{ data?: { invoiceId: string }; error?: string }> {
  const vendorAuth = await requireVendorRole();
  const supabase = await createClient();

  // Fetch the template
  const { data: template, error: fetchErr } = await supabase
    .from("recurring_invoice_templates")
    .select("*")
    .eq("id", templateId)
    .eq("vendor_org_id", vendorAuth.vendor_org_id)
    .single();

  if (fetchErr || !template) {
    return { error: "Template not found" };
  }

  // Get invoice prefix from org settings
  const { data: org } = await supabase
    .from("vendor_organizations")
    .select("settings")
    .eq("id", vendorAuth.vendor_org_id)
    .single();

  const settings = (org?.settings ?? {}) as Record<string, unknown>;
  const numbering = (settings.numbering ?? {}) as Record<string, unknown>;
  const prefix = (numbering.invoice_prefix as string) ?? "INV";

  // Atomic increment — no race condition
  const { data: seqResult } = await supabase
    .rpc("increment_invoice_seq", { org_id: vendorAuth.vendor_org_id });

  const nextNum = seqResult?.[0]?.new_seq ?? 1;
  const invoiceNumber = `${prefix}-${String(nextNum).padStart(4, "0")}`;

  // Create the invoice
  const { data: invoice, error: createErr } = await supabase
    .from("vendor_invoices")
    .insert({
      vendor_org_id: vendorAuth.vendor_org_id,
      pm_user_id: template.pm_user_id,
      invoice_number: invoiceNumber,
      property_name: template.property_name,
      unit_info: template.unit_info,
      subtotal: template.subtotal,
      tax_pct: template.tax_pct,
      tax_amount: template.tax_amount,
      total: template.total,
      status: "draft",
      due_date: template.next_due,
      notes: template.notes,
    })
    .select("id")
    .single();

  if (createErr || !invoice) {
    return { error: createErr?.message ?? "Failed to create invoice" };
  }

  // Create invoice items
  const items = (template.items as Array<{ description: string; quantity: number; unit_price: number; total: number; item_type: string }>) ?? [];
  if (items.length > 0) {
    const itemRows = items.map((item) => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.total,
      item_type: item.item_type || "other",
    }));

    await supabase.from("vendor_invoice_items").insert(itemRows);
  }

  // Advance next_due on the template
  const newNextDue = advanceNextDue(template.next_due, template.frequency);
  await supabase
    .from("recurring_invoice_templates")
    .update({
      next_due: newNextDue,
      last_generated: template.next_due,
      updated_at: new Date().toISOString(),
    })
    .eq("id", templateId);

  await logActivity({
    entityType: "invoice",
    entityId: invoice.id,
    action: "generated_from_recurring",
    metadata: { templateId, invoiceNumber },
  });

  return { data: { invoiceId: invoice.id } };
}
