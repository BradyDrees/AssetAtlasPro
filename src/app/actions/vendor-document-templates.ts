"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole, logActivity } from "@/lib/vendor/role-helpers";
import type {
  VendorDocumentTemplate,
  CreateDocumentTemplateInput,
  UpdateDocumentTemplateInput,
} from "@/lib/vendor/expense-types";

// ============================================
// Document Template CRUD
// ============================================

export async function getDocumentTemplates(filters?: {
  type?: string;
}): Promise<{ data: VendorDocumentTemplate[]; error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  let query = supabase
    .from("vendor_document_templates")
    .select("*")
    .eq("vendor_org_id", vendor_org_id)
    .order("type", { ascending: true })
    .order("name", { ascending: true });

  if (filters?.type) {
    query = query.eq("type", filters.type);
  }

  const { data, error } = await query;
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as VendorDocumentTemplate[] };
}

export async function getDocumentTemplate(
  templateId: string
): Promise<{ template: VendorDocumentTemplate | null; error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_document_templates")
    .select("*")
    .eq("id", templateId)
    .eq("vendor_org_id", vendor_org_id)
    .single();

  if (error) return { template: null, error: error.message };
  return { template: data as VendorDocumentTemplate };
}

export async function createDocumentTemplate(
  input: CreateDocumentTemplateInput
): Promise<{ template: VendorDocumentTemplate | null; error?: string }> {
  const { vendor_org_id, role } = await requireVendorRole();
  if (!["owner", "admin", "office_manager"].includes(role)) {
    return { template: null, error: "Insufficient permissions" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (input.is_default) {
    await supabase
      .from("vendor_document_templates")
      .update({ is_default: false })
      .eq("vendor_org_id", vendor_org_id)
      .eq("type", input.type)
      .eq("is_default", true);
  }

  const { data, error } = await supabase
    .from("vendor_document_templates")
    .insert({
      vendor_org_id,
      name: input.name.trim(),
      type: input.type,
      content: input.content,
      is_default: input.is_default ?? false,
      created_by: user?.id,
    })
    .select()
    .single();

  if (error) return { template: null, error: error.message };

  await logActivity({
    entityType: "vendor_org",
    entityId: vendor_org_id,
    action: "template_created",
    newValue: input.name,
    metadata: { type: input.type, is_default: input.is_default },
  });

  return { template: data as VendorDocumentTemplate };
}

export async function updateDocumentTemplate(
  templateId: string,
  input: UpdateDocumentTemplateInput
): Promise<{ success: boolean; error?: string }> {
  const { vendor_org_id, role } = await requireVendorRole();
  if (!["owner", "admin", "office_manager"].includes(role)) {
    return { success: false, error: "Insufficient permissions" };
  }

  const supabase = await createClient();

  if (input.is_default) {
    const type = input.type;
    if (type) {
      await supabase
        .from("vendor_document_templates")
        .update({ is_default: false })
        .eq("vendor_org_id", vendor_org_id)
        .eq("type", type)
        .eq("is_default", true);
    } else {
      const { data: current } = await supabase
        .from("vendor_document_templates")
        .select("type")
        .eq("id", templateId)
        .single();
      if (current) {
        await supabase
          .from("vendor_document_templates")
          .update({ is_default: false })
          .eq("vendor_org_id", vendor_org_id)
          .eq("type", current.type)
          .eq("is_default", true);
      }
    }
  }

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name.trim();
  if (input.type !== undefined) updateData.type = input.type;
  if (input.content !== undefined) updateData.content = input.content;
  if (input.is_default !== undefined) updateData.is_default = input.is_default;

  const { error } = await supabase
    .from("vendor_document_templates")
    .update(updateData)
    .eq("id", templateId)
    .eq("vendor_org_id", vendor_org_id);

  if (error) return { success: false, error: error.message };

  await logActivity({
    entityType: "vendor_org",
    entityId: vendor_org_id,
    action: "template_updated",
    metadata: { templateId, fields: Object.keys(input) },
  });

  return { success: true };
}

export async function deleteDocumentTemplate(
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  const { vendor_org_id, role } = await requireVendorRole();
  if (!["owner", "admin", "office_manager"].includes(role)) {
    return { success: false, error: "Insufficient permissions" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("vendor_document_templates")
    .delete()
    .eq("id", templateId)
    .eq("vendor_org_id", vendor_org_id);

  if (error) return { success: false, error: error.message };

  await logActivity({
    entityType: "vendor_org",
    entityId: vendor_org_id,
    action: "template_deleted",
    metadata: { templateId },
  });

  return { success: true };
}
