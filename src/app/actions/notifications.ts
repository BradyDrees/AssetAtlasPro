"use server";

import { createClient } from "@/lib/supabase/server";
import type { VendorNotification } from "@/lib/vendor/types";

// ============================================
// Notification Actions (shared by PM + Vendor)
// ============================================

/** Get notifications for the current user */
export async function getNotifications(opts?: {
  limit?: number;
  unreadOnly?: boolean;
}): Promise<{ data: VendorNotification[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: [], error: "Not authenticated" };

  let query = supabase
    .from("vendor_notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 20);

  if (opts?.unreadOnly) {
    query = query.eq("is_read", false);
  }

  const { data, error } = await query;

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as VendorNotification[] };
}

/** Get count of unread notifications */
export async function getUnreadCount(): Promise<{
  count: number;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { count: 0, error: "Not authenticated" };

  const { count, error } = await supabase
    .from("vendor_notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) {
    return { count: 0, error: error.message };
  }

  return { count: count ?? 0 };
}

/** Mark a single notification as read */
export async function markRead(
  notificationId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("vendor_notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  return {};
}

/** Mark all notifications as read */
export async function markAllRead(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("vendor_notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) {
    return { error: error.message };
  }

  return {};
}
