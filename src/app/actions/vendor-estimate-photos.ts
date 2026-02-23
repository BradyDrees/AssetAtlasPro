'use server';

import { createClient } from '@/lib/supabase/server';
import { requireVendorRole } from '@/lib/vendor/role-helpers';
import type { VendorEstimatePhoto } from '@/lib/vendor/estimate-types';

// ─── Annotation JSON Contract ────────────────────────────────────────────────
//
// annotation_data shape (versioned):
// {
//   v: 1,
//   canvas: { w: number, h: number },        // normalized canvas size
//   shapes: AnnotationShape[]                 // array of drawn shapes
// }
//
// All coordinates are normalized to canvas dimensions (0-canvasW, 0-canvasH),
// NOT raw image pixels. This ensures consistent re-render at any resolution.
//
// ─────────────────────────────────────────────────────────────────────────────

const MAX_CAPTION_LENGTH = 200;
const ANNOTATION_VERSION = 1;

/** Validate the annotation data contract */
function validateAnnotationData(data: unknown): boolean {
  if (data === null || data === undefined) return true;
  if (typeof data !== 'object' || data === null) return false;

  const d = data as Record<string, unknown>;
  if (d.v !== ANNOTATION_VERSION) return false;

  // Canvas dimensions must be present and positive
  if (typeof d.canvas !== 'object' || d.canvas === null) return false;
  const canvas = d.canvas as Record<string, unknown>;
  if (typeof canvas.w !== 'number' || typeof canvas.h !== 'number') return false;
  if (canvas.w <= 0 || canvas.h <= 0) return false;

  // Shapes must be an array
  if (!Array.isArray(d.shapes)) return false;

  // Validate each shape has a recognized type and color
  for (const shape of d.shapes) {
    if (typeof shape !== 'object' || shape === null) return false;
    const s = shape as Record<string, unknown>;
    if (!['arrow', 'rectangle', 'text', 'freehand'].includes(s.type as string)) return false;
    if (typeof s.color !== 'string') return false;
    if (typeof s.lineWidth !== 'number' || s.lineWidth <= 0) return false;
  }

  return true;
}

// ─── Upload Photo ────────────────────────────────────────────────────────────

export async function uploadEstimatePhoto(
  formData: FormData
): Promise<{ data?: VendorEstimatePhoto; error?: string }> {
  try {
    const { vendor_org_id } = await requireVendorRole();
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const file = formData.get('file') as File;
    const estimateId = formData.get('estimateId') as string;
    const sectionId = (formData.get('sectionId') as string) || null;
    const itemId = (formData.get('itemId') as string) || null;
    const caption = (formData.get('caption') as string) || null;

    if (!file || !estimateId) {
      return { error: 'Missing required fields' };
    }

    // Verify estimate belongs to caller's org
    const { data: estimate, error: estError } = await supabase
      .from('vendor_estimates')
      .select('id')
      .eq('id', estimateId)
      .eq('vendor_org_id', vendor_org_id)
      .single();

    if (estError || !estimate) {
      return { error: 'Estimate not found or access denied' };
    }

    // Build owner-scoped storage path (reuse dd-captures bucket)
    const ext = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 7);
    const storagePath = `${user.id}/estimates/${estimateId}/${timestamp}-${random}.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('dd-captures')
      .upload(storagePath, file);

    if (uploadError) {
      return { error: `Upload failed: ${uploadError.message}` };
    }

    // Get next sort_order
    const { data: maxSort } = await supabase
      .from('vendor_estimate_photos')
      .select('sort_order')
      .eq('estimate_id', estimateId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextSort = (maxSort?.sort_order ?? -1) + 1;

    // Trim caption
    const trimmedCaption = caption ? caption.trim().slice(0, MAX_CAPTION_LENGTH) : null;

    // Insert DB row
    const { data, error: insertError } = await supabase
      .from('vendor_estimate_photos')
      .insert({
        estimate_id: estimateId,
        section_id: sectionId,
        item_id: itemId,
        storage_path: storagePath,
        caption: trimmedCaption,
        annotation_data: null,
        sort_order: nextSort,
      })
      .select()
      .single();

    if (insertError) {
      // Clean up uploaded file on DB failure
      await supabase.storage.from('dd-captures').remove([storagePath]);
      return { error: `DB insert failed: ${insertError.message}` };
    }

    return { data: data as VendorEstimatePhoto };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to upload photo';
    console.error('[uploadEstimatePhoto] Error:', message);
    return { error: message };
  }
}

// ─── Get Photos ──────────────────────────────────────────────────────────────

export async function getEstimatePhotos(
  estimateId: string
): Promise<{ data: VendorEstimatePhoto[]; error?: string }> {
  try {
    const { vendor_org_id } = await requireVendorRole();
    const supabase = await createClient();

    // Verify estimate belongs to org
    const { data: estimate } = await supabase
      .from('vendor_estimates')
      .select('id')
      .eq('id', estimateId)
      .eq('vendor_org_id', vendor_org_id)
      .single();

    if (!estimate) {
      return { data: [], error: 'Estimate not found or access denied' };
    }

    const { data, error } = await supabase
      .from('vendor_estimate_photos')
      .select('*')
      .eq('estimate_id', estimateId)
      .order('sort_order', { ascending: true });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data ?? []) as VendorEstimatePhoto[] };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch photos';
    console.error('[getEstimatePhotos] Error:', message);
    return { data: [], error: message };
  }
}

// ─── Update Annotation ───────────────────────────────────────────────────────

export async function updatePhotoAnnotation(
  photoId: string,
  annotationData: Record<string, unknown> | null
): Promise<{ error?: string }> {
  try {
    const { vendor_org_id } = await requireVendorRole();
    const supabase = await createClient();

    // Validate annotation data contract
    if (annotationData !== null && !validateAnnotationData(annotationData)) {
      return { error: 'Invalid annotation data format' };
    }

    // Verify photo belongs to an estimate owned by this org
    const { data: photo } = await supabase
      .from('vendor_estimate_photos')
      .select('id, estimate_id')
      .eq('id', photoId)
      .single();

    if (!photo) {
      return { error: 'Photo not found' };
    }

    const { data: estimate } = await supabase
      .from('vendor_estimates')
      .select('id')
      .eq('id', photo.estimate_id)
      .eq('vendor_org_id', vendor_org_id)
      .single();

    if (!estimate) {
      return { error: 'Access denied' };
    }

    const { error } = await supabase
      .from('vendor_estimate_photos')
      .update({ annotation_data: annotationData })
      .eq('id', photoId);

    if (error) return { error: error.message };
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update annotation';
    console.error('[updatePhotoAnnotation] Error:', message);
    return { error: message };
  }
}

// ─── Update Caption ──────────────────────────────────────────────────────────

export async function updatePhotoCaption(
  photoId: string,
  caption: string
): Promise<{ error?: string }> {
  try {
    const { vendor_org_id } = await requireVendorRole();
    const supabase = await createClient();

    // Trim + enforce max length
    const trimmed = caption.trim().slice(0, MAX_CAPTION_LENGTH);

    // Verify ownership chain: photo → estimate → org
    const { data: photo } = await supabase
      .from('vendor_estimate_photos')
      .select('id, estimate_id')
      .eq('id', photoId)
      .single();

    if (!photo) return { error: 'Photo not found' };

    const { data: estimate } = await supabase
      .from('vendor_estimates')
      .select('id')
      .eq('id', photo.estimate_id)
      .eq('vendor_org_id', vendor_org_id)
      .single();

    if (!estimate) return { error: 'Access denied' };

    const { error } = await supabase
      .from('vendor_estimate_photos')
      .update({ caption: trimmed })
      .eq('id', photoId);

    if (error) return { error: error.message };
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update caption';
    console.error('[updatePhotoCaption] Error:', message);
    return { error: message };
  }
}

// ─── Delete Photo ────────────────────────────────────────────────────────────

export async function deleteEstimatePhoto(
  photoId: string
): Promise<{ error?: string }> {
  try {
    const { vendor_org_id } = await requireVendorRole();
    const supabase = await createClient();

    // Look up photo row to get storage_path (never accept path from client)
    const { data: photo } = await supabase
      .from('vendor_estimate_photos')
      .select('id, estimate_id, storage_path')
      .eq('id', photoId)
      .single();

    if (!photo) return { error: 'Photo not found' };

    // Verify ownership: estimate belongs to this vendor org
    const { data: estimate } = await supabase
      .from('vendor_estimates')
      .select('id')
      .eq('id', photo.estimate_id)
      .eq('vendor_org_id', vendor_org_id)
      .single();

    if (!estimate) return { error: 'Access denied' };

    // Delete from storage (using DB-stored path, not client-supplied)
    const { error: storageError } = await supabase.storage
      .from('dd-captures')
      .remove([photo.storage_path]);

    if (storageError) {
      console.warn('[deleteEstimatePhoto] Storage delete warning:', storageError.message);
    }

    // Delete DB row
    const { error } = await supabase
      .from('vendor_estimate_photos')
      .delete()
      .eq('id', photoId);

    if (error) return { error: error.message };
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete photo';
    console.error('[deleteEstimatePhoto] Error:', message);
    return { error: message };
  }
}
