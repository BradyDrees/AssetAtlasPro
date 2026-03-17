"use client";

import { useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Subscribe to real-time work order changes for a PM user.
 *
 * - Listens for INSERT/UPDATE/DELETE on `vendor_work_orders` filtered by pm_user_id
 * - Fallback polling every 60s via onPoll
 * - Channel cleanup + clearInterval on unmount
 *
 * Clustered refreshes acceptable for v1 — can debounce later if noisy.
 */
export function useRealtimeWorkOrders(
  userId: string | undefined,
  options: {
    /** Called when any WO change is detected. Caller should trigger router.refresh(). */
    onWoChange?: () => void;
    /** Called every 60s as a polling fallback. */
    onPoll?: () => void;
  }
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const stableOnWoChange = useCallback(
    options.onWoChange ?? (() => {}),
    [options.onWoChange]
  );
  const stableOnPoll = useCallback(
    options.onPoll ?? (() => {}),
    [options.onPoll]
  );

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`operate-wo:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vendor_work_orders",
          filter: `pm_user_id=eq.${userId}`,
        },
        () => {
          stableOnWoChange();
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.warn(
            "Realtime WO channel error — falling back to polling"
          );
        }
      });

    channelRef.current = channel;

    // Fallback polling every 60 seconds
    const interval = setInterval(() => {
      stableOnPoll();
    }, 60_000);

    return () => {
      clearInterval(interval);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, stableOnWoChange, stableOnPoll]);
}
