"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole, logActivity } from "@/lib/vendor/role-helpers";
import type { VendorClient, CreateClientInput, UpdateClientInput } from "@/lib/vendor/expense-types";

/** Get all direct clients for the vendor org */
export async function getDirectClients(filters?: {
  is_active?: boolean;
  search?: string;
}): Promise<{ data: VendorClient[]; error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  let query = supabase
    .from("vendor_clients")
    .select("*")
    .eq("vendor_org_id", vendor_org_id)
    .order("name", { ascending: true });

  if (filters?.is_active !== undefined) {
    query = query.eq("is_active", filters.is_active);
  }

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as VendorClient[] };
}

/** Get a single client */
export async function getDirectClient(clientId: string): Promise<{ data: VendorClient | null; error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_clients")
    .select("*")
    .eq("id", clientId)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as VendorClient };
}

/** Create a direct client */
export async function createDirectClient(
  input: CreateClientInput
): Promise<{ data?: VendorClient; error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("vendor_clients")
    .insert({
      vendor_org_id,
      name: input.name,
      contact_name: input.contact_name || null,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      city: input.city || null,
      state: input.state || null,
      zip: input.zip || null,
      client_type: input.client_type || "direct",
      notes: input.notes || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity({
    entityType: "client",
    entityId: data.id,
    action: "created",
    metadata: { name: input.name },
  });

  return { data: data as VendorClient };
}

/** Update a direct client */
export async function updateDirectClient(
  clientId: string,
  updates: UpdateClientInput
): Promise<{ error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.contact_name !== undefined) updateData.contact_name = updates.contact_name || null;
  if (updates.phone !== undefined) updateData.phone = updates.phone || null;
  if (updates.email !== undefined) updateData.email = updates.email || null;
  if (updates.address !== undefined) updateData.address = updates.address || null;
  if (updates.city !== undefined) updateData.city = updates.city || null;
  if (updates.state !== undefined) updateData.state = updates.state || null;
  if (updates.zip !== undefined) updateData.zip = updates.zip || null;
  if (updates.client_type !== undefined) updateData.client_type = updates.client_type;
  if (updates.notes !== undefined) updateData.notes = updates.notes || null;
  if (updates.is_active !== undefined) updateData.is_active = updates.is_active;

  const { error } = await supabase
    .from("vendor_clients")
    .update(updateData)
    .eq("id", clientId);

  if (error) return { error: error.message };
  return {};
}

/** Delete a direct client */
export async function deleteDirectClient(clientId: string): Promise<{ error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  const { error } = await supabase
    .from("vendor_clients")
    .delete()
    .eq("id", clientId);

  if (error) return { error: error.message };

  await logActivity({
    entityType: "client",
    entityId: clientId,
    action: "deleted",
  });

  return {};
}

// ─── Pipeline / CRM Actions ──────────────────────────────

export interface ClientNote {
  id: string;
  client_id: string;
  note: string;
  is_system: boolean;
  created_by: string | null;
  created_at: string;
}

export interface ClientWithPipeline extends VendorClient {
  lead_status: string;
  lead_source: string | null;
  next_followup_at: string | null;
  tags: string[];
  lifetime_revenue: number;
  last_job_at: string | null;
}

/** Update lead status + auto-insert system note */
export async function updateLeadStatus(
  clientId: string,
  newStatus: string,
  oldStatus: string
): Promise<{ error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const validStatuses = ["new", "contacted", "quoted", "won", "lost", "active"];
  if (!validStatuses.includes(newStatus)) return { error: "Invalid status" };

  // Update the client
  const { error } = await supabase
    .from("vendor_clients")
    .update({ lead_status: newStatus })
    .eq("id", clientId)
    .eq("vendor_org_id", vendor_org_id);

  if (error) return { error: error.message };

  // Auto-insert system note
  await supabase.from("vendor_client_notes").insert({
    vendor_org_id,
    client_id: clientId,
    note: `Lead moved from ${oldStatus} to ${newStatus}`,
    is_system: true,
    created_by: user.id,
  });

  await logActivity({
    entityType: "client",
    entityId: clientId,
    action: "status_changed",
    metadata: { from: oldStatus, to: newStatus },
  });

  return {};
}

/** Add a manual note to a client */
export async function addClientNote(
  clientId: string,
  note: string
): Promise<{ data?: ClientNote; error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("vendor_client_notes")
    .insert({
      vendor_org_id,
      client_id: clientId,
      note: note.trim(),
      is_system: false,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as ClientNote };
}

/** Get client with notes timeline */
export async function getClientWithHistory(
  clientId: string
): Promise<{
  client: ClientWithPipeline | null;
  notes: ClientNote[];
  error?: string;
}> {
  await requireVendorRole();
  const supabase = await createClient();

  const [clientRes, notesRes] = await Promise.all([
    supabase
      .from("vendor_clients")
      .select("*")
      .eq("id", clientId)
      .single(),
    supabase
      .from("vendor_client_notes")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (clientRes.error) return { client: null, notes: [], error: clientRes.error.message };

  return {
    client: clientRes.data as ClientWithPipeline,
    notes: (notesRes.data ?? []) as ClientNote[],
  };
}

/** Set follow-up reminder */
export async function setFollowup(
  clientId: string,
  followupAt: string | null
): Promise<{ error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  const { error } = await supabase
    .from("vendor_clients")
    .update({ next_followup_at: followupAt })
    .eq("id", clientId);

  if (error) return { error: error.message };
  return {};
}

/** Get all direct clients with pipeline fields */
export async function getDirectClientsWithPipeline(): Promise<{
  data: ClientWithPipeline[];
  error?: string;
}> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_clients")
    .select("*")
    .eq("vendor_org_id", vendor_org_id)
    .order("updated_at", { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as ClientWithPipeline[] };
}

/** Import clients from CSV data — row cap 500 */
export async function importClientsFromCsv(
  rows: CreateClientInput[]
): Promise<{ imported: number; errors: string[]; error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { imported: 0, errors: [], error: "Not authenticated" };

  if (rows.length === 0) return { imported: 0, errors: ["No rows provided"] };
  if (rows.length > 500) return { imported: 0, errors: ["Maximum 500 rows per import"] };

  const validRows: Record<string, unknown>[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.name || row.name.trim().length === 0) {
      errors.push(`Row ${i + 1}: Name is required`);
      continue;
    }
    validRows.push({
      vendor_org_id,
      name: row.name.trim(),
      contact_name: row.contact_name?.trim() || null,
      phone: row.phone?.trim() || null,
      email: row.email?.trim() || null,
      address: row.address?.trim() || null,
      city: row.city?.trim() || null,
      state: row.state?.trim() || null,
      zip: row.zip?.trim() || null,
      client_type: row.client_type || "direct",
      notes: row.notes?.trim() || null,
      created_by: user.id,
    });
  }

  if (validRows.length === 0) {
    return { imported: 0, errors };
  }

  const { error } = await supabase.from("vendor_clients").insert(validRows);
  if (error) return { imported: 0, errors: [error.message] };

  await logActivity({
    entityType: "client",
    entityId: "bulk_import",
    action: "bulk_imported",
    metadata: { count: validRows.length },
  });

  return { imported: validRows.length, errors };
}
