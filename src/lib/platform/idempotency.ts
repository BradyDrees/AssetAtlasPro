/**
 * Idempotency Helper
 *
 * Shared primitive for deduplication across all platform flows.
 * Used by cron jobs, Stripe sessions, webhooks, reminders, alerts, dispatch.
 */
import { createServiceClient } from "@/lib/supabase/server";

// ============================================
// Key Generators
// ============================================

/**
 * Generate a delivery key for notification deduplication.
 * Format: {woId}:{type}:{channel}:{date}
 */
export function generateDeliveryKey(
  woId: string,
  type: string,
  channel: string,
  date?: string
): string {
  const dateStr = date ?? new Date().toISOString().split("T")[0];
  return `${woId}:${type}:${channel}:${dateStr}`;
}

/**
 * Generate a payment idempotency key for Stripe.
 * Format: {entityType}_{entityId}_{action}
 */
export function generatePaymentKey(
  entityType: string,
  entityId: string,
  action: string
): string {
  return `${entityType}_${entityId}_${action}`;
}

/**
 * Generate an alert key for maintenance deduplication.
 * Format: {propertyId}:{systemType}
 */
export function generateAlertKey(
  propertyId: string,
  systemType: string
): string {
  return `${propertyId}:${systemType}`;
}

/**
 * Generate a dispatch dedup key for source-based WO creation.
 * Format: dispatch:{sourceType}:{sourceId}
 */
export function generateDispatchKey(
  sourceType: string,
  sourceId: string
): string {
  return `dispatch:${sourceType}:${sourceId}`;
}

// ============================================
// Delivery Log Operations
// ============================================

/**
 * Check if a delivery key already exists in notification_delivery_log.
 */
export async function isDelivered(deliveryKey: string): Promise<boolean> {
  try {
    const supabase = createServiceClient();

    const { data } = await supabase
      .from("notification_delivery_log")
      .select("id")
      .eq("delivery_key", deliveryKey)
      .single();

    return !!data;
  } catch {
    return false;
  }
}

/**
 * Record a delivery in the notification_delivery_log.
 */
export async function recordDelivery(params: {
  deliveryKey: string;
  woId?: string;
  notificationType: string;
  deliveryChannel: string;
  recipient: string;
  status: "sent" | "failed" | "bounced";
}): Promise<void> {
  try {
    const supabase = createServiceClient();

    await supabase.from("notification_delivery_log").insert({
      delivery_key: params.deliveryKey,
      work_order_id: params.woId ?? null,
      notification_type: params.notificationType,
      delivery_channel: params.deliveryChannel,
      recipient: params.recipient,
      status: params.status,
    });
  } catch (err) {
    console.error(
      "[idempotency] Failed to record delivery:",
      err instanceof Error ? err.message : err
    );
  }
}

// ============================================
// Generic Idempotency Wrapper
// ============================================

/**
 * Execute a function only if the idempotency key hasn't been used.
 *
 * Uses notification_delivery_log as the dedup store.
 * If the key exists, returns null (skipped).
 * If the key is new, executes fn and records the key.
 *
 * @param key - Unique idempotency key
 * @param channel - Logical channel for categorization
 * @param fn - Function to execute if not already processed
 */
export async function withIdempotencyKey<T>(
  key: string,
  channel: string,
  fn: () => Promise<T>
): Promise<{ result: T; skipped: false } | { result: null; skipped: true }> {
  const alreadyProcessed = await isDelivered(key);

  if (alreadyProcessed) {
    return { result: null, skipped: true };
  }

  const result = await fn();

  await recordDelivery({
    deliveryKey: key,
    notificationType: channel,
    deliveryChannel: channel,
    recipient: "system",
    status: "sent",
  });

  return { result, skipped: false };
}

// ============================================
// Dispatch Dedup
// ============================================

/**
 * Check if an active WO already exists for a given source.
 * Used by dispatch-service to prevent duplicate WOs from the same finding/item.
 */
export async function hasActiveWoForSource(
  sourceType: string,
  sourceId: string
): Promise<{ exists: boolean; woId?: string }> {
  try {
    const supabase = createServiceClient();

    const terminalStatuses = ["completed", "cancelled", "paid", "declined"];

    const { data } = await supabase
      .from("vendor_work_orders")
      .select("id, status")
      .eq("source_type", sourceType)
      .eq("source_id", sourceId)
      .not("status", "in", `(${terminalStatuses.join(",")})`)
      .limit(1)
      .single();

    if (data) {
      return { exists: true, woId: data.id };
    }

    return { exists: false };
  } catch {
    return { exists: false };
  }
}
