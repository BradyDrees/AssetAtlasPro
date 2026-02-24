"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole } from "@/lib/vendor/role-helpers";

// ============================================
// Types
// ============================================

export interface ChatMessage {
  id: string;
  vendor_org_id: string;
  work_order_id: string;
  sender_id: string;
  sender_role: "pm" | "vendor";
  body: string;
  is_read: boolean;
  created_at: string;
  // Joined fields
  sender_name?: string;
}

export interface ChatConversation {
  work_order_id: string;
  vendor_org_id: string;
  last_message: string;
  last_sender_role: string;
  last_message_at: string;
  property_name: string | null;
  wo_description: string | null;
  pm_user_id: string;
  unread_count: number;
}

// ============================================
// Get Chat Messages for a Work Order
// ============================================

export async function getChatMessages(
  workOrderId: string
): Promise<{ data: ChatMessage[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("vendor_chat_messages")
    .select("*")
    .eq("work_order_id", workOrderId)
    .order("created_at", { ascending: true });

  if (error) return { data: [], error: error.message };

  // Fetch sender names
  const senderIds = [...new Set((data ?? []).map((m) => m.sender_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", senderIds);

  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const messages: ChatMessage[] = (data ?? []).map((m) => ({
    ...m,
    sender_name: nameMap.get(m.sender_id) ?? undefined,
  }));

  return { data: messages };
}

// ============================================
// Send Chat Message (Vendor Side)
// ============================================

export async function sendChatMessage(
  workOrderId: string,
  body: string
): Promise<{ data?: ChatMessage; error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify WO belongs to this org
  const { data: wo } = await supabase
    .from("vendor_work_orders")
    .select("id")
    .eq("id", workOrderId)
    .eq("vendor_org_id", vendor_org_id)
    .single();

  if (!wo) return { error: "Work order not found" };

  const { data, error } = await supabase
    .from("vendor_chat_messages")
    .insert({
      vendor_org_id,
      work_order_id: workOrderId,
      sender_id: user.id,
      sender_role: "vendor",
      body: body.trim(),
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as ChatMessage };
}

// ============================================
// Send Chat Message (PM Side)
// ============================================

export async function sendPmChatMessage(
  workOrderId: string,
  body: string
): Promise<{ data?: ChatMessage; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify PM owns this WO
  const { data: wo } = await supabase
    .from("vendor_work_orders")
    .select("id, vendor_org_id")
    .eq("id", workOrderId)
    .eq("pm_user_id", user.id)
    .single();

  if (!wo) return { error: "Work order not found" };

  const { data, error } = await supabase
    .from("vendor_chat_messages")
    .insert({
      vendor_org_id: wo.vendor_org_id,
      work_order_id: workOrderId,
      sender_id: user.id,
      sender_role: "pm",
      body: body.trim(),
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as ChatMessage };
}

// ============================================
// Mark Messages Read
// ============================================

export async function markChatRead(
  workOrderId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("vendor_chat_messages")
    .update({ is_read: true })
    .eq("work_order_id", workOrderId)
    .neq("sender_id", user.id)
    .eq("is_read", false);

  if (error) return { error: error.message };
  return {};
}

// ============================================
// Get Chat Conversations (Vendor Side)
// ============================================

export async function getChatConversations(): Promise<{
  data: ChatConversation[];
  error?: string;
}> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  // Get distinct work orders with chat messages
  const { data: convos, error } = await supabase
    .from("vendor_chat_messages")
    .select("work_order_id")
    .eq("vendor_org_id", vendor_org_id)
    .order("created_at", { ascending: false });

  if (error) return { data: [], error: error.message };

  const woIds = [...new Set((convos ?? []).map((c) => c.work_order_id))];
  if (woIds.length === 0) return { data: [] };

  // Get latest message + unread count per WO
  const conversations: ChatConversation[] = [];
  for (const woId of woIds.slice(0, 50)) {
    // Latest message
    const { data: latest } = await supabase
      .from("vendor_chat_messages")
      .select("*, vendor_work_orders!inner(property_name, description, pm_user_id)")
      .eq("work_order_id", woId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!latest) continue;

    // Unread count (messages not from me that are unread)
    const { count } = await supabase
      .from("vendor_chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("work_order_id", woId)
      .neq("sender_id", user.id)
      .eq("is_read", false);

    const wo = latest.vendor_work_orders as unknown as {
      property_name: string | null;
      description: string | null;
      pm_user_id: string;
    };

    conversations.push({
      work_order_id: woId,
      vendor_org_id,
      last_message: latest.body,
      last_sender_role: latest.sender_role,
      last_message_at: latest.created_at,
      property_name: wo.property_name,
      wo_description: wo.description,
      pm_user_id: wo.pm_user_id,
      unread_count: count ?? 0,
    });
  }

  return { data: conversations };
}

// ============================================
// Get Unread Chat Count (for badge)
// ============================================

export async function getUnreadChatCount(): Promise<{
  count: number;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { count: 0, error: "Not authenticated" };

  const { count, error } = await supabase
    .from("vendor_chat_messages")
    .select("*", { count: "exact", head: true })
    .neq("sender_id", user.id)
    .eq("is_read", false);

  if (error) return { count: 0, error: error.message };
  return { count: count ?? 0 };
}
