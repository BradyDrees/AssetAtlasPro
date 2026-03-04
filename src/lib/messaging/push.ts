"use server";

import { createClient } from "@/lib/supabase/server";
import webpush from "web-push";

/**
 * Server-side push notification sender using the web-push protocol.
 *
 * Requires environment variables:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY  — VAPID public key (also used on the client)
 *   VAPID_PRIVATE_KEY             — VAPID private key (server-only)
 *   VAPID_CONTACT_EMAIL           — mailto: contact (defaults to noreply@assetatlaspro.com)
 */

// Configure VAPID once on module load (no-ops if keys missing)
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_EMAIL = process.env.VAPID_CONTACT_EMAIL || "mailto:noreply@assetatlaspro.com";

const vapidConfigured = Boolean(VAPID_PUBLIC && VAPID_PRIVATE);

if (vapidConfigured) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

interface PushPayload {
  title: string;
  body: string;
  url?: string; // Deep link URL
  icon?: string;
  tag?: string; // Notification grouping tag
}

/**
 * Send a push notification to a specific user.
 * Skips gracefully if VAPID keys are not configured or user has no subscriptions.
 */
export async function sendPushToUser(
  targetUserId: string,
  payload: PushPayload
): Promise<void> {
  if (!vapidConfigured) {
    console.log("[push] VAPID keys not configured — skipping push");
    return;
  }

  try {
    const supabase = await createClient();

    // Get all push subscriptions for the user
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", targetUserId);

    if (error || !subscriptions || subscriptions.length === 0) {
      return; // No subscriptions — silent return
    }

    const jsonPayload = JSON.stringify(payload);

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth_key,
            },
          },
          jsonPayload,
          {
            TTL: 60 * 60, // 1 hour
            urgency: "normal",
          }
        );
      } catch (pushErr: unknown) {
        const errObj = pushErr as { statusCode?: number; message?: string };
        const statusCode = errObj?.statusCode ?? 0;

        // 410 Gone or 404 Not Found = subscription expired, clean it up
        if (statusCode === 410 || statusCode === 404) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
          console.log(`[push] Removed expired subscription ${sub.id}`);
        } else {
          console.error("[push] Send error:", pushErr);
        }
      }
    }
  } catch (err) {
    console.error("[push] sendPushToUser error:", err);
  }
}

/**
 * Send push notification to all participants of a thread (except sender).
 * Skips muted participants.
 */
export async function sendPushToThreadParticipants(
  threadId: string,
  senderUserId: string,
  payload: PushPayload
): Promise<void> {
  if (!vapidConfigured) return;

  try {
    const supabase = await createClient();

    // Get all non-muted participants except sender
    const { data: participants } = await supabase
      .from("thread_participants")
      .select("user_id, is_muted")
      .eq("thread_id", threadId)
      .neq("user_id", senderUserId);

    if (!participants) return;

    // Send in parallel for speed
    const pushPromises = participants
      .filter((p) => !p.is_muted)
      .map((p) => sendPushToUser(p.user_id, payload));

    await Promise.allSettled(pushPromises);
  } catch (err) {
    console.error("[push] sendPushToThreadParticipants error:", err);
  }
}
