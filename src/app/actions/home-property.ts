"use server";

import { createClient } from "@/lib/supabase/server";
import {
  VALID_SYSTEM_TYPES,
  type SystemType,
  type PropertySystemPhotoRow,
} from "@/lib/home/system-types";

function assertSystemType(v: string): asserts v is SystemType {
  if (!VALID_SYSTEM_TYPES.includes(v as SystemType)) {
    throw new Error("Invalid system type");
  }
}

// ─── Property update types ────────────────────────────────
interface UpdatePropertyInput {
  id: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  property_type?: string;
  year_built?: number | null;
  sqft?: number | null;
  beds?: number | null;
  baths?: number | null;
  hvac_model?: string;
  hvac_age?: number | null;
  water_heater_type?: string;
  water_heater_age?: number | null;
  electrical_panel?: string;
  roof_material?: string;
  roof_age?: number | null;
  gate_code?: string;
  lockbox_code?: string;
  alarm_code?: string;
  pet_warnings?: string;
  parking_instructions?: string;
}

/**
 * Update a homeowner property record.
 */
export async function updateProperty(
  input: UpdatePropertyInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { id, ...updates } = input;

    const { error } = await supabase
      .from("homeowner_properties")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong",
    };
  }
}

/**
 * Get the current user's property.
 */
export async function getMyProperty() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("homeowner_properties")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return data;
}

// ─── System Photo Actions ─────────────────────────────────

/**
 * Fetch all system photos for a property, grouped by system_type.
 */
export async function getSystemPhotos(propertyId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("property_system_photos")
    .select(
      "id, property_id, system_type, storage_path, caption, sort_order, created_at, source"
    )
    .eq("property_id", propertyId)
    .order("system_type", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const grouped = {} as Record<SystemType, PropertySystemPhotoRow[]>;
  for (const row of (data ?? []) as PropertySystemPhotoRow[]) {
    const t = row.system_type as SystemType;
    (grouped[t] ||= []).push(row);
  }
  return grouped;
}

/**
 * Upload a system photo. File should arrive pre-compressed from the client.
 * Storage path: systems/{propertyId}/{systemType}/{uuid}.jpg
 */
export async function uploadSystemPhoto(
  propertyId: string,
  systemTypeRaw: string,
  formData: FormData
): Promise<PropertySystemPhotoRow> {
  assertSystemType(systemTypeRaw);
  const systemType = systemTypeRaw as SystemType;

  const supabase = await createClient();

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No file provided");

  const caption = (formData.get("caption") as string | null) ?? null;

  const filename = `${crypto.randomUUID()}.jpg`;
  const storagePath = `systems/${propertyId}/${systemType}/${filename}`;

  const { error: upErr } = await supabase.storage
    .from("dd-captures")
    .upload(storagePath, file, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (upErr) throw upErr;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: row, error: insErr } = await supabase
    .from("property_system_photos")
    .insert({
      property_id: propertyId,
      system_type: systemType,
      uploaded_by: user.id,
      storage_path: storagePath,
      caption,
      source: "homeowner",
      sort_order: 0,
    })
    .select(
      "id, property_id, system_type, storage_path, caption, sort_order, created_at, source"
    )
    .single();

  if (insErr) {
    // Rollback storage upload
    await supabase.storage.from("dd-captures").remove([storagePath]);
    throw insErr;
  }

  return row as PropertySystemPhotoRow;
}

/**
 * Delete a system photo — removes from storage then DB.
 */
export async function deleteSystemPhoto(
  photoId: string
): Promise<{ ok: true }> {
  const supabase = await createClient();

  const { data: photo, error: selErr } = await supabase
    .from("property_system_photos")
    .select("id, storage_path")
    .eq("id", photoId)
    .single();

  if (selErr) throw selErr;

  const { error: delStorageErr } = await supabase.storage
    .from("dd-captures")
    .remove([photo.storage_path]);

  if (delStorageErr) throw delStorageErr;

  const { error: delDbErr } = await supabase
    .from("property_system_photos")
    .delete()
    .eq("id", photoId);

  if (delDbErr) throw delDbErr;

  return { ok: true };
}

/**
 * Count system photos for a property (for wizard encouragement banner).
 */
export async function getSystemPhotoCount(
  propertyId: string
): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("property_system_photos")
    .select("*", { count: "exact", head: true })
    .eq("property_id", propertyId);

  if (error) throw error;
  return count ?? 0;
}
