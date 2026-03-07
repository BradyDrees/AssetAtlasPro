"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole } from "@/lib/vendor/role-helpers";
import type {
  ServiceAgreement,
  CreateAgreementInput,
  UpdateAgreementInput,
  AgreementStatus,
  AgreementFrequency,
} from "@/lib/vendor/agreement-types";
import { advanceDate } from "@/lib/vendor/agreement-types";

// ============================================
// List
// ============================================

export async function getAgreements(filters?: {
  status?: AgreementStatus[];
}): Promise<{ data: ServiceAgreement[]; error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  let query = supabase
    .from("service_agreements")
    .select("*")
    .eq("vendor_org_id", vendor_org_id)
    .order("next_due", { ascending: true, nullsFirst: false });

  if (filters?.status && filters.status.length > 0) {
    query = query.in("status", filters.status);
  }

  const { data, error } = await query;
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as ServiceAgreement[] };
}

// ============================================
// Detail
// ============================================

export async function getAgreementDetail(
  id: string
): Promise<{ agreement?: ServiceAgreement; error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("service_agreements")
    .select("*")
    .eq("id", id)
    .eq("vendor_org_id", vendor_org_id)
    .single();

  if (error || !data) return { error: error?.message ?? "Not found" };
  return { agreement: data as ServiceAgreement };
}

// ============================================
// Create
// ============================================

export async function createAgreement(
  input: CreateAgreementInput
): Promise<{ data?: ServiceAgreement; error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Compute first next_due from start_date + frequency
  let nextDue: string | null = null;
  if (input.start_date) {
    const startDate = new Date(input.start_date + "T00:00:00");
    const now = new Date();
    // If start is in the future, next_due = start_date; otherwise advance from start
    if (startDate > now) {
      nextDue = input.start_date;
    } else {
      nextDue = advanceDate(startDate, input.frequency).toISOString().split("T")[0];
    }
  }

  const { data, error } = await supabase
    .from("service_agreements")
    .insert({
      vendor_org_id,
      pm_user_id: input.pm_user_id || null,
      homeowner_id: input.homeowner_id || null,
      homeowner_property_id: input.homeowner_property_id || null,
      property_name: input.property_name || null,
      service_type: input.service_type,
      trade: input.trade,
      description: input.description || null,
      frequency: input.frequency,
      price: input.price ?? 0,
      next_due: nextDue,
      status: "active",
      start_date: input.start_date || null,
      end_date: input.end_date || null,
      notes: input.notes || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as ServiceAgreement };
}

// ============================================
// Update
// ============================================

export async function updateAgreement(
  id: string,
  updates: UpdateAgreementInput
): Promise<{ error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  const { error } = await supabase
    .from("service_agreements")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("vendor_org_id", vendor_org_id);

  if (error) return { error: error.message };
  return {};
}

// ============================================
// Status transitions
// ============================================

export async function pauseAgreement(id: string): Promise<{ error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  const { error } = await supabase
    .from("service_agreements")
    .update({ status: "paused", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("vendor_org_id", vendor_org_id)
    .eq("status", "active");

  if (error) return { error: error.message };
  return {};
}

export async function resumeAgreement(id: string): Promise<{ error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  const { error } = await supabase
    .from("service_agreements")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("vendor_org_id", vendor_org_id)
    .eq("status", "paused");

  if (error) return { error: error.message };
  return {};
}

export async function cancelAgreement(id: string): Promise<{ error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  const { error } = await supabase
    .from("service_agreements")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("vendor_org_id", vendor_org_id)
    .in("status", ["active", "paused"]);

  if (error) return { error: error.message };
  return {};
}

// ============================================
// Generate WO from Agreement
// ============================================

/**
 * Creates a work order from a service agreement and advances the next_due date.
 * Used both from the cron job and manual trigger.
 */
export async function generateWoFromAgreement(
  agreementId: string,
  /** Pass service-role supabase client from cron, or omit for user-context */
  serviceClient?: ReturnType<typeof import("@supabase/supabase-js").createClient>
): Promise<{ woId?: string; error?: string }> {
  // If called from user context, use requireVendorRole
  let vendorOrgId: string;
  let supabase: Awaited<ReturnType<typeof createClient>>;

  if (serviceClient) {
    // Cron context — use service client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase = serviceClient as any;
    const { data: agreement } = await supabase
      .from("service_agreements")
      .select("vendor_org_id")
      .eq("id", agreementId)
      .single();
    if (!agreement) return { error: "Agreement not found" };
    vendorOrgId = agreement.vendor_org_id;
  } else {
    const auth = await requireVendorRole();
    vendorOrgId = auth.vendor_org_id;
    supabase = await createClient();
  }

  // Fetch agreement details
  const { data: agreement, error: agErr } = await supabase
    .from("service_agreements")
    .select("*")
    .eq("id", agreementId)
    .eq("vendor_org_id", vendorOrgId)
    .single();

  if (agErr || !agreement) return { error: "Agreement not found" };
  if (agreement.status !== "active") return { error: "Agreement is not active" };

  // Check if past end_date
  if (agreement.end_date) {
    const endDate = new Date(agreement.end_date + "T23:59:59");
    if (endDate < new Date()) {
      // Auto-expire
      await supabase
        .from("service_agreements")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", agreementId);
      return { error: "Agreement has expired" };
    }
  }

  // Create the work order
  const { data: wo, error: woErr } = await supabase
    .from("vendor_work_orders")
    .insert({
      vendor_org_id: vendorOrgId,
      pm_user_id: agreement.pm_user_id,
      homeowner_id: agreement.homeowner_id,
      homeowner_property_id: agreement.homeowner_property_id,
      property_name: agreement.property_name ?? "Service Agreement",
      description: `[Auto] ${agreement.service_type}: ${agreement.description ?? agreement.trade}`,
      trade: agreement.trade,
      priority: "normal",
      status: "assigned",
      budget_type: "nte",
      budget_amount: agreement.price,
      scheduled_date: agreement.next_due,
      source: "agreement",
    })
    .select("id")
    .single();

  if (woErr) return { error: woErr.message };

  // Advance next_due
  const currentDue = agreement.next_due
    ? new Date(agreement.next_due + "T00:00:00")
    : new Date();
  const nextDue = advanceDate(currentDue, agreement.frequency as AgreementFrequency);

  await supabase
    .from("service_agreements")
    .update({
      next_due: nextDue.toISOString().split("T")[0],
      last_generated: new Date().toISOString().split("T")[0],
      updated_at: new Date().toISOString(),
    })
    .eq("id", agreementId);

  return { woId: wo?.id };
}

// ============================================
// Summary stats
// ============================================

export async function getAgreementSummary(): Promise<{
  active: number;
  paused: number;
  totalMonthlyRevenue: number;
  error?: string;
}> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("service_agreements")
    .select("status, price, frequency")
    .eq("vendor_org_id", vendor_org_id)
    .in("status", ["active", "paused"]);

  if (error) return { active: 0, paused: 0, totalMonthlyRevenue: 0, error: error.message };

  let active = 0;
  let paused = 0;
  let monthlyRevenue = 0;

  for (const a of data ?? []) {
    if (a.status === "active") active++;
    if (a.status === "paused") paused++;

    // Normalize price to monthly equivalent
    const price = Number(a.price) || 0;
    switch (a.frequency as AgreementFrequency) {
      case "weekly": monthlyRevenue += price * 4.33; break;
      case "biweekly": monthlyRevenue += price * 2.17; break;
      case "monthly": monthlyRevenue += price; break;
      case "quarterly": monthlyRevenue += price / 3; break;
      case "semi_annual": monthlyRevenue += price / 6; break;
      case "annual": monthlyRevenue += price / 12; break;
    }
  }

  return { active, paused, totalMonthlyRevenue: Math.round(monthlyRevenue * 100) / 100 };
}
