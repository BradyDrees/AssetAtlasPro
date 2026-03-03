"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "./inbox-page";
import { productTheme } from "./inbox-page";

interface TypingIndicatorProps {
  threadId: string;
  userId: string | undefined;
  product: Product;
}

/**
 * Typing indicator via Supabase Realtime Presence.
 * Broadcasts "typing" state to other participants in the thread.
 */
export function TypingIndicator({
  threadId,
  userId,
  product,
}: TypingIndicatorProps) {
  const theme = productTheme[product];
  const [typingUsers, setTypingUsers] = useState<
    Array<{ user_id: string; name?: string }>
  >([]);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  useEffect(() => {
    if (!threadId || !userId) return;

    const supabase = createClient();
    const channel = supabase.channel(`typing:${threadId}`, {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{
          user_id: string;
          name?: string;
          typing: boolean;
        }>();
        const typing: Array<{ user_id: string; name?: string }> = [];
        for (const [, presences] of Object.entries(state)) {
          for (const p of presences) {
            if (p.user_id !== userId && p.typing) {
              typing.push({ user_id: p.user_id, name: p.name });
            }
          }
        }
        setTypingUsers(typing);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [threadId, userId]);

  if (typingUsers.length === 0) return null;

  const names = typingUsers
    .map((u) => u.name || "Someone")
    .slice(0, 3)
    .join(", ");

  return (
    <div className="px-4 py-1.5">
      <div className="flex items-center gap-2">
        {/* Animated dots */}
        <div className="flex gap-0.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${theme.badgeBg} animate-bounce`}
            style={{ animationDelay: "0ms" }}
          />
          <span
            className={`w-1.5 h-1.5 rounded-full ${theme.badgeBg} animate-bounce`}
            style={{ animationDelay: "150ms" }}
          />
          <span
            className={`w-1.5 h-1.5 rounded-full ${theme.badgeBg} animate-bounce`}
            style={{ animationDelay: "300ms" }}
          />
        </div>
        <span className="text-[11px] text-content-quaternary italic">
          {names} typing…
        </span>
      </div>
    </div>
  );
}

/**
 * Hook to broadcast typing state.
 * Call `startTyping()` on keystrokes, auto-clears after 3s of inactivity.
 */
export function useTypingBroadcast(
  threadId: string | null,
  userId: string | undefined
) {
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!threadId || !userId) return;

    const supabase = createClient();
    const channel = supabase.channel(`typing:${threadId}`, {
      config: { presence: { key: userId } },
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ user_id: userId, typing: false });
      }
    });

    channelRef.current = channel;

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [threadId, userId]);

  const startTyping = useCallback(() => {
    if (!channelRef.current || !userId) return;

    channelRef.current.track({ user_id: userId, typing: true });

    // Clear after 3 seconds of inactivity
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      channelRef.current?.track({ user_id: userId, typing: false });
    }, 3000);
  }, [userId]);

  const stopTyping = useCallback(() => {
    if (!channelRef.current || !userId) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    channelRef.current.track({ user_id: userId, typing: false });
  }, [userId]);

  return { startTyping, stopTyping };
}
