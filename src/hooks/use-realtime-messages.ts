"use client";

import { useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Subscribe to real-time message inserts and new thread participation.
 *
 * - Listens for INSERT on `messages` table → fires onNewMessage
 * - Listens for INSERT on `thread_participants` where user_id = current user → fires onNewThread
 * - Fallback polling every 60s via onPoll
 *
 * RLS protects the DB queries; Supabase Realtime broadcasts broadly,
 * so the caller must filter client-side by thread membership.
 */
export function useRealtimeMessages(
  userId: string | undefined,
  options: {
    /** Called when a new message is inserted (any thread). Caller should filter by thread membership. */
    onNewMessage?: (payload: {
      thread_id: string;
      sender_id: string;
      body: string | null;
      message_type: string;
    }) => void;
    /** Called when the current user is added to a new thread. */
    onNewThread?: (payload: { thread_id: string }) => void;
    /** Called every 60s as a polling fallback — use to refetch inbox. */
    onPoll?: () => void;
  }
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const stableOnNewMessage = useCallback(
    options.onNewMessage ?? (() => {}),
    [options.onNewMessage]
  );
  const stableOnNewThread = useCallback(
    options.onNewThread ?? (() => {}),
    [options.onNewThread]
  );
  const stableOnPoll = useCallback(
    options.onPoll ?? (() => {}),
    [options.onPoll]
  );

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`messaging:${userId}`)
      // New messages — subscribe broadly, filter client-side
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          // Don't fire for messages sent by the current user
          if (row.sender_id === userId) return;
          stableOnNewMessage({
            thread_id: row.thread_id as string,
            sender_id: row.sender_id as string,
            body: (row.body as string) ?? null,
            message_type: (row.message_type as string) ?? "text",
          });
        }
      )
      // New thread participation — user was added to a conversation
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "thread_participants",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          stableOnNewThread({
            thread_id: row.thread_id as string,
          });
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.warn(
            "Realtime messaging channel error — falling back to polling"
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
  }, [userId, stableOnNewMessage, stableOnNewThread, stableOnPoll]);
}
