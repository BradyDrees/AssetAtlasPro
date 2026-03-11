"use server";

import { createClient } from "@/lib/supabase/server";
import { emitEvent } from "@/lib/platform/domain-events";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_SYSTEM_TYPES,
  type DocumentCategory,
  type DocumentSystemType,
  type HomeDocument,
} from "@/lib/home/document-types";

const ALLOWED_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

// ─── Get Documents ────────────────────────────────────────
export async function getDocuments(): Promise<{
  documents: HomeDocument[];
  expiringSoon: HomeDocument[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { documents: [], expiringSoon: [] };

  // Get user's property
  const { data: prop } = await supabase
    .from("homeowner_properties")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!prop) return { documents: [], expiringSoon: [] };

  const { data: docs } = await supabase
    .from("homeowner_documents")
    .select("*")
    .eq("property_id", prop.id)
    .order("created_at", { ascending: false });

  const allDocs = (docs ?? []) as HomeDocument[];

  // Expiring within 90 days
  const now = new Date();
  const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const expiringSoon = allDocs
    .filter(
      (d) =>
        d.expiration_date &&
        new Date(d.expiration_date) <= ninetyDays &&
        new Date(d.expiration_date) >= now
    )
    .sort(
      (a, b) =>
        new Date(a.expiration_date!).getTime() -
        new Date(b.expiration_date!).getTime()
    );

  return { documents: allDocs, expiringSoon };
}

// ─── Upload Document ──────────────────────────────────────
export async function uploadDocument(
  formData: FormData
): Promise<{ success: boolean; document?: HomeDocument; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const file = formData.get("file");
    if (!(file instanceof File)) return { success: false, error: "No file provided" };

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: "File too large. Max 25MB." };
    }

    // Validate mime type
    if (!ALLOWED_MIMES.includes(file.type)) {
      return { success: false, error: "Unsupported file type. Allowed: PDF, JPG, PNG, DOCX." };
    }

    const name = (formData.get("name") as string)?.trim();
    if (!name) return { success: false, error: "Name is required" };

    const category = formData.get("category") as string;
    if (!DOCUMENT_CATEGORIES.includes(category as DocumentCategory)) {
      return { success: false, error: "Invalid category" };
    }

    const description = (formData.get("description") as string) || null;
    const systemType = (formData.get("system_type") as string) || null;
    const expirationDate = (formData.get("expiration_date") as string) || null;

    // Validate system_type if provided
    if (systemType && !DOCUMENT_SYSTEM_TYPES.includes(systemType as DocumentSystemType)) {
      return { success: false, error: "Invalid system type" };
    }

    // Validate property ownership
    const { data: prop } = await supabase
      .from("homeowner_properties")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!prop) return { success: false, error: "No property found" };

    // Upload to storage
    const ext = file.name.split(".").pop() ?? "bin";
    const storagePath = `documents/${prop.id}/${category}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("dd-captures")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr) return { success: false, error: uploadErr.message };

    // Insert DB record
    const { data: doc, error: insertErr } = await supabase
      .from("homeowner_documents")
      .insert({
        property_id: prop.id,
        user_id: user.id,
        category,
        name,
        description,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        system_type: systemType,
        expiration_date: expirationDate,
      })
      .select("*")
      .single();

    if (insertErr) {
      // Rollback storage
      await supabase.storage.from("dd-captures").remove([storagePath]);
      return { success: false, error: insertErr.message };
    }

    // Emit domain event
    emitEvent(
      "document.uploaded",
      "document",
      doc.id,
      { origin_module: "home", property_id: prop.id, category },
      { id: user.id, type: "user" }
    );

    return { success: true, document: doc as HomeDocument };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong",
    };
  }
}

// ─── Update Document ──────────────────────────────────────
export async function updateDocument(
  docId: string,
  updates: {
    name?: string;
    description?: string | null;
    category?: DocumentCategory;
    system_type?: DocumentSystemType | null;
    expiration_date?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Validate ownership through property
    const { data: doc } = await supabase
      .from("homeowner_documents")
      .select("id, property_id")
      .eq("id", docId)
      .single();

    if (!doc) return { success: false, error: "Document not found" };

    const { data: prop } = await supabase
      .from("homeowner_properties")
      .select("user_id")
      .eq("id", doc.property_id)
      .single();

    if (prop?.user_id !== user.id) return { success: false, error: "Unauthorized" };

    const { error } = await supabase
      .from("homeowner_documents")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", docId);

    if (error) return { success: false, error: error.message };

    emitEvent(
      "document.updated",
      "document",
      docId,
      { origin_module: "home", property_id: doc.property_id },
      { id: user.id, type: "user" }
    );

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong",
    };
  }
}

// ─── Delete Document ──────────────────────────────────────
export async function deleteDocument(
  docId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Validate ownership through property
    const { data: doc } = await supabase
      .from("homeowner_documents")
      .select("id, property_id, storage_path")
      .eq("id", docId)
      .single();

    if (!doc) return { success: false, error: "Document not found" };

    const { data: prop } = await supabase
      .from("homeowner_properties")
      .select("user_id")
      .eq("id", doc.property_id)
      .single();

    if (prop?.user_id !== user.id) return { success: false, error: "Unauthorized" };

    // Delete storage first — if fails, abort
    const { error: storageErr } = await supabase.storage
      .from("dd-captures")
      .remove([doc.storage_path]);

    if (storageErr) return { success: false, error: storageErr.message };

    // Delete DB row
    const { error: dbErr } = await supabase
      .from("homeowner_documents")
      .delete()
      .eq("id", docId);

    if (dbErr) return { success: false, error: dbErr.message };

    emitEvent(
      "document.deleted",
      "document",
      docId,
      { origin_module: "home", property_id: doc.property_id },
      { id: user.id, type: "user" }
    );

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong",
    };
  }
}

// ─── Get Document URL (signed) ────────────────────────────
export async function getDocumentUrl(
  docId: string
): Promise<{ url: string | null; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { url: null, error: "Not authenticated" };

  const { data: doc } = await supabase
    .from("homeowner_documents")
    .select("storage_path, property_id")
    .eq("id", docId)
    .single();

  if (!doc) return { url: null, error: "Document not found" };

  // Verify ownership
  const { data: prop } = await supabase
    .from("homeowner_properties")
    .select("user_id")
    .eq("id", doc.property_id)
    .single();

  if (prop?.user_id !== user.id) return { url: null, error: "Unauthorized" };

  const { data: signed } = await supabase.storage
    .from("dd-captures")
    .createSignedUrl(doc.storage_path, 3600); // 1 hour

  return { url: signed?.signedUrl ?? null };
}
