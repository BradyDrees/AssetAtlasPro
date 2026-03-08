'use server';

import { createClient } from '@/lib/supabase/server';
import { requireVendorRole } from '@/lib/vendor/role-helpers';

const MAX_CAPTION_LENGTH = 200;

export interface WoPhoto {
  id: string;
  work_order_id: string;
  uploaded_by: string;
  storage_path: string;
  caption: string | null;
  photo_type: 'before' | 'during' | 'after' | 'general';
  sort_order: number;
  created_at: string;
  signed_url?: string;
}

// ─── Upload Photo ────────────────────────────────────────────────────────────

export async function uploadWoPhoto(
  formData: FormData
): Promise<{ data?: WoPhoto; error?: string }> {
  try {
    const { vendor_org_id } = await requireVendorRole();
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const file = formData.get('file') as File;
    const woId = formData.get('woId') as string;
    const photoType = (formData.get('photoType') as string) || 'general';
    const caption = (formData.get('caption') as string) || null;

    if (!file || !woId) {
      return { error: 'Missing required fields' };
    }

    // Verify WO belongs to caller's org
    const { data: wo, error: woError } = await supabase
      .from('vendor_work_orders')
      .select('id')
      .eq('id', woId)
      .eq('vendor_org_id', vendor_org_id)
      .single();

    if (woError || !wo) {
      return { error: 'Work order not found or access denied' };
    }

    // Build storage path
    const ext = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 7);
    const storagePath = `${user.id}/work-orders/${woId}/${timestamp}-${random}.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('dd-captures')
      .upload(storagePath, file);

    if (uploadError) {
      return { error: `Upload failed: ${uploadError.message}` };
    }

    // Get next sort_order
    const { data: maxSort } = await supabase
      .from('work_order_photos')
      .select('sort_order')
      .eq('work_order_id', woId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextSort = (maxSort?.sort_order ?? -1) + 1;
    const trimmedCaption = caption ? caption.trim().slice(0, MAX_CAPTION_LENGTH) : null;

    // Insert DB row
    const { data, error: insertError } = await supabase
      .from('work_order_photos')
      .insert({
        work_order_id: woId,
        uploaded_by: user.id,
        storage_path: storagePath,
        caption: trimmedCaption,
        photo_type: photoType,
        sort_order: nextSort,
      })
      .select()
      .single();

    if (insertError) {
      await supabase.storage.from('dd-captures').remove([storagePath]);
      return { error: `DB insert failed: ${insertError.message}` };
    }

    return { data: data as WoPhoto };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to upload photo';
    console.error('[uploadWoPhoto] Error:', message);
    return { error: message };
  }
}

// ─── Get Photos ──────────────────────────────────────────────────────────────

export async function getWoPhotos(
  woId: string
): Promise<{ data: WoPhoto[]; error?: string }> {
  try {
    const { vendor_org_id } = await requireVendorRole();
    const supabase = await createClient();

    // Verify WO belongs to org
    const { data: wo } = await supabase
      .from('vendor_work_orders')
      .select('id')
      .eq('id', woId)
      .eq('vendor_org_id', vendor_org_id)
      .single();

    if (!wo) {
      return { data: [], error: 'Work order not found or access denied' };
    }

    const { data, error } = await supabase
      .from('work_order_photos')
      .select('*')
      .eq('work_order_id', woId)
      .order('sort_order', { ascending: true });

    if (error) {
      return { data: [], error: error.message };
    }

    // Generate signed URLs
    const photos = (data ?? []) as WoPhoto[];
    const withUrls = await Promise.all(
      photos.map(async (photo) => {
        const { data: signed } = await supabase.storage
          .from('dd-captures')
          .createSignedUrl(photo.storage_path, 3600);
        return { ...photo, signed_url: signed?.signedUrl ?? undefined };
      })
    );

    return { data: withUrls };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch photos';
    console.error('[getWoPhotos] Error:', message);
    return { data: [], error: message };
  }
}

// ─── Update Caption ──────────────────────────────────────────────────────────

export async function updateWoPhotoCaption(
  photoId: string,
  caption: string
): Promise<{ error?: string }> {
  try {
    const { vendor_org_id } = await requireVendorRole();
    const supabase = await createClient();

    const trimmed = caption.trim().slice(0, MAX_CAPTION_LENGTH);

    // Verify ownership chain: photo → WO → vendor_org
    const { data: photo } = await supabase
      .from('work_order_photos')
      .select('id, work_order_id')
      .eq('id', photoId)
      .single();

    if (!photo) return { error: 'Photo not found' };

    const { data: wo } = await supabase
      .from('vendor_work_orders')
      .select('id')
      .eq('id', photo.work_order_id)
      .eq('vendor_org_id', vendor_org_id)
      .single();

    if (!wo) return { error: 'Access denied' };

    const { error } = await supabase
      .from('work_order_photos')
      .update({ caption: trimmed })
      .eq('id', photoId);

    if (error) return { error: error.message };
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update caption';
    console.error('[updateWoPhotoCaption] Error:', message);
    return { error: message };
  }
}

// ─── Delete Photo ────────────────────────────────────────────────────────────

export async function deleteWoPhoto(
  photoId: string
): Promise<{ error?: string }> {
  try {
    const { vendor_org_id } = await requireVendorRole();
    const supabase = await createClient();

    const { data: photo } = await supabase
      .from('work_order_photos')
      .select('id, work_order_id, storage_path')
      .eq('id', photoId)
      .single();

    if (!photo) return { error: 'Photo not found' };

    // Verify ownership: WO belongs to this vendor org
    const { data: wo } = await supabase
      .from('vendor_work_orders')
      .select('id')
      .eq('id', photo.work_order_id)
      .eq('vendor_org_id', vendor_org_id)
      .single();

    if (!wo) return { error: 'Access denied' };

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('dd-captures')
      .remove([photo.storage_path]);

    if (storageError) {
      console.warn('[deleteWoPhoto] Storage delete warning:', storageError.message);
    }

    // Delete DB row
    const { error } = await supabase
      .from('work_order_photos')
      .delete()
      .eq('id', photoId);

    if (error) return { error: error.message };
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete photo';
    console.error('[deleteWoPhoto] Error:', message);
    return { error: message };
  }
}
