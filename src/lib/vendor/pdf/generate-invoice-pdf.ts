"use server";

import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { requireVendorRole } from "@/lib/vendor/role-helpers";

/**
 * Generate a branded invoice PDF.
 * Returns base64-encoded PDF data URI.
 */
export async function generateInvoicePdf(
  invoiceId: string
): Promise<{ pdf: string | null; error?: string }> {
  const auth = await requireVendorRole();
  const supabase = await createClient();
  const t = await getTranslations("vendor.invoices");

  // Fetch invoice
  const { data: invoice, error: invError } = await supabase
    .from("vendor_invoices")
    .select("*")
    .eq("id", invoiceId)
    .eq("vendor_org_id", auth.vendor_org_id)
    .single();

  if (invError || !invoice) {
    return { pdf: null, error: invError?.message ?? "Invoice not found" };
  }

  // Fetch line items
  const { data: items } = await supabase
    .from("vendor_invoice_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: true });

  // Fetch vendor org for branding
  const { data: org } = await supabase
    .from("vendor_organizations")
    .select("name, phone, email, address, city, state, zip")
    .eq("id", auth.vendor_org_id)
    .single();

  // Fetch PM info (bill-to)
  let pmName: string | null = null;
  let pmEmail: string | null = null;
  if (invoice.pm_user_id) {
    const { data: pmProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", invoice.pm_user_id)
      .single();
    pmName = pmProfile?.full_name ?? null;
    pmEmail = pmProfile?.email ?? null;
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // ─── Header: company branding ───
  doc.setFontSize(20);
  doc.setTextColor(34, 139, 34); // Brand green
  doc.text(org?.name ?? "Invoice", 14, 25);

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  let headerY = 32;
  if (org?.phone) { doc.text(org.phone, 14, headerY); headerY += 5; }
  if (org?.email) { doc.text(org.email, 14, headerY); headerY += 5; }
  if (org?.address) {
    doc.text(`${org.address}, ${org.city ?? ""} ${org.state ?? ""} ${org.zip ?? ""}`, 14, headerY);
  }

  // ─── Invoice badge (right side) ───
  const rightX = pageWidth - 14;
  doc.setFontSize(22);
  doc.setTextColor(34, 139, 34);
  doc.text("INVOICE", rightX, 25, { align: "right" });
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  if (invoice.invoice_number) {
    doc.text(`#${invoice.invoice_number}`, rightX, 33, { align: "right" });
  }
  doc.text(new Date(invoice.created_at).toLocaleDateString(), rightX, 39, { align: "right" });
  if (invoice.due_date) {
    doc.text(`${t("dueDate")}: ${new Date(invoice.due_date).toLocaleDateString()}`, rightX, 45, { align: "right" });
  }
  const statusLabel = t(`status.${invoice.status}`);
  doc.setFontSize(10);
  doc.setTextColor(invoice.status === "paid" ? 34 : invoice.status === "disputed" ? 200 : 50, invoice.status === "paid" ? 139 : invoice.status === "disputed" ? 50 : 50, invoice.status === "paid" ? 34 : invoice.status === "disputed" ? 50 : 50);
  doc.text(statusLabel.toUpperCase(), rightX, 52, { align: "right" });

  // ─── Divider ───
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 58, pageWidth - 14, 58);

  // ─── Bill To + Property ───
  let y = 66;
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text("BILL TO", 14, y);
  doc.text("PROPERTY", pageWidth / 2, y);
  y += 6;

  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  if (pmName) { doc.text(pmName, 14, y); }
  if (invoice.property_name) { doc.text(invoice.property_name, pageWidth / 2, y); }
  y += 5;

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  if (pmEmail) { doc.text(pmEmail, 14, y); }
  if (invoice.unit_info) { doc.text(invoice.unit_info, pageWidth / 2, y); }
  y += 10;

  // ─── Line Items Table ───
  const lineItems = items ?? [];
  if (lineItems.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc as any).autoTable({
      startY: y,
      head: [[t("description"), t("type"), t("qty"), t("price"), t("lineTotal")]],
      body: lineItems.map((item: { description: string; item_type: string; quantity: number; unit_price: number; total: number }) => [
        item.description,
        t(`itemType.${item.item_type}`),
        item.quantity,
        `$${Number(item.unit_price).toFixed(2)}`,
        `$${Number(item.total).toFixed(2)}`,
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [34, 139, 34], textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: "auto" },
        3: { halign: "right" as const },
        4: { halign: "right" as const },
      },
      margin: { left: 14, right: 14 },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ─── Financial Summary ───
  const summaryX = pageWidth - 80;
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);

  doc.text(t("subtotal"), summaryX, y);
  doc.text(`$${Number(invoice.subtotal).toFixed(2)}`, pageWidth - 14, y, { align: "right" });
  y += 6;

  if (Number(invoice.tax_pct) > 0) {
    doc.text(`${t("tax")} (${invoice.tax_pct}%)`, summaryX, y);
    doc.text(`$${Number(invoice.tax_amount).toFixed(2)}`, pageWidth - 14, y, { align: "right" });
    y += 6;
  }

  if (invoice.discount_amount && Number(invoice.discount_amount) > 0) {
    const discLabel = invoice.discount_type === "percentage"
      ? `${t("discount.percentage")} (${invoice.discount_amount}%)`
      : t("discount.flat");
    doc.text(discLabel, summaryX, y);
    doc.text(`-$${Number(invoice.discount_amount).toFixed(2)}`, pageWidth - 14, y, { align: "right" });
    y += 6;
  }

  // Total
  doc.setDrawColor(200, 200, 200);
  doc.line(summaryX, y, pageWidth - 14, y);
  y += 6;
  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);
  doc.text(t("total"), summaryX, y);
  doc.text(`$${Number(invoice.total).toFixed(2)}`, pageWidth - 14, y, { align: "right" });

  // Balance due (if partial payment)
  if (invoice.amount_paid && Number(invoice.amount_paid) > 0) {
    y += 7;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Amount Paid", summaryX, y);
    doc.text(`$${Number(invoice.amount_paid).toFixed(2)}`, pageWidth - 14, y, { align: "right" });
    y += 6;
    doc.setFontSize(11);
    doc.setTextColor(200, 50, 50);
    doc.text(t("payment.balanceDue"), summaryX, y);
    doc.text(`$${Number(invoice.balance_due ?? 0).toFixed(2)}`, pageWidth - 14, y, { align: "right" });
  }

  // ─── Notes ───
  if (invoice.notes) {
    y += 15;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(t("notes"), 14, y);
    y += 5;
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    const splitNotes = doc.splitTextToSize(invoice.notes, pageWidth - 28);
    doc.text(splitNotes, 14, y);
  }

  // ─── Payment link ───
  if (invoice.payment_url && invoice.status !== "paid") {
    y += 12;
    doc.setFontSize(9);
    doc.setTextColor(34, 139, 34);
    doc.text("Pay Online:", 14, y);
    doc.setTextColor(50, 100, 200);
    doc.textWithLink(invoice.payment_url, 42, y, { url: invoice.payment_url });
  }

  // ─── Paid stamp ───
  if (invoice.status === "paid") {
    doc.setFontSize(48);
    doc.setTextColor(34, 139, 34);
    doc.saveGraphicsState();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc as any).setGState(new (doc as any).GState({ opacity: 0.15 }));
    doc.text("PAID", pageWidth / 2, 140, { align: "center", angle: 30 });
    doc.restoreGraphicsState();
  }

  const pdfOutput = doc.output("datauristring");
  return { pdf: pdfOutput };
}
