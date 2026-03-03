"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Server-side push notification sender.
 * Uses the web-push protocol via fetch (no external npm dependency).
 *
 * For production, install `web-push` and use VAPID keys:
 *   npm install web-push
 *   const webpush = require('web-push');
 *   webpush.setVapidDetails('mailto:...', publicKey, privateKey);
 *
 * This implementation is a stub that logs push payloads.
 * Replace with actual web-push calls once VAPID keys are configured.
 */

interface PushPayload {
  title: string;
  body: string;
  url?: string; // Deep link URL
  icon?: string;
  tag?: string; // Notification grouping tag
}

/**
 * Send a push notification to a specific user.
 * Skips if user has muted notifications or is within quiet hours.
 */
export async function sendPushToUser(
  targetUserId: string,
  payload: PushPayload
): Promise<void> {
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

    // TODO: Check quiet hours preference from user profile
    // const { data: profile } = await supabase
    //   .from("profiles")
    //   .select("quiet_hours_start, quiet_hours_end, timezone")
    //   .eq("id", targetUserId)
    //   .single();
    //
    // if (isWithinQuietHours(profile)) return;

    for (const sub of subscriptions) {
      try {
        // Stub: log the push payload
        // In production, use web-push library:
        //
        // await webpush.sendNotification(
        //   {
        //     endpoint: sub.endpoint,
        //     keys: { p256dh: sub.p256dh, auth: sub.auth_key },
        //   },
        //   JSON.stringify(payload)
        // );

        console.log(
          `[push] Would send to ${targetUserId}:`,
          JSON.stringify(payload).slice(0, 200)
        );
      } catch (pushErr) {
        // If subscription is expired/invalid, clean it up
        const errStr = String(pushErr);
        if (errStr.includes("410") || errStr.includes("expired")) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
        }
        console.error("[push] Send error:", pushErr);
      }
    }
  } catch (err) {
    console.error("[push] sendPushToUser error:", err);
  }
}

/**
 * Send push notification to all participants of a thread (except sender).
 */
export async function sendPushToThreadParticipants(
  threadId: string,
  senderUserId: string,
  payload: PushPayload
): Promise<void> {
  try {
    const supabase = await createClient();

    // Get all non-muted participants except sender
    const { data: participants } = await supabase
      .from("thread_participants")
      .select("user_id, is_muted")
      .eq("thread_id", threadId)
      .neq("user_id", senderUserId);

    if (!participants) return;

    for (const p of participants) {
      if (p.is_muted) continue; // Skip muted participants
      await sendPushToUser(p.user_id, payload);
    }
  } catch (err) {
    console.error("[push] sendPushToThreadParticipants error:", err);
  }
}
