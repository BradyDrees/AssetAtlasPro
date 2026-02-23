"use server";

import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { requireVendorRole } from "@/lib/vendor/role-helpers";

interface EstimateForPdf {
  id: string;
  title: string | null;
  estimate_number: string | null;
  property_name: string | null;
  property_address: string | null;
  unit_info: string | null;
  description: string | null;
  subtotal: number;
  markup_pct: number;
  markup_amount: number;
  tax_pct: number;
  tax_amount: number;
  total: number;
  terms: string | null;
  valid_until: string | null;
  created_at: string;
}

interface SectionForPdf {
  name: string;
  tier: string | null;
  items: Array<{
    description: string;
    item_type: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total: number;
  }>;
  subtotal: number;
}

/**
 * Generate a branded estimate PDF.
 * Returns base64-encoded PDF data.
 */
export async function generateEstimatePdf(
  estimateId: string
): Promise<{ pdf: string | null; error?: string }> {
  const auth = await requireVendorRole();
  const supabase = await createClient();
  const t = await getTranslations("vendor.estimates");

  // Fetch estimate
  const { data: estimate, error: estError } = await supabase
    .from("vendor_estimates")
    .select("*")
    .eq("id", estimateId)
    .single();

  if (estError || !estimate) {
    return { pdf: null, error: estError?.message ?? "Estimate not found" };
  }

  // Fetch sections + items
  const { data: sections } = await supabase
    .from("vendor_estimate_sections")
    .select("*, items:vendor_estimate_items(*)")
    .eq("estimate_id", estimateId)
    .order("sort_order", { ascending: true });

  // Fetch vendor org for branding
  const { data: org } = await supabase
    .from("vendor_organizations")
    .select("name, phone, email, address, city, state, zip")
    .eq("id", auth.vendor_org_id)
    .single();

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(20);
  doc.setTextColor(34, 139, 34); // Brand green
  doc.text(org?.name ?? "Estimate", 14, 25);

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  if (org?.phone) doc.text(org.phone, 14, 32);
  if (org?.email) doc.text(org.email, 14, 37);
  if (org?.address) {
    doc.text(`${org.address}, ${org.city ?? ""} ${org.state ?? ""} ${org.zip ?? ""}`, 14, 42);
  }

  // Estimate info (right side)
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  const rightX = pageWidth - 14;
  doc.text(t("estimateDetails"), rightX, 25, { align: "right" });
  doc.setFontSize(9);
  if (estimate.estimate_number) {
    doc.text(`#${estimate.estimate_number}`, rightX, 32, { align: "right" });
  }
  doc.text(new Date(estimate.created_at).toLocaleDateString(), rightX, 37, { align: "right" });
  if (estimate.valid_until) {
    doc.text(`${t("validUntil")}: ${estimate.valid_until}`, rightX, 42, { align: "right" });
  }

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 48, pageWidth - 14, 48);

  // Property info
  let y = 55;
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  if (estimate.title) {
    doc.text(estimate.title, 14, y);
    y += 7;
  }
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  if (estimate.property_name) { doc.text(estimate.property_name, 14, y); y += 5; }
  if (estimate.property_address) { doc.text(estimate.property_address, 14, y); y += 5; }
  if (estimate.unit_info) { doc.text(estimate.unit_info, 14, y); y += 5; }
  if (estimate.description) { doc.text(estimate.description, 14, y); y += 5; }
  y += 5;

  // Sections + items table
  for (const section of sections ?? []) {
    const items = section.items ?? [];
    if (items.length === 0) continue;

    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text(section.name + (section.tier ? ` (${section.tier})` : ""), 14, y);
    y += 4;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc as any).autoTable({
      startY: y,
      head: [[t("itemDescription"), t("type"), t("qty"), t("unitPrice"), t("lineTotal")]],
      body: items.map((item: { description: string; item_type: string; quantity: number; unit_price: number; total: number }) => [
        item.description,
        item.item_type,
        item.quantity,
        `$${Number(item.unit_price).toFixed(2)}`,
        `$${Number(item.total).toFixed(2)}`,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [34, 139, 34], textColor: [255, 255, 255] },
      margin: { left: 14, right: 14 },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Financial summary
  const summaryX = pageWidth - 80;
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(t("subtotal"), summaryX, y); doc.text(`$${Number(estimate.subtotal).toFixed(2)}`, pageWidth - 14, y, { align: "right" }); y += 5;
  if (Number(estimate.markup_pct) > 0) {
    doc.text(`${t("markup")} (${estimate.markup_pct}%)`, summaryX, y); doc.text(`$${Number(estimate.markup_amount).toFixed(2)}`, pageWidth - 14, y, { align: "right" }); y += 5;
  }
  if (Number(estimate.tax_pct) > 0) {
    doc.text(`${t("tax")} (${estimate.tax_pct}%)`, summaryX, y); doc.text(`$${Number(estimate.tax_amount).toFixed(2)}`, pageWidth - 14, y, { align: "right" }); y += 5;
  }
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(t("total"), summaryX, y + 2); doc.text(`$${Number(estimate.total).toFixed(2)}`, pageWidth - 14, y + 2, { align: "right" });

  // Terms
  if (estimate.terms) {
    y += 15;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(t("terms"), 14, y);
    y += 5;
    doc.setFontSize(8);
    const splitTerms = doc.splitTextToSize(estimate.terms, pageWidth - 28);
    doc.text(splitTerms, 14, y);
  }

  const pdfOutput = doc.output("datauristring");
  return { pdf: pdfOutput };
}
