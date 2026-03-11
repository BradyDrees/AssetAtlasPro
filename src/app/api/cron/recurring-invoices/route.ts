import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { advanceNextDue } from "@/lib/vendor/recurring-invoice-types";

/**
 * Recurring Invoices Cron — runs daily at 8 AM
 *
 * Queries active recurring_invoice_templates where next_due <= today,
 * generates an invoice for each, advances next_due.
 */
export async function GET(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const today = new Date().toISOString().split("T")[0];
  const results = { generated: 0, errors: [] as string[] };

  try {
    // Find all active templates where next_due <= today
    const { data: templates, error: fetchErr } = await supabase
      .from("recurring_invoice_templates")
      .select("*")
      .eq("status", "active")
      .lte("next_due", today);

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    for (const template of templates ?? []) {
      try {
        // Get org settings for invoice numbering
        const { data: org } = await supabase
          .from("vendor_organizations")
          .select("settings")
          .eq("id", template.vendor_org_id)
          .single();

        const settings = (org?.settings ?? {}) as Record<string, unknown>;
        const numbering = (settings.numbering ?? {}) as Record<string, unknown>;
        const prefix = (numbering.invoice_prefix as string) ?? "INV";
        const nextNum = (numbering.next_invoice as number) ?? 1;
        const invoiceNumber = `${prefix}-${String(nextNum).padStart(4, "0")}`;

        // Create the invoice
        const { data: invoice, error: createErr } = await supabase
          .from("vendor_invoices")
          .insert({
            vendor_org_id: template.vendor_org_id,
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
          results.errors.push(`Template ${template.id}: ${createErr?.message ?? "Failed to create invoice"}`);
          continue;
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
          .eq("id", template.id);

        // Increment the next invoice number in org settings
        const updatedNumbering = { ...numbering, next_invoice: nextNum + 1 };
        const updatedSettings = { ...settings, numbering: updatedNumbering };
        await supabase
          .from("vendor_organizations")
          .update({ settings: updatedSettings })
          .eq("id", template.vendor_org_id);

        // Notify vendor owner(s) about auto-generated invoice
        const { data: owners } = await supabase
          .from("vendor_users")
          .select("user_id")
          .eq("vendor_org_id", template.vendor_org_id)
          .in("role", ["owner", "admin"]);

        for (const owner of owners ?? []) {
          await supabase.from("vendor_notifications").insert({
            user_id: owner.user_id,
            type: "recurring_invoice_generated",
            title: `Recurring invoice generated: ${invoiceNumber}`,
            body: `${template.title} — $${Number(template.total).toLocaleString()}`,
            reference_type: "invoice",
            reference_id: invoice.id,
          });
        }

        results.generated++;
      } catch (err) {
        results.errors.push(`Template ${template.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }
  } catch (err) {
    results.errors.push(`Fatal: ${err instanceof Error ? err.message : "Unknown error"}`);
  }

  console.log("[recurring-invoices]", results);

  return NextResponse.json({
    ok: true,
    ...results,
  });
}
