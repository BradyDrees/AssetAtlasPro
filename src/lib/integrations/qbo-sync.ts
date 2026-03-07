import "server-only";

import { qboApiCall } from "./qbo-client";
import type { VendorIntegration, QboLineItem } from "./qbo-types";

// ============================================
// QuickBooks Online — Sync Functions
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

/** Helper to create a token updater for a given integration */
function makeTokenUpdater(supabase: SupabaseClient, integrationId: string) {
  return async (tokens: { access_token: string; refresh_token: string; expires_at: string }) => {
    await supabase
      .from("vendor_integrations")
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokens.expires_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", integrationId);
  };
}

/** Log a sync attempt */
async function logSync(
  supabase: SupabaseClient,
  integrationId: string,
  opts: {
    direction: "push" | "pull";
    entity_type: string;
    entity_id: string;
    external_id?: string | null;
    status: "success" | "error" | "skipped";
    error_message?: string | null;
  }
) {
  await supabase.from("vendor_integration_sync_log").insert({
    integration_id: integrationId,
    ...opts,
  });
}

/**
 * Sync a vendor invoice to QuickBooks as an Invoice entity.
 */
export async function syncInvoiceToQbo(
  supabase: SupabaseClient,
  integration: VendorIntegration,
  invoice: {
    id: string;
    invoice_number: string | null;
    property_name: string | null;
    total: number;
    tax_amount: number;
    items: { description: string; quantity: number; unit_price: number; total: number }[];
  }
): Promise<{ qboId?: string; error?: string }> {
  // Check if already synced
  const { data: existing } = await supabase
    .from("vendor_integration_sync_log")
    .select("external_id")
    .eq("integration_id", integration.id)
    .eq("entity_type", "invoice")
    .eq("entity_id", invoice.id)
    .eq("status", "success")
    .limit(1)
    .maybeSingle();

  if (existing?.external_id) {
    return { qboId: existing.external_id }; // Already synced
  }

  const updateTokens = makeTokenUpdater(supabase, integration.id);

  // Build QBO invoice object
  const lineItems: QboLineItem[] = invoice.items.map((item) => ({
    Amount: item.total,
    Description: item.description,
    DetailType: "SalesItemLineDetail" as const,
    SalesItemLineDetail: {
      Qty: item.quantity,
      UnitPrice: item.unit_price,
    },
  }));

  const qboInvoice = {
    Line: lineItems,
    DocNumber: invoice.invoice_number ?? undefined,
    CustomerMemo: { value: invoice.property_name ?? "" },
  };

  const result = await qboApiCall(
    integration,
    "invoice",
    { method: "POST", body: qboInvoice },
    updateTokens
  );

  if (result.error) {
    await logSync(supabase, integration.id, {
      direction: "push",
      entity_type: "invoice",
      entity_id: invoice.id,
      status: "error",
      error_message: result.error,
    });
    return { error: result.error };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qboId = (result.data as any)?.Invoice?.Id ?? null;

  await logSync(supabase, integration.id, {
    direction: "push",
    entity_type: "invoice",
    entity_id: invoice.id,
    external_id: qboId,
    status: "success",
  });

  return { qboId };
}

/**
 * Sync a vendor expense to QuickBooks as a Purchase entity.
 */
export async function syncExpenseToQbo(
  supabase: SupabaseClient,
  integration: VendorIntegration,
  expense: {
    id: string;
    description: string;
    amount: number;
    category: string;
    date: string;
  }
): Promise<{ qboId?: string; error?: string }> {
  // Check if already synced
  const { data: existing } = await supabase
    .from("vendor_integration_sync_log")
    .select("external_id")
    .eq("integration_id", integration.id)
    .eq("entity_type", "expense")
    .eq("entity_id", expense.id)
    .eq("status", "success")
    .limit(1)
    .maybeSingle();

  if (existing?.external_id) {
    return { qboId: existing.external_id };
  }

  const updateTokens = makeTokenUpdater(supabase, integration.id);

  const qboPurchase = {
    PaymentType: "Cash",
    TotalAmt: expense.amount,
    TxnDate: expense.date,
    Line: [
      {
        Amount: expense.amount,
        Description: expense.description,
        DetailType: "AccountBasedExpenseLineDetail",
        AccountBasedExpenseLineDetail: {
          AccountRef: { value: "1" }, // Default expense account — user can map later
        },
      },
    ],
  };

  const result = await qboApiCall(
    integration,
    "purchase",
    { method: "POST", body: qboPurchase },
    updateTokens
  );

  if (result.error) {
    await logSync(supabase, integration.id, {
      direction: "push",
      entity_type: "expense",
      entity_id: expense.id,
      status: "error",
      error_message: result.error,
    });
    return { error: result.error };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qboId = (result.data as any)?.Purchase?.Id ?? null;

  await logSync(supabase, integration.id, {
    direction: "push",
    entity_type: "expense",
    entity_id: expense.id,
    external_id: qboId,
    status: "success",
  });

  return { qboId };
}

/**
 * Sync a payment to QBO as a Payment entity linked to an invoice.
 */
export async function syncPaymentToQbo(
  supabase: SupabaseClient,
  integration: VendorIntegration,
  payment: {
    invoiceId: string;
    amount: number;
    date: string;
  }
): Promise<{ qboId?: string; error?: string }> {
  const updateTokens = makeTokenUpdater(supabase, integration.id);

  // Find the QBO invoice ID from sync log
  const { data: invoiceSync } = await supabase
    .from("vendor_integration_sync_log")
    .select("external_id")
    .eq("integration_id", integration.id)
    .eq("entity_type", "invoice")
    .eq("entity_id", payment.invoiceId)
    .eq("status", "success")
    .limit(1)
    .maybeSingle();

  if (!invoiceSync?.external_id) {
    return { error: "Invoice not synced to QBO yet" };
  }

  const qboPayment = {
    TotalAmt: payment.amount,
    TxnDate: payment.date,
    Line: [
      {
        Amount: payment.amount,
        LinkedTxn: [{ TxnId: invoiceSync.external_id, TxnType: "Invoice" }],
      },
    ],
  };

  const result = await qboApiCall(
    integration,
    "payment",
    { method: "POST", body: qboPayment },
    updateTokens
  );

  if (result.error) {
    await logSync(supabase, integration.id, {
      direction: "push",
      entity_type: "payment",
      entity_id: payment.invoiceId,
      status: "error",
      error_message: result.error,
    });
    return { error: result.error };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qboId = (result.data as any)?.Payment?.Id ?? null;

  await logSync(supabase, integration.id, {
    direction: "push",
    entity_type: "payment",
    entity_id: payment.invoiceId,
    external_id: qboId,
    status: "success",
  });

  return { qboId };
}

/**
 * Full sync — push all unsynced invoices + expenses to QBO.
 * Used by nightly cron and manual trigger.
 */
export async function fullSync(
  supabase: SupabaseClient,
  integration: VendorIntegration
): Promise<{ invoices: number; expenses: number; errors: number }> {
  let invoiceCount = 0;
  let expenseCount = 0;
  let errorCount = 0;

  // 1. Sync all submitted+ invoices that haven't been synced
  const { data: invoices } = await supabase
    .from("vendor_invoices")
    .select("id, invoice_number, property_name, total, tax_amount")
    .eq("vendor_org_id", integration.vendor_org_id)
    .in("status", ["submitted", "pm_approved", "processing", "paid"]);

  for (const inv of invoices ?? []) {
    // Fetch items
    const { data: items } = await supabase
      .from("vendor_invoice_items")
      .select("description, quantity, unit_price, total")
      .eq("invoice_id", inv.id);

    const result = await syncInvoiceToQbo(supabase, integration, {
      ...inv,
      items: items ?? [],
    });

    if (result.error) errorCount++;
    else invoiceCount++;
  }

  // 2. Sync all expenses that haven't been synced
  const { data: expenses } = await supabase
    .from("vendor_expenses")
    .select("id, description, amount, category, date")
    .eq("vendor_org_id", integration.vendor_org_id);

  for (const exp of expenses ?? []) {
    const result = await syncExpenseToQbo(supabase, integration, exp);
    if (result.error) errorCount++;
    else expenseCount++;
  }

  // Update last_sync_at
  await supabase
    .from("vendor_integrations")
    .update({
      last_sync_at: new Date().toISOString(),
      sync_error: errorCount > 0 ? `${errorCount} sync errors` : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", integration.id);

  return { invoices: invoiceCount, expenses: expenseCount, errors: errorCount };
}
