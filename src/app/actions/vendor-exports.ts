"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole } from "@/lib/vendor/role-helpers";

const ROW_CAP = 10000;

/** Escape a value for CSV */
function escapeCSV(val: unknown): string {
  const str = val == null ? "" : String(val);
  return str.includes(",") || str.includes('"') || str.includes("\n")
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

/** Convert headers + rows to CSV string */
function toCsv(headers: string[], keys: string[], rows: Record<string, unknown>[]): string {
  const lines = [headers.map(escapeCSV).join(",")];
  for (const row of rows) {
    lines.push(keys.map((k) => escapeCSV(row[k])).join(","));
  }
  return lines.join("\n");
}

// ============================================
// Jobs Export
// ============================================

export async function exportJobsCsv(filters?: {
  status?: string[];
  trade?: string;
  job_type?: string;
  date_from?: string;
  date_to?: string;
}): Promise<{ data?: string; error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  let query = supabase
    .from("vendor_work_orders")
    .select("id, property_name, property_address, description, trade, priority, status, job_type, scheduled_date, completed_at, created_at")
    .eq("vendor_org_id", vendor_org_id)
    .order("created_at", { ascending: false })
    .limit(ROW_CAP);

  if (filters?.status && filters.status.length > 0) {
    query = query.in("status", filters.status);
  }
  if (filters?.trade) {
    query = query.eq("trade", filters.trade);
  }
  if (filters?.job_type) {
    query = query.eq("job_type", filters.job_type);
  }
  if (filters?.date_from) {
    query = query.gte("created_at", filters.date_from);
  }
  if (filters?.date_to) {
    query = query.lte("created_at", filters.date_to);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };

  const headers = ["ID", "Property", "Address", "Description", "Trade", "Priority", "Status", "Job Type", "Scheduled Date", "Completed At", "Created At"];
  const keys = ["id", "property_name", "property_address", "description", "trade", "priority", "status", "job_type", "scheduled_date", "completed_at", "created_at"];

  return { data: toCsv(headers, keys, (data ?? []) as Record<string, unknown>[]) };
}

// ============================================
// Estimates Export
// ============================================

export async function exportEstimatesCsv(filters?: {
  status?: string[];
  date_from?: string;
  date_to?: string;
}): Promise<{ data?: string; error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  let query = supabase
    .from("vendor_estimates")
    .select("id, estimate_number, property_name, title, status, subtotal, total, created_at, sent_at, approved_at")
    .eq("vendor_org_id", vendor_org_id)
    .order("created_at", { ascending: false })
    .limit(ROW_CAP);

  if (filters?.status && filters.status.length > 0) {
    query = query.in("status", filters.status);
  }
  if (filters?.date_from) {
    query = query.gte("created_at", filters.date_from);
  }
  if (filters?.date_to) {
    query = query.lte("created_at", filters.date_to);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };

  const headers = ["ID", "Estimate #", "Property", "Title", "Status", "Subtotal", "Total", "Created At", "Sent At", "Approved At"];
  const keys = ["id", "estimate_number", "property_name", "title", "status", "subtotal", "total", "created_at", "sent_at", "approved_at"];

  return { data: toCsv(headers, keys, (data ?? []) as Record<string, unknown>[]) };
}

// ============================================
// Invoices Export
// ============================================

export async function exportInvoicesCsv(filters?: {
  status?: string[];
  date_from?: string;
  date_to?: string;
}): Promise<{ data?: string; error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  let query = supabase
    .from("vendor_invoices")
    .select("id, invoice_number, property_name, status, subtotal, tax_amount, total, balance_due, submitted_at, paid_at, due_date, created_at")
    .eq("vendor_org_id", vendor_org_id)
    .order("created_at", { ascending: false })
    .limit(ROW_CAP);

  if (filters?.status && filters.status.length > 0) {
    query = query.in("status", filters.status);
  }
  if (filters?.date_from) {
    query = query.gte("created_at", filters.date_from);
  }
  if (filters?.date_to) {
    query = query.lte("created_at", filters.date_to);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };

  const headers = ["ID", "Invoice #", "Property", "Status", "Subtotal", "Tax", "Total", "Balance Due", "Submitted", "Paid", "Due Date", "Created"];
  const keys = ["id", "invoice_number", "property_name", "status", "subtotal", "tax_amount", "total", "balance_due", "submitted_at", "paid_at", "due_date", "created_at"];

  return { data: toCsv(headers, keys, (data ?? []) as Record<string, unknown>[]) };
}

// ============================================
// Clients Export
// ============================================

export async function exportClientsCsv(): Promise<{ data?: string; error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_clients")
    .select("id, name, contact_name, phone, email, address, city, state, zip, client_type, is_active, created_at")
    .eq("vendor_org_id", vendor_org_id)
    .order("name", { ascending: true })
    .limit(ROW_CAP);

  if (error) return { error: error.message };

  const headers = ["ID", "Name", "Contact", "Phone", "Email", "Address", "City", "State", "Zip", "Type", "Active", "Created"];
  const keys = ["id", "name", "contact_name", "phone", "email", "address", "city", "state", "zip", "client_type", "is_active", "created_at"];

  return { data: toCsv(headers, keys, (data ?? []) as Record<string, unknown>[]) };
}
