"use client";

import { useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Subscribe to real-time vendor_notifications inserts for the current user.
 * Falls back to polling if realtime connection fails.
 */
export function useRealtimeNotifications(
  userId: string | undefined,
  onNewNotification: () => void
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const stableCallback = useCallback(onNewNotification, [onNewNotification]);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "vendor_notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          stableCallback();
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("Realtime notification channel error — falling back to polling");
        }
      });

    channelRef.current = channel;

    // Fallback polling every 2 minutes
    const interval = setInterval(() => {
      stableCallback();
    }, 120000);

    return () => {
      clearInterval(interval);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, stableCallback]);
}
