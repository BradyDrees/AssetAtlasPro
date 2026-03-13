"use client";

import { compressPhoto } from "./photo-compress";

/**
 * Compress an image file and upload it to Supabase Storage.
 * Returns the storagePath string on success.
 * Throws on failure (caller handles offline fallback).
 *
 * Output is always JPEG (image/jpeg, .jpg extension).
 * Uses the same browser Supabase client pattern as operate-capture-sheet.tsx.
 */
export async function compressAndUpload(
  file: File,
  projectId: string,
  projectSectionId: string
): Promise<string> {
  const compressed = await compressPhoto(file);

  const storagePath = `inspections/${projectId}/${projectSectionId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;

  const { createClient } = await import("@supabase/supabase-js");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error } = await supabase.storage
    .from("dd-captures")
    .upload(storagePath, compressed, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (error) throw error;

  return storagePath;
}
