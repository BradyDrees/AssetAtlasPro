"use server";

import { createClient } from "@/lib/supabase/server";

interface ChatThread {
  work_order_id: string;
  vendor_org_id: string;
  vendor_name: string;
  wo_description: string | null;
  wo_trade: string | null;
  last_message: string;
  last_message_at: string;
  last_sender_role: string;
  unread_count: number;
}

interface ChatMessage {
  id: string;
  body: string;
  sender_id: string;
  sender_role: string;
  is_read: boolean;
  created_at: string;
}

/**
 * Get all message threads for the homeowner.
 * Groups by work order, shows latest message + unread count.
 */
export async function getHomeThreads(): Promise<ChatThread[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Get all WOs belonging to this homeowner that have a vendor assigned
  const { data: workOrders } = await supabase
    .from("vendor_work_orders")
    .select("id, description, trade, vendor_org_id")
    .eq("homeowner_id", user.id)
    .not("vendor_org_id", "is", null);

  if (!workOrders || workOrders.length === 0) return [];

  const woIds = workOrders.map((wo) => wo.id);
  const vendorOrgIds = [...new Set(workOrders.map((wo) => wo.vendor_org_id).filter(Boolean))] as string[];

  // Get vendor org names
  const { data: vendorOrgs } = await supabase
    .from("vendor_organizations")
    .select("id, name")
    .in("id", vendorOrgIds);

  const vendorMap = new Map((vendorOrgs ?? []).map((v) => [v.id, v.name]));

  // Get all messages for these WOs
  const { data: messages } = await supabase
    .from("vendor_chat_messages")
    .select("*")
    .in("work_order_id", woIds)
    .order("created_at", { ascending: false });

  if (!messages || messages.length === 0) return [];

  // Group by work_order_id, get latest message + unread count
  const threadMap = new Map<string, ChatThread>();

  for (const msg of messages) {
    const wo = workOrders.find((w) => w.id === msg.work_order_id);
    if (!wo) continue;

    if (!threadMap.has(msg.work_order_id)) {
      threadMap.set(msg.work_order_id, {
        work_order_id: msg.work_order_id,
        vendor_org_id: wo.vendor_org_id ?? "",
        vendor_name: vendorMap.get(wo.vendor_org_id ?? "") ?? "Unknown Vendor",
        wo_description: wo.description,
        wo_trade: wo.trade,
        last_message: msg.body,
        last_message_at: msg.created_at,
        last_sender_role: msg.sender_role,
        unread_count: 0,
      });
    }

    // Count unread messages sent by vendor (not by homeowner)
    if (!msg.is_read && msg.sender_id !== user.id) {
      const thread = threadMap.get(msg.work_order_id)!;
      thread.unread_count += 1;
    }
  }

  return Array.from(threadMap.values()).sort(
    (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
  );
}

/**
 * Get messages for a specific work order thread.
 */
export async function getThreadMessages(workOrderId: string): Promise<ChatMessage[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Verify homeowner owns this WO
  const { data: wo } = await supabase
    .from("vendor_work_orders")
    .select("id")
    .eq("id", workOrderId)
    .eq("homeowner_id", user.id)
    .single();

  if (!wo) return [];

  const { data: messages } = await supabase
    .from("vendor_chat_messages")
    .select("id, body, sender_id, sender_role, is_read, created_at")
    .eq("work_order_id", workOrderId)
    .order("created_at", { ascending: true });

  return messages ?? [];
}

/**
 * Send a message in a WO thread.
 */
export async function sendHomeMessage(
  workOrderId: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not authenticated" };

    // Verify homeowner owns this WO and get vendor_org_id
    const { data: wo } = await supabase
      .from("vendor_work_orders")
      .select("id, vendor_org_id")
      .eq("id", workOrderId)
      .eq("homeowner_id", user.id)
      .single();

    if (!wo) return { success: false, error: "Work order not found" };
    if (!wo.vendor_org_id) return { success: false, error: "No vendor assigned yet" };

    const { error } = await supabase.from("vendor_chat_messages").insert({
      vendor_org_id: wo.vendor_org_id,
      work_order_id: workOrderId,
      sender_id: user.id,
      sender_role: "homeowner",
      body: body.trim(),
    });

    if (error) {
      console.error("Failed to send message:", error);
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
 * Mark all messages in a thread as read (messages not sent by current user).
 */
export async function markThreadRead(workOrderId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase
    .from("vendor_chat_messages")
    .update({ is_read: true })
    .eq("work_order_id", workOrderId)
    .neq("sender_id", user.id)
    .eq("is_read", false);
}
