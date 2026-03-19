"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePmRole } from "@/lib/vendor/role-helpers";

// ============================================
// Types
// ============================================

export type UnitType = "studio" | "1br" | "2br" | "3br" | "4br" | "other";
export type UnitStatus = "occupied" | "vacant" | "turn_in_progress" | "ready_to_lease";

export type CostCategory =
  | "general"
  | "plumbing"
  | "electrical"
  | "hvac"
  | "appliance"
  | "paint"
  | "flooring"
  | "cleaning"
  | "pest_control"
  | "landscaping"
  | "roofing"
  | "turn"
  | "capital"
  | "other";

export type InspectionType = "move_in" | "move_out" | "routine" | "annual";

export type DocumentType = "lease" | "warranty" | "permit" | "invoice" | "other";

export interface OperateUnit {
  id: string;
  pm_user_id: string;
  property_name: string;
  property_address: string | null;
  unit_number: string;
  unit_type: UnitType;
  status: UnitStatus;
  tenant_name: string | null;
  tenant_email: string | null;
  tenant_phone: string | null;
  lease_start: string | null;
  lease_end: string | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  floor: number | null;
  notes: string | null;
  last_inspection_date: string | null;
  created_at: string;
  updated_at: string;
  // Computed
  lifetime_cost: number;
  open_wo_count: number;
}

export interface CostLedgerEntry {
  id: string;
  unit_id: string;
  wo_id: string | null;
  description: string;
  category: CostCategory;
  labor_cost: number;
  parts_cost: number;
  total_cost: number;
  vendor_name: string | null;
  tech_name: string | null;
  posted_at: string;
  posted_by: string | null;
  source: "manual" | "work_order" | "turn";
  turn_id: string | null;
  fiscal_year: number;
  created_at: string;
}

export interface UnitInspection {
  id: string;
  unit_id: string;
  inspection_type: InspectionType;
  conducted_by: string | null;
  conducted_by_name: string | null;
  conducted_at: string;
  condition_rating: number | null;
  notes: string | null;
  photos: unknown[];
  created_at: string;
}

export interface UnitDocument {
  id: string;
  unit_id: string;
  document_type: DocumentType;
  file_name: string;
  storage_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface UnitFilters {
  search?: string;
  property_name?: string;
  status?: UnitStatus;
  unit_type?: UnitType;
}

export interface CostLedgerFilters {
  category?: CostCategory;
  vendor_name?: string;
  date_from?: string;
  date_to?: string;
}

export interface CreateUnitInput {
  property_name: string;
  property_address?: string;
  unit_number: string;
  unit_type?: UnitType;
  status?: UnitStatus;
  tenant_name?: string;
  tenant_email?: string;
  tenant_phone?: string;
  lease_start?: string;
  lease_end?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  floor?: number;
  notes?: string;
}

export interface UpdateUnitInput {
  property_name?: string;
  property_address?: string;
  unit_number?: string;
  unit_type?: UnitType;
  status?: UnitStatus;
  tenant_name?: string | null;
  tenant_email?: string | null;
  tenant_phone?: string | null;
  lease_start?: string | null;
  lease_end?: string | null;
  beds?: number | null;
  baths?: number | null;
  sqft?: number | null;
  floor?: number | null;
  notes?: string | null;
}

// ============================================
// 1. Get Units (list with computed fields)
// ============================================

export async function getOperateUnits(
  filters: UnitFilters = {}
): Promise<{ data: OperateUnit[]; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  let query = supabase
    .from("operate_units")
    .select("*")
    .eq("pm_user_id", user.id);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.unit_type) {
    query = query.eq("unit_type", filters.unit_type);
  }

  if (filters.property_name) {
    query = query.eq("property_name", filters.property_name);
  }

  if (filters.search) {
    query = query.or(
      `property_name.ilike.%${filters.search}%,unit_number.ilike.%${filters.search}%,tenant_name.ilike.%${filters.search}%,property_address.ilike.%${filters.search}%`
    );
  }

  const { data: units, error } = await query.order("property_name").order("unit_number");

  if (error) return { data: [], error: error.message };
  if (!units || units.length === 0) return { data: [] };

  const unitIds = units.map((u) => u.id);

  // Batch fetch: cost sums + open WO counts
  const [ledgerResult, woResult] = await Promise.all([
    supabase
      .from("operate_unit_cost_ledger")
      .select("unit_id, total_cost")
      .in("unit_id", unitIds),
    supabase
      .from("vendor_work_orders")
      .select("unit_id, status")
      .in("unit_id", unitIds)
      .not("unit_id", "is", null),
  ]);

  const ledgerEntries = ledgerResult.data ?? [];
  const woEntries = woResult.data ?? [];

  // Sum lifetime cost per unit
  const costByUnit = new Map<string, number>();
  for (const entry of ledgerEntries) {
    const prev = costByUnit.get(entry.unit_id) ?? 0;
    costByUnit.set(entry.unit_id, prev + (Number(entry.total_cost) || 0));
  }

  // Count open WOs per unit (not completed, cancelled, paid, invoiced)
  const closedStatuses = new Set(["completed", "cancelled", "paid", "invoiced"]);
  const openWoByUnit = new Map<string, number>();
  for (const wo of woEntries) {
    if (!closedStatuses.has(wo.status)) {
      const prev = openWoByUnit.get(wo.unit_id) ?? 0;
      openWoByUnit.set(wo.unit_id, prev + 1);
    }
  }

  const enriched: OperateUnit[] = units.map((u) => ({
    ...u,
    lifetime_cost: costByUnit.get(u.id) ?? 0,
    open_wo_count: openWoByUnit.get(u.id) ?? 0,
  }));

  return { data: enriched };
}

// ============================================
// 2. Get Single Unit (detail)
// ============================================

export async function getOperateUnit(
  unitId: string
): Promise<{ data: OperateUnit | null; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();

  const { data: unit, error } = await supabase
    .from("operate_units")
    .select("*")
    .eq("id", unitId)
    .single();

  if (error || !unit) {
    return { data: null, error: error?.message ?? "Unit not found" };
  }

  // Compute lifetime_cost and open_wo_count
  const [ledgerResult, woResult] = await Promise.all([
    supabase
      .from("operate_unit_cost_ledger")
      .select("total_cost")
      .eq("unit_id", unitId),
    supabase
      .from("vendor_work_orders")
      .select("status")
      .eq("unit_id", unitId),
  ]);

  const lifetimeCost = (ledgerResult.data ?? []).reduce(
    (sum, e) => sum + (Number(e.total_cost) || 0),
    0
  );

  const closedStatuses = new Set(["completed", "cancelled", "paid", "invoiced"]);
  const openWoCount = (woResult.data ?? []).filter(
    (wo) => !closedStatuses.has(wo.status)
  ).length;

  return {
    data: {
      ...unit,
      lifetime_cost: lifetimeCost,
      open_wo_count: openWoCount,
    } as OperateUnit,
  };
}

// ============================================
// 3. Create Unit
// ============================================

export async function createOperateUnit(
  input: CreateUnitInput
): Promise<{ data: { id: string } | null; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("operate_units")
    .insert({
      pm_user_id: user.id,
      property_name: input.property_name,
      property_address: input.property_address ?? null,
      unit_number: input.unit_number,
      unit_type: input.unit_type ?? "other",
      status: input.status ?? "vacant",
      tenant_name: input.tenant_name ?? null,
      tenant_email: input.tenant_email ?? null,
      tenant_phone: input.tenant_phone ?? null,
      lease_start: input.lease_start ?? null,
      lease_end: input.lease_end ?? null,
      beds: input.beds ?? null,
      baths: input.baths ?? null,
      sqft: input.sqft ?? null,
      floor: input.floor ?? null,
      notes: input.notes ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Unit create failed:", error);
    return { data: null, error: error.message };
  }

  return { data: { id: data.id } };
}

// ============================================
// 4. Update Unit (inline edit, save on blur)
// ============================================

export async function updateOperateUnit(
  unitId: string,
  updates: UpdateUnitInput
): Promise<{ success: boolean; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();

  const { error } = await supabase
    .from("operate_units")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", unitId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ============================================
// 5. Delete Unit
// ============================================

export async function deleteOperateUnit(
  unitId: string
): Promise<{ success: boolean; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();

  const { error } = await supabase
    .from("operate_units")
    .delete()
    .eq("id", unitId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ============================================
// 6. Get Unit Cost Ledger
// ============================================

export async function getUnitCostLedger(
  unitId: string,
  filters: CostLedgerFilters = {}
): Promise<{ data: CostLedgerEntry[]; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();

  let query = supabase
    .from("operate_unit_cost_ledger")
    .select("*")
    .eq("unit_id", unitId);

  if (filters.category) {
    query = query.eq("category", filters.category);
  }

  if (filters.vendor_name) {
    query = query.ilike("vendor_name", `%${filters.vendor_name}%`);
  }

  if (filters.date_from) {
    query = query.gte("posted_at", filters.date_from);
  }

  if (filters.date_to) {
    query = query.lte("posted_at", filters.date_to);
  }

  const { data, error } = await query.order("posted_at", { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as CostLedgerEntry[] };
}

// ============================================
// 7. Add Cost Ledger Entry (manual)
// ============================================

export async function addCostLedgerEntry(
  unitId: string,
  input: {
    description: string;
    category?: CostCategory;
    labor_cost?: number;
    parts_cost?: number;
    vendor_name?: string;
    tech_name?: string;
    posted_at?: string;
    turn_id?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase.from("operate_unit_cost_ledger").insert({
    unit_id: unitId,
    description: input.description,
    category: input.category ?? "general",
    labor_cost: input.labor_cost ?? 0,
    parts_cost: input.parts_cost ?? 0,
    vendor_name: input.vendor_name ?? null,
    tech_name: input.tech_name ?? null,
    posted_at: input.posted_at ?? new Date().toISOString(),
    posted_by: user.id,
    source: "manual",
    turn_id: input.turn_id ?? null,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ============================================
// 8. Get Unit Work Orders
// ============================================

export async function getUnitWorkOrders(
  unitId: string,
  statusFilter?: string
): Promise<{ data: Record<string, unknown>[]; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();

  let query = supabase
    .from("vendor_work_orders")
    .select("*")
    .eq("unit_id", unitId);

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as Record<string, unknown>[] };
}

// ============================================
// 9. Get Unit Inspections
// ============================================

export async function getUnitInspections(
  unitId: string
): Promise<{ data: UnitInspection[]; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("operate_unit_inspections")
    .select("*")
    .eq("unit_id", unitId)
    .order("conducted_at", { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as UnitInspection[] };
}

// ============================================
// 10. Create Unit Inspection
// ============================================

export async function createUnitInspection(
  unitId: string,
  input: {
    inspection_type: InspectionType;
    conducted_by_name?: string;
    conducted_at?: string;
    condition_rating?: number;
    notes?: string;
    photos?: unknown[];
  }
): Promise<{ success: boolean; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const conductedAt = input.conducted_at ?? new Date().toISOString();

  const { error: insertError } = await supabase
    .from("operate_unit_inspections")
    .insert({
      unit_id: unitId,
      inspection_type: input.inspection_type,
      conducted_by: user.id,
      conducted_by_name: input.conducted_by_name ?? null,
      conducted_at: conductedAt,
      condition_rating: input.condition_rating ?? null,
      notes: input.notes ?? null,
      photos: input.photos ?? [],
    });

  if (insertError) return { success: false, error: insertError.message };

  // Update unit.last_inspection_date
  const inspectionDate = conductedAt.split("T")[0];
  const { error: updateError } = await supabase
    .from("operate_units")
    .update({
      last_inspection_date: inspectionDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", unitId);

  if (updateError) {
    console.error("Failed to update last_inspection_date:", updateError);
  }

  return { success: true };
}

// ============================================
// 11. Get Unit Documents
// ============================================

export async function getUnitDocuments(
  unitId: string
): Promise<{ data: UnitDocument[]; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("operate_unit_documents")
    .select("*")
    .eq("unit_id", unitId)
    .order("created_at", { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as UnitDocument[] };
}

// ============================================
// 12. Upload Unit Document
// ============================================

export async function uploadUnitDocument(
  unitId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const file = formData.get("file") as File | null;
  if (!file) return { success: false, error: "No file provided" };

  const documentType = (formData.get("document_type") as DocumentType) ?? "other";
  const notes = (formData.get("notes") as string) ?? null;

  // Build storage path
  const ext = file.name.split(".").pop() || "bin";
  const fileId = crypto.randomUUID();
  const storagePath = `operate-units/${unitId}/documents/${fileId}.${ext}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("dd-captures")
    .upload(storagePath, file);

  if (uploadError) {
    return { success: false, error: `Upload failed: ${uploadError.message}` };
  }

  // Insert document record
  const { error: insertError } = await supabase
    .from("operate_unit_documents")
    .insert({
      unit_id: unitId,
      document_type: documentType,
      file_name: file.name,
      storage_path: storagePath,
      file_size: file.size,
      mime_type: file.type || null,
      uploaded_by: user.id,
      notes: notes?.trim() || null,
    });

  if (insertError) {
    // Cleanup uploaded file on DB insert failure
    await supabase.storage.from("dd-captures").remove([storagePath]);
    return { success: false, error: `DB insert failed: ${insertError.message}` };
  }

  return { success: true };
}

// ============================================
// 13. Delete Unit Document
// ============================================

export async function deleteUnitDocument(
  documentId: string
): Promise<{ success: boolean; error?: string }> {
  await requirePmRole();
  const supabase = await createClient();

  // Fetch the document to get storage_path before deleting
  const { data: doc, error: fetchError } = await supabase
    .from("operate_unit_documents")
    .select("storage_path")
    .eq("id", documentId)
    .single();

  if (fetchError || !doc) {
    return { success: false, error: fetchError?.message ?? "Document not found" };
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from("dd-captures")
    .remove([doc.storage_path]);

  if (storageError) {
    console.error("Storage delete failed:", storageError);
    // Continue to delete DB record even if storage removal fails
  }

  // Delete DB record
  const { error: deleteError } = await supabase
    .from("operate_unit_documents")
    .delete()
    .eq("id", documentId);

  if (deleteError) return { success: false, error: deleteError.message };
  return { success: true };
}

// ============================================
// 14. Get Unit Properties (distinct values for filter dropdown)
// ============================================

export async function getUnitProperties(): Promise<{
  data: string[];
  error?: string;
}> {
  await requirePmRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("operate_units")
    .select("property_name")
    .eq("pm_user_id", user.id)
    .order("property_name");

  if (error) return { data: [], error: error.message };

  // Extract distinct property names
  const seen = new Set<string>();
  const distinct: string[] = [];
  for (const row of data ?? []) {
    if (!seen.has(row.property_name)) {
      seen.add(row.property_name);
      distinct.push(row.property_name);
    }
  }

  return { data: distinct };
}
