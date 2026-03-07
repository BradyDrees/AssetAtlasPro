"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole, logActivity } from "@/lib/vendor/role-helpers";
import type {
  VendorOrganization,
  VendorUser,
  VendorCredential,
  CreateCredentialInput,
  UpdateCredentialInput,
  UpdateVendorOrgInput,
} from "@/lib/vendor/types";

// ============================================
// Profile Queries
// ============================================

/** Get the current vendor's organization profile */
export async function getVendorProfile(): Promise<{
  org: VendorOrganization | null;
  user: VendorUser | null;
  error?: string;
}> {
  const auth = await requireVendorRole();
  const supabase = await createClient();

  const [orgResult, userResult] = await Promise.all([
    supabase
      .from("vendor_organizations")
      .select("*")
      .eq("id", auth.vendor_org_id)
      .single(),
    supabase
      .from("vendor_users")
      .select("*")
      .eq("id", auth.id)
      .single(),
  ]);

  if (orgResult.error) {
    return { org: null, user: null, error: orgResult.error.message };
  }

  return {
    org: orgResult.data as VendorOrganization,
    user: userResult.data as VendorUser | null,
  };
}

// ============================================
// Profile Updates
// ============================================

/** Update the vendor organization details */
export async function updateVendorOrg(
  input: UpdateVendorOrgInput
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireVendorRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Only owner/admin can edit org
  if (auth.role !== "owner" && auth.role !== "admin") {
    return { success: false, error: "Only owner or admin can update organization" };
  }

  const { error } = await supabase
    .from("vendor_organizations")
    .update({
      ...input,
      updated_by: user?.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", auth.vendor_org_id);

  if (error) {
    return { success: false, error: error.message };
  }

  await logActivity({
    entityType: "vendor_org",
    entityId: auth.vendor_org_id,
    action: "profile_updated",
    metadata: { fields: Object.keys(input) },
  });

  return { success: true };
}

/** Update the current vendor user's personal info */
export async function updateVendorUser(input: {
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  trades?: string[];
}): Promise<{ success: boolean; error?: string }> {
  const auth = await requireVendorRole();
  const supabase = await createClient();

  const { error } = await supabase
    .from("vendor_users")
    .update(input)
    .eq("id", auth.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================
// Credential Queries
// ============================================

/** Get all credentials for the vendor org */
export async function getVendorCredentials(): Promise<{
  data: VendorCredential[];
  error?: string;
}> {
  const auth = await requireVendorRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_credentials")
    .select("*")
    .eq("vendor_org_id", auth.vendor_org_id)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as VendorCredential[] };
}

/** Get a single credential by ID */
export async function getCredentialDetail(credentialId: string): Promise<{
  credential: VendorCredential | null;
  error?: string;
}> {
  await requireVendorRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_credentials")
    .select("*")
    .eq("id", credentialId)
    .single();

  if (error) {
    return { credential: null, error: error.message };
  }

  return { credential: data as VendorCredential };
}

// ============================================
// Credential CRUD
// ============================================

/** Create a new credential (without file initially) */
export async function createCredential(
  input: CreateCredentialInput
): Promise<{ credential: VendorCredential | null; error?: string }> {
  const auth = await requireVendorRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Validate issued_date < expiration_date when both provided
  if (input.issued_date && input.expiration_date && input.issued_date >= input.expiration_date) {
    return { credential: null, error: "Issued date must be before expiration date" };
  }

  const { data, error } = await supabase
    .from("vendor_credentials")
    .insert({
      vendor_org_id: auth.vendor_org_id,
      type: input.type,
      name: input.name,
      document_number: input.document_number ?? null,
      issued_date: input.issued_date ?? null,
      expiration_date: input.expiration_date ?? null,
      notes: input.notes ?? null,
      uploaded_by: user?.id,
    })
    .select()
    .single();

  if (error) {
    return { credential: null, error: error.message };
  }

  await logActivity({
    entityType: "credential",
    entityId: data.id,
    action: "created",
    newValue: input.type,
    metadata: { name: input.name },
  });

  return { credential: data as VendorCredential };
}

/** Update a credential's metadata */
export async function updateCredential(
  credentialId: string,
  input: UpdateCredentialInput
): Promise<{ success: boolean; error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  // Validate issued_date < expiration_date when both provided in update
  if (input.issued_date && input.expiration_date && input.issued_date >= input.expiration_date) {
    return { success: false, error: "Issued date must be before expiration date" };
  }

  // If only one date provided, fetch the other to cross-validate
  if ((input.issued_date && !input.expiration_date) || (!input.issued_date && input.expiration_date)) {
    const { data: existing } = await supabase
      .from("vendor_credentials")
      .select("issued_date, expiration_date")
      .eq("id", credentialId)
      .single();

    if (existing) {
      const issued = input.issued_date ?? existing.issued_date;
      const expiration = input.expiration_date ?? existing.expiration_date;
      if (issued && expiration && issued >= expiration) {
        return { success: false, error: "Issued date must be before expiration date" };
      }
    }
  }

  const { error } = await supabase
    .from("vendor_credentials")
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq("id", credentialId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logActivity({
    entityType: "credential",
    entityId: credentialId,
    action: "updated",
    metadata: { fields: Object.keys(input) },
  });

  return { success: true };
}

/** Delete a credential (and its storage file) */
export async function deleteCredential(
  credentialId: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireVendorRole();
  const supabase = await createClient();

  // Get the credential first to find the storage path
  const { data: cred } = await supabase
    .from("vendor_credentials")
    .select("storage_path")
    .eq("id", credentialId)
    .single();

  // Delete the file from storage if it exists
  if (cred?.storage_path) {
    await supabase.storage
      .from("vendor-uploads")
      .remove([cred.storage_path]);
  }

  // Delete the credential record
  const { error } = await supabase
    .from("vendor_credentials")
    .delete()
    .eq("id", credentialId)
    .eq("vendor_org_id", auth.vendor_org_id);

  if (error) {
    return { success: false, error: error.message };
  }

  await logActivity({
    entityType: "credential",
    entityId: credentialId,
    action: "deleted",
  });

  return { success: true };
}

/** Upload a file for a credential */
export async function uploadCredentialFile(
  credentialId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireVendorRole();
  const supabase = await createClient();

  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, error: "No file provided" };
  }

  // Storage path: vendor-uploads/{org_id}/credentials/{cred_id}/filename
  const ext = file.name.split(".").pop() ?? "pdf";
  const storagePath = `${auth.vendor_org_id}/credentials/${credentialId}/document.${ext}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from("vendor-uploads")
    .upload(storagePath, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  // Update the credential record with file info
  const { error: updateError } = await supabase
    .from("vendor_credentials")
    .update({
      storage_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      updated_at: new Date().toISOString(),
    })
    .eq("id", credentialId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  await logActivity({
    entityType: "credential",
    entityId: credentialId,
    action: "file_uploaded",
    metadata: { file_name: file.name, file_size: file.size },
  });

  return { success: true };
}

/** Revoke a credential */
export async function revokeCredential(
  credentialId: string
): Promise<{ success: boolean; error?: string }> {
  await requireVendorRole();
  const supabase = await createClient();

  const { error } = await supabase
    .from("vendor_credentials")
    .update({
      status: "revoked",
      updated_at: new Date().toISOString(),
    })
    .eq("id", credentialId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logActivity({
    entityType: "credential",
    entityId: credentialId,
    action: "revoked",
  });

  return { success: true };
}

// ============================================
// Logo Upload
// ============================================

/** Upload vendor org logo */
export async function uploadOrgLogo(
  formData: FormData
): Promise<{ url: string | null; error?: string }> {
  const auth = await requireVendorRole();
  const supabase = await createClient();

  if (auth.role !== "owner" && auth.role !== "admin") {
    return { url: null, error: "Only owner or admin can upload logo" };
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return { url: null, error: "No file provided" };
  }

  const ext = file.name.split(".").pop() ?? "png";
  const storagePath = `${auth.vendor_org_id}/logos/logo.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("vendor-uploads")
    .upload(storagePath, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    return { url: null, error: uploadError.message };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("vendor-uploads")
    .getPublicUrl(storagePath);

  // Update org with logo URL
  await supabase
    .from("vendor_organizations")
    .update({
      logo_url: urlData.publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", auth.vendor_org_id);

  await logActivity({
    entityType: "vendor_org",
    entityId: auth.vendor_org_id,
    action: "logo_uploaded",
  });

  return { url: urlData.publicUrl };
}

// ============================================
// Org Settings (Workiz Enhancement)
// ============================================

import type { VendorOrgSettings } from "@/lib/vendor/types";
import { DEFAULT_ORG_SETTINGS } from "@/lib/vendor/types";

/** Get org settings (parsed from JSONB) */
export async function getOrgSettings(): Promise<{
  settings: VendorOrgSettings;
  error?: string;
}> {
  const auth = await requireVendorRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_organizations")
    .select("settings")
    .eq("id", auth.vendor_org_id)
    .single();

  if (error) return { settings: DEFAULT_ORG_SETTINGS, error: error.message };

  const raw = data?.settings as Record<string, unknown> | null;
  if (!raw) return { settings: DEFAULT_ORG_SETTINGS };

  // Merge with defaults to fill missing keys
  const merged: VendorOrgSettings = {
    settings_version: (raw.settings_version as number) ?? DEFAULT_ORG_SETTINGS.settings_version,
    numbering: {
      ...DEFAULT_ORG_SETTINGS.numbering,
      ...(raw.numbering as Record<string, unknown> ?? {}),
    } as VendorOrgSettings["numbering"],
    tax_rates: (raw.tax_rates as VendorOrgSettings["tax_rates"]) ?? DEFAULT_ORG_SETTINGS.tax_rates,
    job_types: (raw.job_types as string[]) ?? DEFAULT_ORG_SETTINGS.job_types,
    sub_statuses: (raw.sub_statuses as string[]) ?? DEFAULT_ORG_SETTINGS.sub_statuses,
    working_hours: {
      ...DEFAULT_ORG_SETTINGS.working_hours,
      ...(raw.working_hours as Record<string, unknown> ?? {}),
    } as VendorOrgSettings["working_hours"],
    auto_show_estimate: (raw.auto_show_estimate as boolean) ?? DEFAULT_ORG_SETTINGS.auto_show_estimate,
    custom_field_schemas: {
      ...DEFAULT_ORG_SETTINGS.custom_field_schemas,
      ...(raw.custom_field_schemas as Record<string, unknown> ?? {}),
    } as VendorOrgSettings["custom_field_schemas"],
  };

  return { settings: merged };
}

/** Update org settings — ATOMIC replacement, validates full VendorOrgSettings */
export async function updateOrgSettings(
  settings: VendorOrgSettings
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireVendorRole();

  if (!["owner", "admin", "office_manager"].includes(auth.role)) {
    return { success: false, error: "Only owner, admin, or office manager can update settings" };
  }

  // Validate settings
  if (!settings.settings_version || typeof settings.settings_version !== "number") {
    return { success: false, error: "Invalid settings_version" };
  }
  if (!Array.isArray(settings.job_types)) {
    return { success: false, error: "job_types must be an array" };
  }
  if (!Array.isArray(settings.sub_statuses)) {
    return { success: false, error: "sub_statuses must be an array" };
  }
  if (!Array.isArray(settings.tax_rates)) {
    return { success: false, error: "tax_rates must be an array" };
  }
  if (!settings.numbering || !settings.numbering.estimate_prefix || !settings.numbering.invoice_prefix) {
    return { success: false, error: "Invalid numbering config" };
  }
  if (!settings.working_hours || !settings.working_hours.start || !settings.working_hours.end) {
    return { success: false, error: "Invalid working hours" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("vendor_organizations")
    .update({
      settings: settings as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    })
    .eq("id", auth.vendor_org_id);

  if (error) return { success: false, error: error.message };

  await logActivity({
    entityType: "vendor_org",
    entityId: auth.vendor_org_id,
    action: "settings_updated",
    metadata: { settings_version: settings.settings_version },
  });

  return { success: true };
}

// ============================================
// Credential Summary (for dashboard widget)
// ============================================

export async function getCredentialSummary(): Promise<{
  total: number;
  active: number;
  expiringSoon: number;
  expired: number;
}> {
  const auth = await requireVendorRole();
  const supabase = await createClient();

  const { data } = await supabase
    .from("vendor_credentials")
    .select("status")
    .eq("vendor_org_id", auth.vendor_org_id);

  const creds = data ?? [];
  return {
    total: creds.length,
    active: creds.filter((c) => c.status === "active").length,
    expiringSoon: creds.filter((c) => c.status === "expiring_soon").length,
    expired: creds.filter((c) => c.status === "expired").length,
  };
}
