"use server";

import { createServiceClient } from "@/lib/supabase/server";

export interface PublicInvoiceData {
  id: string;
  invoice_number: string | null;
  total: number;
  subtotal: number;
  tax_amount: number;
  tax_pct: number;
  status: string;
  created_at: string;
  due_date: string | null;
  vendor_name: string;
  vendor_logo: string | null;
  property_name: string | null;
  items: Array<{
    description: string;
    item_type: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
}

/**
 * Fetch invoice by payment token (public, no auth required).
 * Uses service-role client. Exposes only safe fields.
 */
export async function getInvoiceByToken(
  token: string
): Promise<{ data: PublicInvoiceData | null; error?: string }> {
  try {
    const supabase = createServiceClient();

    const { data: invoice, error } = await supabase
      .from("vendor_invoices")
      .select(
        "id, invoice_number, total, subtotal, tax_amount, tax_pct, status, created_at, due_date, vendor_org_id, property_name"
      )
      .eq("payment_token", token)
      .single();

    if (error || !invoice) {
      return { data: null, error: "Invoice not found" };
    }

    // Don't show paid/voided invoices
    if (["paid", "voided"].includes(invoice.status)) {
      return { data: null, error: "already_paid" };
    }

    // Fetch vendor org info
    const { data: org } = await supabase
      .from("vendor_organizations")
      .select("name, logo_url")
      .eq("id", invoice.vendor_org_id)
      .single();

    // Fetch line items
    const { data: items } = await supabase
      .from("vendor_invoice_items")
      .select("description, item_type, quantity, unit_price, total")
      .eq("invoice_id", invoice.id)
      .order("created_at", { ascending: true });

    return {
      data: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        total: Number(invoice.total),
        subtotal: Number(invoice.subtotal),
        tax_amount: Number(invoice.tax_amount),
        tax_pct: Number(invoice.tax_pct),
        status: invoice.status,
        created_at: invoice.created_at,
        due_date: invoice.due_date,
        vendor_name: org?.name ?? "Vendor",
        vendor_logo: org?.logo_url ?? null,
        property_name: invoice.property_name,
        items: (items ?? []).map((item) => ({
          description: item.description,
          item_type: item.item_type,
          quantity: item.quantity,
          unit_price: Number(item.unit_price),
          total: Number(item.total),
        })),
      },
    };
  } catch {
    return { data: null, error: "Failed to fetch invoice" };
  }
}

/**
 * Create a Stripe checkout session for a public invoice payment.
 * Uses the payment_token to look up the invoice.
 */
export async function createPublicPaymentSession(
  token: string
): Promise<{ url: string | null; error?: string }> {
  try {
    const supabase = createServiceClient();

    // Fetch invoice by token
    const { data: invoice } = await supabase
      .from("vendor_invoices")
      .select("id, total, status, payment_token, invoice_number, vendor_org_id")
      .eq("payment_token", token)
      .single();

    if (!invoice) {
      return { url: null, error: "Invoice not found" };
    }

    if (["paid", "voided"].includes(invoice.status)) {
      return { url: null, error: "Invoice already paid" };
    }

    if (invoice.status === "payment_pending") {
      return { url: null, error: "Payment already in progress" };
    }

    // Import and use invoice-service for Stripe session
    const { processInvoicePayment } = await import("@/lib/services/invoice-service");
    const result = await processInvoicePayment(invoice.id);

    if (result.error) {
      return { url: null, error: result.error };
    }

    return { url: result.stripeSessionUrl ?? null };
  } catch (err) {
    return {
      url: null,
      error: err instanceof Error ? err.message : "Payment failed",
    };
  }
}

/**
 * Verify payment status for the success page.
 * Re-fetches from DB (never trusts query params).
 */
export async function verifyPaymentStatus(
  token: string
): Promise<{ paid: boolean; invoiceNumber: string | null; total: number }> {
  try {
    const supabase = createServiceClient();

    const { data } = await supabase
      .from("vendor_invoices")
      .select("status, invoice_number, total")
      .eq("payment_token", token)
      .single();

    return {
      paid: data?.status === "paid",
      invoiceNumber: data?.invoice_number ?? null,
      total: Number(data?.total ?? 0),
    };
  } catch {
    return { paid: false, invoiceNumber: null, total: 0 };
  }
}
