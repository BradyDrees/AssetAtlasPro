"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole, logActivity } from "@/lib/vendor/role-helpers";

// ============================================
// Pricebook
// ============================================

export interface PricebookItem {
  id: string;
  vendor_org_id: string;
  name: string;
  description: string | null;
  item_type: string;
  unit: string;
  unit_price: number;
  category: string | null;
  is_active: boolean;
  created_at: string;
}

export async function getPricebookItems(): Promise<{
  data: PricebookItem[];
  error?: string;
}> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_pricebook_items")
    .select("*")
    .eq("vendor_org_id", vendor_org_id)
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as PricebookItem[] };
}

export async function createPricebookItem(input: {
  name: string;
  description?: string;
  item_type?: string;
  unit?: string;
  unit_price?: number;
  category?: string;
}): Promise<{ item: PricebookItem | null; error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_pricebook_items")
    .insert({ ...input, vendor_org_id })
    .select()
    .single();

  if (error) return { item: null, error: error.message };
  return { item: data as PricebookItem };
}

export async function updatePricebookItem(
  id: string,
  input: Partial<PricebookItem>
): Promise<{ success: boolean; error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  const { error } = await supabase
    .from("vendor_pricebook_items")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deletePricebookItem(
  id: string
): Promise<{ success: boolean; error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  const { error } = await supabase
    .from("vendor_pricebook_items")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ============================================
// Estimate Templates
// ============================================

export interface EstimateTemplate {
  id: string;
  vendor_org_id: string;
  name: string;
  description: string | null;
  trade: string | null;
  sections: unknown;
  markup_pct: number;
  tax_pct: number;
  terms: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export async function getEstimateTemplates(): Promise<{
  data: EstimateTemplate[];
  error?: string;
}> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_estimate_templates")
    .select("*")
    .eq("vendor_org_id", vendor_org_id)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as EstimateTemplate[] };
}

export async function createEstimateTemplate(input: {
  name: string;
  description?: string;
  trade?: string;
  sections: unknown;
  markup_pct?: number;
  tax_pct?: number;
  terms?: string;
}): Promise<{ template: EstimateTemplate | null; error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("vendor_estimate_templates")
    .insert({ ...input, vendor_org_id, created_by: user?.id })
    .select()
    .single();

  if (error) return { template: null, error: error.message };

  await logActivity({
    entityType: "estimate",
    entityId: data.id,
    action: "template_created",
    metadata: { name: input.name },
  });

  return { template: data as EstimateTemplate };
}

export async function deleteEstimateTemplate(
  id: string
): Promise<{ success: boolean; error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  const { error } = await supabase
    .from("vendor_estimate_templates")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
