"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole } from "@/lib/vendor/role-helpers";
import {
  isTwilioConfigured,
  sendSMS as twilioSendSMS,
  searchAvailableNumbers as twilioSearch,
  purchaseNumber as twilioPurchase,
  releaseNumber as twilioRelease,
} from "@/lib/vendor/twilio-client";
import type {
  VendorPhoneNumber,
  VendorMessage,
  ConversationPreview,
} from "@/lib/vendor/types";

// ─── Config Check ────────────────────────────────────────────────────────────

export async function getTwilioStatus(): Promise<{ configured: boolean }> {
  return { configured: isTwilioConfigured() };
}

// ─── Phone Number Management ─────────────────────────────────────────────────

export async function getOrgPhoneNumbers(): Promise<{
  data: VendorPhoneNumber[];
  error?: string;
}> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_phone_numbers")
    .select("*")
    .eq("vendor_org_id", vendor_org_id)
    .eq("status", "active")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as VendorPhoneNumber[] };
}

export async function searchNumbers(areaCode?: string): Promise<{
  numbers: { phoneNumber: string; friendlyName: string; locality: string; region: string }[];
  error?: string;
}> {
  const ctx = await requireVendorRole();
  if (!["owner", "admin"].includes(ctx.role)) return { numbers: [], error: "Admin required" };
  return twilioSearch("US", areaCode);
}

export async function purchasePhoneNumber(
  phoneNumber: string,
  friendlyName?: string
): Promise<{ data?: VendorPhoneNumber; error?: string }> {
  const ctx = await requireVendorRole();
  if (!["owner", "admin"].includes(ctx.role)) return { error: "Admin required" };
  const vendor_org_id = ctx.vendor_org_id;
  const supabase = await createClient();

  const webhookBase = process.env.TWILIO_WEBHOOK_URL || process.env.NEXT_PUBLIC_SITE_URL || "";
  const smsUrl = webhookBase ? `${webhookBase}/api/twilio/sms` : undefined;
  const voiceUrl = webhookBase ? `${webhookBase}/api/twilio/voice` : undefined;

  const result = await twilioPurchase(phoneNumber, smsUrl, voiceUrl);
  if (result.error) return { error: result.error };

  // Check if org already has a default
  const { data: existing } = await supabase
    .from("vendor_phone_numbers")
    .select("id")
    .eq("vendor_org_id", vendor_org_id)
    .eq("status", "active")
    .eq("is_default", true)
    .limit(1);

  const isDefault = !existing || existing.length === 0;

  const { data, error } = await supabase
    .from("vendor_phone_numbers")
    .insert({
      vendor_org_id,
      twilio_number: result.phoneNumber,
      twilio_sid: result.sid,
      friendly_name: friendlyName || result.friendlyName,
      is_default: isDefault,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as VendorPhoneNumber };
}

export async function releasePhoneNumber(
  phoneNumberId: string
): Promise<{ error?: string }> {
  const ctx = await requireVendorRole();
  if (!["owner", "admin"].includes(ctx.role)) return { error: "Admin required" };
  const vendor_org_id = ctx.vendor_org_id;
  const supabase = await createClient();

  // Look up from DB — never trust client input
  const { data: phone } = await supabase
    .from("vendor_phone_numbers")
    .select("id, twilio_sid, vendor_org_id")
    .eq("id", phoneNumberId)
    .single();

  if (!phone) return { error: "Phone number not found" };
  if (phone.vendor_org_id !== vendor_org_id) return { error: "Access denied" };

  // Release from Twilio
  const result = await twilioRelease(phone.twilio_sid);
  if (result.error) return { error: result.error };

  // Mark as released in DB
  await supabase
    .from("vendor_phone_numbers")
    .update({ status: "released", is_default: false })
    .eq("id", phoneNumberId);

  return {};
}

export async function setDefaultPhoneNumber(
  phoneNumberId: string
): Promise<{ error?: string }> {
  const ctx = await requireVendorRole();
  if (!["owner", "admin"].includes(ctx.role)) return { error: "Admin required" };
  const vendor_org_id = ctx.vendor_org_id;
  const supabase = await createClient();

  // Verify ownership
  const { data: phone } = await supabase
    .from("vendor_phone_numbers")
    .select("id, vendor_org_id")
    .eq("id", phoneNumberId)
    .eq("status", "active")
    .single();

  if (!phone || phone.vendor_org_id !== vendor_org_id) return { error: "Not found" };

  // Unset current default
  await supabase
    .from("vendor_phone_numbers")
    .update({ is_default: false })
    .eq("vendor_org_id", vendor_org_id)
    .eq("is_default", true);

  // Set new default
  await supabase
    .from("vendor_phone_numbers")
    .update({ is_default: true })
    .eq("id", phoneNumberId);

  return {};
}

export async function updatePhoneNumberName(
  phoneNumberId: string,
  friendlyName: string
): Promise<{ error?: string }> {
  const ctx = await requireVendorRole();
  if (!["owner", "admin"].includes(ctx.role)) return { error: "Admin required" };
  const vendor_org_id = ctx.vendor_org_id;
  const supabase = await createClient();

  const trimmed = friendlyName.trim().slice(0, 100);

  const { error } = await supabase
    .from("vendor_phone_numbers")
    .update({ friendly_name: trimmed })
    .eq("id", phoneNumberId)
    .eq("vendor_org_id", vendor_org_id);

  if (error) return { error: error.message };
  return {};
}

// ─── Messaging ───────────────────────────────────────────────────────────────

export async function sendMessage(
  workOrderId: string,
  body: string
): Promise<{ data?: VendorMessage; error?: string }> {
  const ctx = await requireVendorRole();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get org's default phone number
  const { data: phone } = await supabase
    .from("vendor_phone_numbers")
    .select("id, twilio_number")
    .eq("vendor_org_id", ctx.vendor_org_id)
    .eq("status", "active")
    .eq("is_default", true)
    .single();

  if (!phone) return { error: "No business phone number configured" };

  // Get work order + tenant phone — verify org ownership
  const { data: wo } = await supabase
    .from("vendor_work_orders")
    .select("id, tenant_phone, vendor_org_id")
    .eq("id", workOrderId)
    .single();

  if (!wo) return { error: "Work order not found" };
  if (wo.vendor_org_id !== ctx.vendor_org_id) return { error: "Access denied" };
  if (!wo.tenant_phone) return { error: "No tenant phone number on this work order" };

  // Send via Twilio
  const trimmedBody = body.trim().slice(0, 1600); // SMS limit
  const result = await twilioSendSMS(phone.twilio_number, wo.tenant_phone, trimmedBody);

  // Log message regardless of outcome
  const { data: msg, error } = await supabase
    .from("vendor_messages")
    .insert({
      vendor_org_id: ctx.vendor_org_id,
      work_order_id: workOrderId,
      phone_number_id: phone.id,
      sender_user_id: user?.id || null,
      direction: "outbound",
      message_type: "sms",
      from_number: phone.twilio_number,
      to_number: wo.tenant_phone,
      body: trimmedBody,
      status: result.error ? "failed" : result.status,
      twilio_sid: result.sid || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  if (result.error) return { data: msg as VendorMessage, error: `Sent to log but Twilio failed: ${result.error}` };
  return { data: msg as VendorMessage };
}

export async function getMessageThread(
  workOrderId: string
): Promise<{ data: VendorMessage[]; error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  // Verify WO ownership
  const { data: wo } = await supabase
    .from("vendor_work_orders")
    .select("id, vendor_org_id")
    .eq("id", workOrderId)
    .single();

  if (!wo || wo.vendor_org_id !== vendor_org_id) return { data: [], error: "Access denied" };

  const { data, error } = await supabase
    .from("vendor_messages")
    .select("*")
    .eq("work_order_id", workOrderId)
    .eq("vendor_org_id", vendor_org_id)
    .order("created_at", { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as VendorMessage[] };
}

export async function getConversations(): Promise<{
  data: ConversationPreview[];
  error?: string;
}> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  // Get all WOs that have messages, with latest message info
  const { data: messages, error } = await supabase
    .from("vendor_messages")
    .select("work_order_id, body, created_at, direction, read_at")
    .eq("vendor_org_id", vendor_org_id)
    .not("work_order_id", "is", null)
    .order("created_at", { ascending: false });

  if (error) return { data: [], error: error.message };

  // Group by work_order_id, pick latest message + count unread
  const woMap = new Map<string, {
    lastMessage: string | null;
    lastMessageAt: string;
    unreadCount: number;
  }>();

  for (const msg of (messages ?? [])) {
    const m = msg as VendorMessage;
    const woId = m.work_order_id!;
    if (!woMap.has(woId)) {
      woMap.set(woId, {
        lastMessage: m.body,
        lastMessageAt: m.created_at,
        unreadCount: 0,
      });
    }
    const entry = woMap.get(woId)!;
    if (m.direction === "inbound" && !m.read_at) {
      entry.unreadCount++;
    }
  }

  if (woMap.size === 0) return { data: [] };

  // Fetch WO details
  const woIds = Array.from(woMap.keys());
  const { data: workOrders } = await supabase
    .from("vendor_work_orders")
    .select("id, property_name, tenant_name, tenant_phone")
    .in("id", woIds);

  const woDetails = new Map<string, { property_name: string | null; tenant_name: string | null; tenant_phone: string | null }>();
  for (const wo of (workOrders ?? [])) {
    const w = wo as { id: string; property_name: string | null; tenant_name: string | null; tenant_phone: string | null };
    woDetails.set(w.id, { property_name: w.property_name, tenant_name: w.tenant_name, tenant_phone: w.tenant_phone });
  }

  const conversations: ConversationPreview[] = [];
  for (const [woId, info] of woMap) {
    const details = woDetails.get(woId);
    conversations.push({
      work_order_id: woId,
      property_name: details?.property_name ?? null,
      tenant_name: details?.tenant_name ?? null,
      tenant_phone: details?.tenant_phone ?? null,
      last_message: info.lastMessage,
      last_message_at: info.lastMessageAt,
      unread_count: info.unreadCount,
    });
  }

  // Sort by latest message
  conversations.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

  return { data: conversations };
}

export async function markMessagesRead(
  workOrderId: string
): Promise<{ error?: string }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  const { error } = await supabase
    .from("vendor_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("vendor_org_id", vendor_org_id)
    .eq("work_order_id", workOrderId)
    .eq("direction", "inbound")
    .is("read_at", null);

  if (error) return { error: error.message };
  return {};
}

export async function getUnreadCount(): Promise<{ count: number }> {
  const { vendor_org_id } = await requireVendorRole();
  const supabase = await createClient();

  const { count } = await supabase
    .from("vendor_messages")
    .select("id", { count: "exact", head: true })
    .eq("vendor_org_id", vendor_org_id)
    .eq("direction", "inbound")
    .is("read_at", null);

  return { count: count ?? 0 };
}
