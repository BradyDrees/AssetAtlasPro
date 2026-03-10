"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole, logActivity } from "@/lib/vendor/role-helpers";

// ─── Types ──────────────────────────────────────────────

export interface CatalogItem {
  id: string;
  vendor_org_id: string;
  name: string;
  sku: string | null;
  category: string | null;
  unit_cost: number | null;
  supplier: string | null;
  current_stock: number;
  min_stock: number;
  unit_of_measure: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePartInput {
  name: string;
  sku?: string;
  category?: string;
  unit_cost?: number;
  supplier?: string;
  current_stock?: number;
  min_stock?: number;
  unit_of_measure?: string;
}

export interface UpdatePartInput {
  name?: string;
  sku?: string;
  category?: string;
  unit_cost?: number;
  supplier?: string;
  current_stock?: number;
  min_stock?: number;
  unit_of_measure?: string;
  is_active?: boolean;
}

// ─── CRUD ──────────────────────────────────────────────

/** Get all parts in the catalog */
export async function getCatalog(filters?: {
  search?: string;
  category?: string;
  lowStockOnly?: boolean;
}): Promise<{ data: CatalogItem[]; error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  let query = supabase
    .from("vendor_parts_catalog")
    .select("*")
    .eq("vendor_org_id", vendor_org_id)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,category.ilike.%${filters.search}%`
    );
  }

  if (filters?.category) {
    query = query.eq("category", filters.category);
  }

  const { data, error } = await query;
  if (error) return { data: [], error: error.message };

  let items = (data ?? []) as CatalogItem[];

  if (filters?.lowStockOnly) {
    items = items.filter((i) => i.current_stock <= i.min_stock);
  }

  return { data: items };
}

/** Get catalog categories for filters */
export async function getCatalogCategories(): Promise<string[]> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  const { data } = await supabase
    .from("vendor_parts_catalog")
    .select("category")
    .eq("vendor_org_id", vendor_org_id)
    .eq("is_active", true)
    .not("category", "is", null);

  const categories = [...new Set((data ?? []).map((d) => d.category as string).filter(Boolean))];
  return categories.sort();
}

/** Create a new part */
export async function createPart(
  input: CreatePartInput
): Promise<{ data?: CatalogItem; error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_parts_catalog")
    .insert({
      vendor_org_id,
      name: input.name,
      sku: input.sku || null,
      category: input.category || null,
      unit_cost: input.unit_cost ?? null,
      supplier: input.supplier || null,
      current_stock: input.current_stock ?? 0,
      min_stock: input.min_stock ?? 0,
      unit_of_measure: input.unit_of_measure || "each",
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity({
    entityType: "inventory",
    entityId: data.id,
    action: "part_created",
    metadata: { name: input.name },
  });

  return { data: data as CatalogItem };
}

/** Update a part */
export async function updatePart(
  partId: string,
  updates: UpdatePartInput
): Promise<{ error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.sku !== undefined) updateData.sku = updates.sku || null;
  if (updates.category !== undefined) updateData.category = updates.category || null;
  if (updates.unit_cost !== undefined) updateData.unit_cost = updates.unit_cost;
  if (updates.supplier !== undefined) updateData.supplier = updates.supplier || null;
  if (updates.current_stock !== undefined) updateData.current_stock = updates.current_stock;
  if (updates.min_stock !== undefined) updateData.min_stock = updates.min_stock;
  if (updates.unit_of_measure !== undefined) updateData.unit_of_measure = updates.unit_of_measure;
  if (updates.is_active !== undefined) updateData.is_active = updates.is_active;

  const { error } = await supabase
    .from("vendor_parts_catalog")
    .update(updateData)
    .eq("id", partId);

  if (error) return { error: error.message };
  return {};
}

/** Soft-delete a part (set inactive) */
export async function deletePart(partId: string): Promise<{ error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  const { error } = await supabase
    .from("vendor_parts_catalog")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", partId);

  if (error) return { error: error.message };

  await logActivity({
    entityType: "inventory",
    entityId: partId,
    action: "part_deleted",
  });

  return {};
}

/** Decrement stock when material is used on a job */
export async function decrementStock(
  catalogItemId: string,
  quantity: number
): Promise<{ error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  // Get current stock
  const { data: item, error: fetchError } = await supabase
    .from("vendor_parts_catalog")
    .select("current_stock")
    .eq("id", catalogItemId)
    .single();

  if (fetchError || !item) return { error: fetchError?.message ?? "Item not found" };

  const newStock = Math.max(0, (item.current_stock ?? 0) - quantity);

  const { error } = await supabase
    .from("vendor_parts_catalog")
    .update({ current_stock: newStock, updated_at: new Date().toISOString() })
    .eq("id", catalogItemId);

  if (error) return { error: error.message };
  return {};
}

/** Get low stock alerts */
export async function getLowStockAlerts(): Promise<{
  data: CatalogItem[];
  error?: string;
}> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_parts_catalog")
    .select("*")
    .eq("vendor_org_id", vendor_org_id)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) return { data: [], error: error.message };

  const lowStock = ((data ?? []) as CatalogItem[]).filter(
    (i) => i.current_stock <= i.min_stock && i.min_stock > 0
  );

  return { data: lowStock };
}
