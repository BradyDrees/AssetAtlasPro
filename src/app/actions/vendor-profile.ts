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
