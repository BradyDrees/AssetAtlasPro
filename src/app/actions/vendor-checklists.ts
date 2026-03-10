"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole } from "@/lib/vendor/role-helpers";
import { logActivity } from "@/lib/vendor/role-helpers";
import { emitEvent } from "@/lib/platform/domain-events";
import { randomUUID } from "crypto";

const uuidv4 = () => randomUUID();

// ============================================
// Types
// ============================================

export interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  photo_url: string | null;
  notes: string | null;
  sort_order: number;
}

export interface ChecklistTemplate {
  id: string;
  vendor_org_id: string;
  name: string;
  trade: string | null;
  items: ChecklistItem[];
  schema_version: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface WoChecklist {
  id: string;
  work_order_id: string;
  template_id: string | null;
  template_version: number;
  items: ChecklistItem[];
  completed_count: number;
  total_count: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// Template CRUD
// ============================================

export async function getChecklistTemplates(): Promise<{
  data: ChecklistTemplate[];
  error?: string;
}> {
  const auth = await requireVendorRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_checklist_templates")
    .select("*")
    .eq("vendor_org_id", auth.vendor_org_id)
    .order("created_at", { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as ChecklistTemplate[] };
}

export async function createChecklistTemplate(input: {
  name: string;
  trade?: string;
  items: Array<{ label: string; required: boolean }>;
  is_default?: boolean;
}): Promise<{ data?: ChecklistTemplate; error?: string }> {
  const auth = await requireVendorRole();
  if (!["owner", "admin"].includes(auth.role)) {
    return { error: "Only admins can manage templates" };
  }
  const supabase = await createClient();

  const checklistItems: ChecklistItem[] = input.items.map((item, idx) => ({
    id: uuidv4(),
    label: item.label,
    required: item.required,
    completed: false,
    completed_at: null,
    completed_by: null,
    photo_url: null,
    notes: null,
    sort_order: idx,
  }));

  // If setting as default, unset other defaults for this trade
  if (input.is_default && input.trade) {
    await supabase
      .from("vendor_checklist_templates")
      .update({ is_default: false })
      .eq("vendor_org_id", auth.vendor_org_id)
      .eq("trade", input.trade)
      .eq("is_default", true);
  }

  const { data, error } = await supabase
    .from("vendor_checklist_templates")
    .insert({
      vendor_org_id: auth.vendor_org_id,
      name: input.name,
      trade: input.trade ?? null,
      items: checklistItems,
      is_default: input.is_default ?? false,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  logActivity({
    entityType: "checklist_template",
    entityId: data.id,
    action: "created",
    newValue: input.name,
  }).catch(() => {});

  return { data: data as ChecklistTemplate };
}

export async function updateChecklistTemplate(
  templateId: string,
  input: {
    name?: string;
    trade?: string;
    items?: Array<{ id?: string; label: string; required: boolean }>;
    is_default?: boolean;
  }
): Promise<{ error?: string }> {
  const auth = await requireVendorRole();
  if (!["owner", "admin"].includes(auth.role)) {
    return { error: "Only admins can manage templates" };
  }
  const supabase = await createClient();

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updatePayload.name = input.name;
  if (input.trade !== undefined) updatePayload.trade = input.trade;
  if (input.is_default !== undefined) updatePayload.is_default = input.is_default;

  if (input.items) {
    const checklistItems: ChecklistItem[] = input.items.map((item, idx) => ({
      id: item.id ?? uuidv4(),
      label: item.label,
      required: item.required,
      completed: false,
      completed_at: null,
      completed_by: null,
      photo_url: null,
      notes: null,
      sort_order: idx,
    }));
    updatePayload.items = checklistItems;
  }

  // If setting as default, unset others for same trade
  if (input.is_default) {
    const trade = input.trade;
    if (trade) {
      await supabase
        .from("vendor_checklist_templates")
        .update({ is_default: false })
        .eq("vendor_org_id", auth.vendor_org_id)
        .eq("trade", trade)
        .eq("is_default", true)
        .neq("id", templateId);
    }
  }

  const { error } = await supabase
    .from("vendor_checklist_templates")
    .update(updatePayload)
    .eq("id", templateId)
    .eq("vendor_org_id", auth.vendor_org_id);

  if (error) return { error: error.message };
  return {};
}

export async function deleteChecklistTemplate(
  templateId: string
): Promise<{ error?: string }> {
  const auth = await requireVendorRole();
  if (!["owner", "admin"].includes(auth.role)) {
    return { error: "Only admins can manage templates" };
  }
  const supabase = await createClient();

  const { error } = await supabase
    .from("vendor_checklist_templates")
    .delete()
    .eq("id", templateId)
    .eq("vendor_org_id", auth.vendor_org_id);

  if (error) return { error: error.message };
  return {};
}

// ============================================
// WO Checklist Operations
// ============================================

/**
 * Get the checklist for a work order.
 * Returns null if no checklist is attached.
 */
export async function getWoChecklist(
  woId: string
): Promise<{ data: WoChecklist | null; error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_wo_checklists")
    .select("*")
    .eq("work_order_id", woId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: data as WoChecklist | null };
}

/**
 * Auto-apply the default checklist template for a WO's trade.
 * Called on WO creation or when manually triggered.
 */
export async function autoApplyChecklist(
  woId: string,
  trade?: string
): Promise<{ data?: WoChecklist; error?: string }> {
  const auth = await requireVendorRole();
  const supabase = await createClient();

  // Check if WO already has a checklist
  const { data: existing } = await supabase
    .from("vendor_wo_checklists")
    .select("id")
    .eq("work_order_id", woId)
    .maybeSingle();

  if (existing) {
    return { error: "Checklist already exists for this work order" };
  }

  // Find default template for this trade
  let query = supabase
    .from("vendor_checklist_templates")
    .select("*")
    .eq("vendor_org_id", auth.vendor_org_id)
    .eq("is_default", true);

  if (trade) {
    query = query.eq("trade", trade);
  }

  const { data: template } = await query.maybeSingle();

  if (!template) {
    return { error: "No default checklist template found for this trade" };
  }

  // Create WO checklist from template
  const items = (template.items as ChecklistItem[]).map((item) => ({
    ...item,
    id: uuidv4(), // New IDs for WO instance
    completed: false,
    completed_at: null,
    completed_by: null,
    photo_url: null,
    notes: null,
  }));

  const { data: checklist, error } = await supabase
    .from("vendor_wo_checklists")
    .insert({
      work_order_id: woId,
      template_id: template.id,
      template_version: template.schema_version,
      items,
      completed_count: 0,
      total_count: items.length,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: checklist as WoChecklist };
}

/**
 * Manually create a checklist for a WO from a specific template.
 */
export async function applyTemplateToWo(
  woId: string,
  templateId: string
): Promise<{ data?: WoChecklist; error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  // Check if WO already has a checklist
  const { data: existing } = await supabase
    .from("vendor_wo_checklists")
    .select("id")
    .eq("work_order_id", woId)
    .maybeSingle();

  if (existing) {
    // Delete existing and replace
    await supabase
      .from("vendor_wo_checklists")
      .delete()
      .eq("id", existing.id);
  }

  // Fetch template
  const { data: template } = await supabase
    .from("vendor_checklist_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (!template) return { error: "Template not found" };

  const items = (template.items as ChecklistItem[]).map((item) => ({
    ...item,
    id: uuidv4(),
    completed: false,
    completed_at: null,
    completed_by: null,
    photo_url: null,
    notes: null,
  }));

  const { data: checklist, error } = await supabase
    .from("vendor_wo_checklists")
    .insert({
      work_order_id: woId,
      template_id: template.id,
      template_version: template.schema_version,
      items,
      completed_count: 0,
      total_count: items.length,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: checklist as WoChecklist };
}

/**
 * Toggle a checklist item's completion status.
 */
export async function toggleChecklistItem(
  woId: string,
  itemId: string
): Promise<{ error?: string }> {
  const auth = await requireVendorRole();
  const supabase = await createClient();

  const { data: checklist, error: fetchErr } = await supabase
    .from("vendor_wo_checklists")
    .select("*")
    .eq("work_order_id", woId)
    .single();

  if (fetchErr || !checklist) return { error: "Checklist not found" };

  const items = (checklist.items as ChecklistItem[]).map((item) => {
    if (item.id !== itemId) return item;
    return {
      ...item,
      completed: !item.completed,
      completed_at: !item.completed ? new Date().toISOString() : null,
      completed_by: !item.completed ? auth.id : null,
    };
  });

  const completedCount = items.filter((i) => i.completed).length;

  const { error } = await supabase
    .from("vendor_wo_checklists")
    .update({
      items,
      completed_count: completedCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", checklist.id);

  if (error) return { error: error.message };

  // Emit event if all items completed
  if (completedCount === items.length) {
    emitEvent(
      "checklist.completed",
      "work_order",
      woId,
      {
        vendor_org_id: auth.vendor_org_id,
        work_order_id: woId,
        origin_module: "vendor",
        completed_count: completedCount,
        total_count: items.length,
      },
      { id: auth.id, type: "user" }
    ).catch(() => {});
  }

  return {};
}

/**
 * Update notes for a specific checklist item.
 */
export async function updateChecklistItemNotes(
  woId: string,
  itemId: string,
  notes: string
): Promise<{ error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  const { data: checklist, error: fetchErr } = await supabase
    .from("vendor_wo_checklists")
    .select("*")
    .eq("work_order_id", woId)
    .single();

  if (fetchErr || !checklist) return { error: "Checklist not found" };

  const items = (checklist.items as ChecklistItem[]).map((item) => {
    if (item.id !== itemId) return item;
    return { ...item, notes };
  });

  const { error } = await supabase
    .from("vendor_wo_checklists")
    .update({ items, updated_at: new Date().toISOString() })
    .eq("id", checklist.id);

  if (error) return { error: error.message };
  return {};
}

/**
 * Validate that all required checklist items are complete.
 * Called by state machine on completion transition.
 */
export async function validateChecklistCompletion(
  woId: string
): Promise<{ valid: boolean; error?: string; incompleteItems?: string[] }> {
  const supabase = await createClient();

  const { data: checklist } = await supabase
    .from("vendor_wo_checklists")
    .select("items")
    .eq("work_order_id", woId)
    .maybeSingle();

  // No checklist = no validation needed
  if (!checklist) return { valid: true };

  const items = checklist.items as ChecklistItem[];
  const incompleteRequired = items.filter(
    (item) => item.required && !item.completed
  );

  if (incompleteRequired.length > 0) {
    return {
      valid: false,
      error: "Required checklist items are incomplete",
      incompleteItems: incompleteRequired.map((i) => i.label),
    };
  }

  return { valid: true };
}

/**
 * Add a custom item to an existing WO checklist (not from template).
 */
export async function addCustomChecklistItem(
  woId: string,
  label: string,
  required: boolean = false
): Promise<{ error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  const { data: checklist, error: fetchErr } = await supabase
    .from("vendor_wo_checklists")
    .select("*")
    .eq("work_order_id", woId)
    .single();

  if (fetchErr || !checklist) return { error: "Checklist not found" };

  const items = checklist.items as ChecklistItem[];
  const newItem: ChecklistItem = {
    id: uuidv4(),
    label,
    required,
    completed: false,
    completed_at: null,
    completed_by: null,
    photo_url: null,
    notes: null,
    sort_order: items.length,
  };

  const { error } = await supabase
    .from("vendor_wo_checklists")
    .update({
      items: [...items, newItem],
      total_count: items.length + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", checklist.id);

  if (error) return { error: error.message };
  return {};
}

/**
 * Create a blank WO checklist (without template).
 */
export async function createBlankChecklist(
  woId: string
): Promise<{ data?: WoChecklist; error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("vendor_wo_checklists")
    .select("id")
    .eq("work_order_id", woId)
    .maybeSingle();

  if (existing) return { error: "Checklist already exists" };

  const { data, error } = await supabase
    .from("vendor_wo_checklists")
    .insert({
      work_order_id: woId,
      items: [],
      completed_count: 0,
      total_count: 0,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as WoChecklist };
}
