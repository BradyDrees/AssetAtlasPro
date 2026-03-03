"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getUnreadInboxCount } from "@/app/actions/messaging";
import { useRealtimeMessages } from "@/hooks/use-realtime-messages";

interface UnreadBadgeProps {
  /** CSS classes for the badge dot/count. Default: bg-red-500 */
  className?: string;
}

/**
 * Renders an unread message count badge.
 * Auto-refreshes via Supabase Realtime + 60s polling.
 * Renders nothing if count is 0.
 */
export function UnreadBadge({ className }: UnreadBadgeProps) {
  const [userId, setUserId] = useState<string>();
  const [count, setCount] = useState(0);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (data.user) setUserId(data.user.id);
      });
  }, []);

  const refresh = useCallback(async () => {
    const result = await getUnreadInboxCount();
    if (typeof result === "number") setCount(result);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useRealtimeMessages(userId, {
    onNewMessage: refresh,
    onNewThread: refresh,
    onPoll: refresh,
  });

  if (count === 0) return null;

  return (
    <span
      className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1 ${
        className ?? "bg-red-500"
      }`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
