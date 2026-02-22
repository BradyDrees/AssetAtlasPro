"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole, logActivity } from "@/lib/vendor/role-helpers";
import {
  validateEstimateTransition,
  vendorOrgRoleToTransitionRole,
} from "@/lib/vendor/state-machine";
import type { EstimateStatus } from "@/lib/vendor/types";
import type {
  VendorEstimate,
  VendorEstimateSection,
  VendorEstimateItem,
  CreateEstimateInput,
  CreateSectionInput,
  CreateItemInput,
  UpdateItemInput,
} from "@/lib/vendor/estimate-types";

// ============================================
// Estimate Queries
// ============================================

/** Get all estimates for the current vendor org */
export async function getVendorEstimates(filters?: {
  status?: EstimateStatus | EstimateStatus[];
}): Promise<{ data: VendorEstimate[]; error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  let query = supabase
    .from("vendor_estimates")
    .select("*")
    .eq("vendor_org_id", vendor_org_id)
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
  return { data: (data ?? []) as VendorEstimate[] };
}

/** Get a single estimate with sections and items */
export async function getEstimateDetail(estimateId: string): Promise<{
  estimate: VendorEstimate | null;
  sections: (VendorEstimateSection & { items: VendorEstimateItem[] })[];
  error?: string;
}> {
  await requireVendorRole();
  const supabase = await createClient();

  const { data: estimate, error: estError } = await supabase
    .from("vendor_estimates")
    .select("*")
    .eq("id", estimateId)
    .single();

  if (estError || !estimate) {
    return { estimate: null, sections: [], error: estError?.message || "Not found" };
  }

  const { data: sectionsData } = await supabase
    .from("vendor_estimate_sections")
    .select("*")
    .eq("estimate_id", estimateId)
    .order("sort_order", { ascending: true });

  const sections: (VendorEstimateSection & { items: VendorEstimateItem[] })[] = [];

  for (const section of (sectionsData ?? []) as VendorEstimateSection[]) {
    const { data: items } = await supabase
      .from("vendor_estimate_items")
      .select("*")
      .eq("section_id", section.id)
      .order("sort_order", { ascending: true });

    sections.push({
      ...section,
      items: (items ?? []) as VendorEstimateItem[],
    });
  }

  return { estimate: estimate as VendorEstimate, sections };
}

// ============================================
// Estimate CRUD
// ============================================

/** Create a new estimate */
export async function createEstimate(
  input: CreateEstimateInput
): Promise<{ data?: VendorEstimate; error?: string }> {
  const vendorAuth = await requireVendorRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Generate estimate number
  const { count } = await supabase
    .from("vendor_estimates")
    .select("*", { count: "exact", head: true })
    .eq("vendor_org_id", vendorAuth.vendor_org_id);

  const estNumber = `EST-${String((count ?? 0) + 1).padStart(4, "0")}`;

  const { data, error } = await supabase
    .from("vendor_estimates")
    .insert({
      vendor_org_id: vendorAuth.vendor_org_id,
      created_by: vendorAuth.id,
      pm_user_id: input.pm_user_id || null,
      work_order_id: input.work_order_id || null,
      estimate_number: estNumber,
      property_name: input.property_name || null,
      property_address: input.property_address || null,
      unit_info: input.unit_info || null,
      title: input.title || null,
      description: input.description || null,
      tier_mode: input.tier_mode || "none",
      terms: input.terms || null,
      valid_until: input.valid_until || null,
      status: "draft",
      updated_by: user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity({
    entityType: "estimate",
    entityId: data.id,
    action: "created",
    metadata: { estimate_number: estNumber },
  });

  return { data: data as VendorEstimate };
}

/** Update estimate header fields */
export async function updateEstimate(
  estimateId: string,
  updates: Partial<CreateEstimateInput> & {
    markup_pct?: number;
    tax_pct?: number;
    internal_notes?: string;
  }
): Promise<{ error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const updateData: Record<string, unknown> = {
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.property_name !== undefined) updateData.property_name = updates.property_name;
  if (updates.property_address !== undefined) updateData.property_address = updates.property_address;
  if (updates.unit_info !== undefined) updateData.unit_info = updates.unit_info;
  if (updates.pm_user_id !== undefined) updateData.pm_user_id = updates.pm_user_id;
  if (updates.work_order_id !== undefined) updateData.work_order_id = updates.work_order_id;
  if (updates.tier_mode !== undefined) updateData.tier_mode = updates.tier_mode;
  if (updates.terms !== undefined) updateData.terms = updates.terms;
  if (updates.valid_until !== undefined) updateData.valid_until = updates.valid_until;
  if (updates.markup_pct !== undefined) updateData.markup_pct = updates.markup_pct;
  if (updates.tax_pct !== undefined) updateData.tax_pct = updates.tax_pct;
  if (updates.internal_notes !== undefined) updateData.internal_notes = updates.internal_notes;

  const { error } = await supabase
    .from("vendor_estimates")
    .update(updateData)
    .eq("id", estimateId);

  if (error) return { error: error.message };
  return {};
}

// ============================================
// Section CRUD
// ============================================

export async function createSection(
  input: CreateSectionInput
): Promise<{ data?: VendorEstimateSection; error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_estimate_sections")
    .insert({
      estimate_id: input.estimate_id,
      name: input.name,
      tier: input.tier || null,
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as VendorEstimateSection };
}

export async function updateSection(
  sectionId: string,
  updates: { name?: string; tier?: string; sort_order?: number }
): Promise<{ error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  const { error } = await supabase
    .from("vendor_estimate_sections")
    .update(updates)
    .eq("id", sectionId);

  if (error) return { error: error.message };
  return {};
}

export async function deleteSection(sectionId: string): Promise<{ error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  const { error } = await supabase
    .from("vendor_estimate_sections")
    .delete()
    .eq("id", sectionId);

  if (error) return { error: error.message };
  return {};
}

// ============================================
// Item CRUD
// ============================================

export async function createItem(
  input: CreateItemInput
): Promise<{ data?: VendorEstimateItem; error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  const qty = input.quantity ?? 1;
  const price = input.unit_price ?? 0;
  const markup = input.markup_pct ?? 0;
  const baseTotal = qty * price;
  const total = baseTotal + baseTotal * (markup / 100);

  const { data, error } = await supabase
    .from("vendor_estimate_items")
    .insert({
      section_id: input.section_id,
      description: input.description,
      item_type: input.item_type || "labor",
      quantity: qty,
      unit: input.unit || "each",
      unit_price: price,
      markup_pct: markup,
      total,
      tier: input.tier || null,
      notes: input.notes || null,
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as VendorEstimateItem };
}

export async function updateItem(
  itemId: string,
  updates: UpdateItemInput
): Promise<{ error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  // Recalculate total if price/quantity/markup changed
  const updateData: Record<string, unknown> = {};
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.item_type !== undefined) updateData.item_type = updates.item_type;
  if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
  if (updates.unit !== undefined) updateData.unit = updates.unit;
  if (updates.unit_price !== undefined) updateData.unit_price = updates.unit_price;
  if (updates.markup_pct !== undefined) updateData.markup_pct = updates.markup_pct;
  if (updates.tier !== undefined) updateData.tier = updates.tier;
  if (updates.notes !== undefined) updateData.notes = updates.notes;
  if (updates.sort_order !== undefined) updateData.sort_order = updates.sort_order;

  // If qty/price/markup changed, recalculate total
  if (updates.quantity !== undefined || updates.unit_price !== undefined || updates.markup_pct !== undefined) {
    // Fetch current values for any missing fields
    const { data: current } = await supabase
      .from("vendor_estimate_items")
      .select("quantity, unit_price, markup_pct")
      .eq("id", itemId)
      .single();

    if (current) {
      const qty = updates.quantity ?? current.quantity;
      const price = updates.unit_price ?? current.unit_price;
      const markup = updates.markup_pct ?? current.markup_pct;
      const baseTotal = qty * price;
      updateData.total = baseTotal + baseTotal * (markup / 100);
    }
  }

  const { error } = await supabase
    .from("vendor_estimate_items")
    .update(updateData)
    .eq("id", itemId);

  if (error) return { error: error.message };
  return {};
}

export async function deleteItem(itemId: string): Promise<{ error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  const { error } = await supabase
    .from("vendor_estimate_items")
    .delete()
    .eq("id", itemId);

  if (error) return { error: error.message };
  return {};
}

// ============================================
// Recalculate totals
// ============================================

/** Recalculate section subtotals and estimate totals */
export async function recalculateEstimateTotals(
  estimateId: string
): Promise<{ error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Get all sections + items
  const { data: sections } = await supabase
    .from("vendor_estimate_sections")
    .select("id")
    .eq("estimate_id", estimateId);

  let estimateSubtotal = 0;

  for (const section of sections ?? []) {
    const { data: items } = await supabase
      .from("vendor_estimate_items")
      .select("total")
      .eq("section_id", section.id);

    const sectionSubtotal = (items ?? []).reduce(
      (sum, item) => sum + (Number(item.total) || 0),
      0
    );

    await supabase
      .from("vendor_estimate_sections")
      .update({ subtotal: sectionSubtotal })
      .eq("id", section.id);

    estimateSubtotal += sectionSubtotal;
  }

  // Get estimate markup/tax rates
  const { data: est } = await supabase
    .from("vendor_estimates")
    .select("markup_pct, tax_pct")
    .eq("id", estimateId)
    .single();

  const markupPct = Number(est?.markup_pct) || 0;
  const taxPct = Number(est?.tax_pct) || 0;

  const markupAmount = estimateSubtotal * (markupPct / 100);
  const afterMarkup = estimateSubtotal + markupAmount;
  const taxAmount = afterMarkup * (taxPct / 100);
  const total = afterMarkup + taxAmount;

  await supabase
    .from("vendor_estimates")
    .update({
      subtotal: estimateSubtotal,
      markup_amount: markupAmount,
      tax_amount: taxAmount,
      total,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", estimateId);

  return {};
}

// ============================================
// Status transitions
// ============================================

/** Send estimate to PM */
export async function sendEstimateToPm(
  estimateId: string
): Promise<{ error?: string }> {
  const vendorAuth = await requireVendorRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Recalculate first
  await recalculateEstimateTotals(estimateId);

  // Get current estimate
  const { data: est } = await supabase
    .from("vendor_estimates")
    .select("status, pm_user_id")
    .eq("id", estimateId)
    .single();

  if (!est) return { error: "Estimate not found" };
  if (!est.pm_user_id) return { error: "No PM assigned to this estimate" };

  const callerRole = vendorOrgRoleToTransitionRole(vendorAuth.role);
  const currentStatus = est.status as EstimateStatus;
  const validation = validateEstimateTransition(currentStatus, "sent", callerRole);

  if (!validation.valid) return { error: validation.reason };

  await supabase
    .from("vendor_estimates")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", estimateId);

  // Notify PM
  await supabase.from("vendor_notifications").insert({
    user_id: est.pm_user_id,
    type: "estimate_received",
    title: "New estimate received",
    body: "A vendor has submitted an estimate for your review",
    reference_type: "estimate",
    reference_id: estimateId,
  });

  await logActivity({
    entityType: "estimate",
    entityId: estimateId,
    action: "sent_to_pm",
    oldValue: currentStatus,
    newValue: "sent",
  });

  return {};
}
