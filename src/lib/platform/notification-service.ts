/**
 * Notification Service
 *
 * Centralized notification delivery with deduplication.
 * Wraps SMS (Twilio), push notifications, and email (Resend).
 * Uses notification_delivery_log for idempotency.
 */
import { generateDeliveryKey, isDelivered, recordDelivery } from "./idempotency";

// ============================================
// Types
// ============================================

export type DeliveryChannel = "sms" | "email" | "push" | "in_app";

export interface NotificationPayload {
  woId?: string;
  recipient: string; // phone number, email, or user ID
  channel: DeliveryChannel;
  type: string; // notification type key
  subject?: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface DeliveryResult {
  sent: boolean;
  skipped: boolean;
  error?: string;
}

// ============================================
// Send Notification (deduped)
// ============================================

/**
 * Send a notification with built-in deduplication.
 *
 * Checks notification_delivery_log before sending.
 * Records delivery after successful send.
 *
 * @param payload - Notification details
 * @param dateKey - Optional date for dedup key (defaults to today)
 */
export async function sendNotification(
  payload: NotificationPayload,
  dateKey?: string
): Promise<DeliveryResult> {
  const { woId, recipient, channel, type, body } = payload;

  // Build delivery key for dedup
  const deliveryKey = generateDeliveryKey(
    woId ?? "global",
    type,
    channel,
    dateKey
  );

  // Check if already sent
  const alreadySent = await isDelivered(deliveryKey);
  if (alreadySent) {
    return { sent: false, skipped: true };
  }

  try {
    // Dispatch to appropriate channel
    switch (channel) {
      case "sms":
        await sendSms(recipient, body);
        break;
      case "email":
        await sendEmail(recipient, payload.subject ?? type, body);
        break;
      case "push":
        await sendPush(recipient, payload.subject ?? type, body);
        break;
      case "in_app":
        // In-app notifications are handled separately via vendor_notifications table
        break;
    }

    // Record successful delivery
    await recordDelivery({
      deliveryKey,
      woId: woId ?? undefined,
      notificationType: type,
      deliveryChannel: channel,
      recipient,
      status: "sent",
    });

    return { sent: true, skipped: false };
  } catch (err) {
    // Record failed delivery
    await recordDelivery({
      deliveryKey,
      woId: woId ?? undefined,
      notificationType: type,
      deliveryChannel: channel,
      recipient,
      status: "failed",
    });

    return {
      sent: false,
      skipped: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ============================================
// Channel Implementations
// ============================================

/**
 * Send SMS via Twilio.
 * Gracefully degrades if TWILIO env vars are missing.
 */
async function sendSms(to: string, body: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn("[notification-service] Twilio not configured, skipping SMS");
    return;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: fromNumber, Body: body }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Twilio SMS failed: ${response.status} ${errBody}`);
  }
}

/**
 * Send email via Resend.
 * Gracefully degrades if RESEND_API_KEY is missing.
 */
async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@assetatlaspro.com";

  if (!apiKey) {
    console.warn("[notification-service] Resend not configured, skipping email");
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to,
      subject,
      text: body,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Resend email failed: ${response.status} ${errBody}`);
  }
}

/**
 * Send push notification.
 * Uses web-push library (already installed).
 * Gracefully degrades if VAPID keys are missing.
 */
async function sendPush(
  userId: string,
  title: string,
  body: string
): Promise<void> {
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

  if (!vapidPublic || !vapidPrivate) {
    console.warn("[notification-service] VAPID not configured, skipping push");
    return;
  }

  // Push delivery is best-effort — subscription may be stale
  try {
    const { sendPushToUser } = await import("@/lib/messaging/push");
    if (typeof sendPushToUser === "function") {
      await sendPushToUser(userId, { title, body });
    }
  } catch {
    console.warn("[notification-service] Push delivery failed for user", userId);
  }
}
