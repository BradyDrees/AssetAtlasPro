"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CreateBatch, AddUnitToBatch, CreateNote } from "@/lib/unit-turn-types";

// ============================================
// Batch CRUD
// ============================================

export async function createBatch(data: CreateBatch): Promise<{ id?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { data: batch, error } = await supabase
      .from("unit_turn_batches")
      .insert({
        owner_id: user.id,
        name: data.name.trim(),
        month: data.month || null,
      })
      .select("id")
      .single();

    if (error) return { error: error.message };

    revalidatePath("/unit-turns");
    return { id: batch.id };
  } catch (err) {
    return { error: "Unexpected: " + (err instanceof Error ? err.message : String(err)) };
  }
}

export async function updateBatch(
  batchId: string,
  field: string,
  value: string | null
): Promise<{ error?: string }> {
  const allowed = new Set(["name", "month", "status"]);
  if (!allowed.has(field)) return { error: `Field "${field}" not allowed` };

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("unit_turn_batches")
      .update({ [field]: value })
      .eq("id", batchId);

    if (error) return { error: error.message };
    revalidatePath("/unit-turns");
    revalidatePath(`/unit-turns/${batchId}`);
    return {};
  } catch (err) {
    return { error: "Unexpected: " + (err instanceof Error ? err.message : String(err)) };
  }
}

export async function deleteBatch(batchId: string): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("unit_turn_batches")
      .delete()
      .eq("id", batchId);

    if (error) return { error: error.message };
    revalidatePath("/unit-turns");
    return {};
  } catch (err) {
    return { error: "Unexpected: " + (err instanceof Error ? err.message : String(err)) };
  }
}

// ============================================
// Unit CRUD
// ============================================

export async function addUnitToBatch(
  data: AddUnitToBatch
): Promise<{ id?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    // Single round-trip: call Postgres function that creates unit + all items
    const { data: result, error } = await supabase.rpc("create_unit_with_items", {
      p_batch_id: data.batch_id,
      p_owner_id: user.id,
      p_property: data.property.trim(),
      p_unit_label: data.unit_label.trim(),
    });

    if (error) {
      if (error.code === "23505") {
        return { error: "This property + unit already exists in this batch" };
      }
      return { error: error.message };
    }

    revalidatePath(`/unit-turns/${data.batch_id}`);
    return { id: result };
  } catch (err) {
    return { error: "Unexpected: " + (err instanceof Error ? err.message : String(err)) };
  }
}

export async function deleteUnit(
  unitId: string,
  batchId: string
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();

    // Delete note photos from storage first
    const { data: photos } = await supabase
      .from("unit_turn_note_photos")
      .select("image_path, note_id")
      .in(
        "note_id",
        (await supabase
          .from("unit_turn_notes")
          .select("id")
          .eq("unit_id", unitId)
        ).data?.map((n: { id: string }) => n.id) ?? []
      );

    if (photos && photos.length > 0) {
      const paths = photos.map((p: { image_path: string }) => p.image_path);
      await supabase.storage.from("dd-captures").remove(paths);
    }

    const { error } = await supabase
      .from("unit_turn_batch_units")
      .delete()
      .eq("id", unitId);

    if (error) return { error: error.message };
    revalidatePath(`/unit-turns/${batchId}`);
    return {};
  } catch (err) {
    return { error: "Unexpected: " + (err instanceof Error ? err.message : String(err)) };
  }
}

export async function updateUnitStatus(
  unitId: string,
  batchId: string,
  status: string
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("unit_turn_batch_units")
      .update({ status })
      .eq("id", unitId);

    if (error) return { error: error.message };
    revalidatePath(`/unit-turns/${batchId}`);
    revalidatePath(`/unit-turns/${batchId}/units/${unitId}`);
    return {};
  } catch (err) {
    return { error: "Unexpected: " + (err instanceof Error ? err.message : String(err)) };
  }
}

// ============================================
// Item Status Updates
// ============================================

export async function updateUnitItemStatus(
  itemId: string,
  status: string | null,
  batchId: string,
  unitId: string
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("unit_turn_unit_items")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", itemId);

    if (error) return { error: error.message };
    // No revalidatePath — client manages status state locally
    return {};
  } catch (err) {
    return { error: "Unexpected: " + (err instanceof Error ? err.message : String(err)) };
  }
}

export async function updateUnitItemNA(
  itemId: string,
  isNA: boolean,
  batchId: string,
  unitId: string
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const updateData: Record<string, any> = {
      is_na: isNA,
      updated_at: new Date().toISOString(),
    };
    // If marking N/A, clear status and paint_scope
    if (isNA) {
      updateData.status = null;
      updateData.paint_scope = null;
    }

    const { error } = await supabase
      .from("unit_turn_unit_items")
      .update(updateData)
      .eq("id", itemId);

    if (error) return { error: error.message };
    // No revalidatePath — client manages N/A state locally
    return {};
  } catch (err) {
    return { error: "Unexpected: " + (err instanceof Error ? err.message : String(err)) };
  }
}

export async function updatePaintScope(
  itemId: string,
  scope: string | null,
  batchId: string,
  unitId: string
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("unit_turn_unit_items")
      .update({ paint_scope: scope, updated_at: new Date().toISOString() })
      .eq("id", itemId);

    if (error) return { error: error.message };
    // No revalidatePath — client manages paint scope state locally
    return {};
  } catch (err) {
    return { error: "Unexpected: " + (err instanceof Error ? err.message : String(err)) };
  }
}

// ============================================
// Notes CRUD
// ============================================

export async function createNote(
  data: CreateNote,
  batchId: string
): Promise<{ id?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { data: note, error } = await supabase
      .from("unit_turn_notes")
      .insert({
        unit_id: data.unit_id,
        item_id: data.item_id || null,
        category_id: data.category_id,
        text: data.text.trim(),
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) return { error: error.message };
    revalidatePath(`/unit-turns/${batchId}/units/${data.unit_id}`);
    return { id: note.id };
  } catch (err) {
    return { error: "Unexpected: " + (err instanceof Error ? err.message : String(err)) };
  }
}

export async function deleteNote(
  noteId: string,
  batchId: string,
  unitId: string
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();

    // Delete photos from storage first
    const { data: photos } = await supabase
      .from("unit_turn_note_photos")
      .select("image_path")
      .eq("note_id", noteId);

    if (photos && photos.length > 0) {
      const paths = photos.map((p: { image_path: string }) => p.image_path);
      await supabase.storage.from("dd-captures").remove(paths);
    }

    const { error } = await supabase
      .from("unit_turn_notes")
      .delete()
      .eq("id", noteId);

    if (error) return { error: error.message };
    revalidatePath(`/unit-turns/${batchId}/units/${unitId}`);
    return {};
  } catch (err) {
    return { error: "Unexpected: " + (err instanceof Error ? err.message : String(err)) };
  }
}

// ============================================
// Photo Upload/Delete
// ============================================

export async function uploadNotePhoto(formData: FormData): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const file = formData.get("file") as File;
    const noteId = formData.get("noteId") as string;
    const batchId = formData.get("batchId") as string;
    const unitId = formData.get("unitId") as string;

    if (!file || !noteId) return { error: "Missing file or noteId" };

    // Detect file type from MIME
    const fileType = file.type.startsWith("video/") ? "video" : "image";

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/unit-turns/${batchId}/${unitId}/${noteId}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("dd-captures")
      .upload(path, file, { upsert: false });

    if (uploadErr) return { error: "Upload failed: " + uploadErr.message };

    const { error: insertErr } = await supabase
      .from("unit_turn_note_photos")
      .insert({
        note_id: noteId,
        image_path: path,
        file_type: fileType,
      });

    if (insertErr) return { error: "Failed to save photo: " + insertErr.message };

    revalidatePath(`/unit-turns/${batchId}/units/${unitId}`);
    return {};
  } catch (err) {
    return { error: "Unexpected: " + (err instanceof Error ? err.message : String(err)) };
  }
}

export async function deleteNotePhoto(
  photoId: string,
  imagePath: string,
  batchId: string,
  unitId: string
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();

    await supabase.storage.from("dd-captures").remove([imagePath]);

    const { error } = await supabase
      .from("unit_turn_note_photos")
      .delete()
      .eq("id", photoId);

    if (error) return { error: error.message };
    revalidatePath(`/unit-turns/${batchId}/units/${unitId}`);
    return {};
  } catch (err) {
    return { error: "Unexpected: " + (err instanceof Error ? err.message : String(err)) };
  }
}
