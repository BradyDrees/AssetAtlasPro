"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import {
  getInboxThreads,
  getThreadMessages,
  sendMessage,
  markThreadRead,
  archiveThread,
  muteThread,
  getUnreadInboxCount,
} from "@/app/actions/messaging";
import { useRealtimeMessages } from "@/hooks/use-realtime-messages";
import type { InboxThread, ThreadMessage } from "@/lib/messaging/types";
import { ThreadList } from "./thread-list";
import { ConversationView } from "./conversation-view";

// ── Product theme config ──
export type Product = "pro" | "vendor" | "operate" | "home";

export const productTheme = {
  vendor: {
    bubbleBg: "bg-brand-600",
    bubbleText: "text-white",
    badgeBg: "bg-brand-600",
    avatarBg: "bg-brand-100",
    avatarText: "text-brand-700",
    accentText: "text-brand-600",
    accentBorder: "border-brand-600",
    hoverBg: "hover:bg-brand-50",
    activeBg: "bg-brand-50",
    activeRing: "ring-brand-200",
    sendBg: "bg-brand-600 hover:bg-brand-700",
    inboxPath: "/vendor/inbox",
  },
  pro: {
    bubbleBg: "bg-amber-600",
    bubbleText: "text-white",
    badgeBg: "bg-amber-600",
    avatarBg: "bg-amber-100",
    avatarText: "text-amber-700",
    accentText: "text-amber-600",
    accentBorder: "border-amber-600",
    hoverBg: "hover:bg-amber-50",
    activeBg: "bg-amber-50",
    activeRing: "ring-amber-200",
    sendBg: "bg-amber-600 hover:bg-amber-700",
    inboxPath: "/pro/inbox",
  },
  operate: {
    bubbleBg: "bg-green-600",
    bubbleText: "text-white",
    badgeBg: "bg-green-600",
    avatarBg: "bg-green-100",
    avatarText: "text-green-700",
    accentText: "text-green-600",
    accentBorder: "border-green-600",
    hoverBg: "hover:bg-green-50",
    activeBg: "bg-green-50",
    activeRing: "ring-green-200",
    sendBg: "bg-green-600 hover:bg-green-700",
    inboxPath: "/operate/inbox",
  },
  home: {
    bubbleBg: "bg-rose-600",
    bubbleText: "text-white",
    badgeBg: "bg-rose-500",
    avatarBg: "bg-rose-100",
    avatarText: "text-rose-700",
    accentText: "text-rose-600",
    accentBorder: "border-rose-600",
    hoverBg: "hover:bg-rose-50",
    activeBg: "bg-rose-50",
    activeRing: "ring-rose-200",
    sendBg: "bg-rose-600 hover:bg-rose-700",
    inboxPath: "/home/inbox",
  },
} as const;

interface InboxPageProps {
  product: Product;
  /** If provided, auto-select this thread on mount */
  initialThreadId?: string;
}

export function InboxPage({ product, initialThreadId }: InboxPageProps) {
  const t = useTranslations("messaging");
  const theme = productTheme[product];

  // ── State ──
  const [userId, setUserId] = useState<string>();
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(
    initialThreadId ?? null
  );
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [filter, setFilter] = useState<"all" | "unread" | "archived">("all");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // ── Get current user ──
  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (data.user) setUserId(data.user.id);
      });
  }, []);

  // ── Load threads ──
  const loadThreads = useCallback(async () => {
    const result = await getInboxThreads({ filter, limit: 50 });
    if (!result.error) {
      setThreads(result.data);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    loadThreads();
  }, [loadThreads]);

  // ── Load unread count ──
  const loadUnreadCount = useCallback(async () => {
    const result = await getUnreadInboxCount();
    if (typeof result === "number") setUnreadCount(result);
  }, []);

  useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  // ── Load messages when active thread changes ──
  const loadMessages = useCallback(async (threadId: string) => {
    setMessagesLoading(true);
    const result = await getThreadMessages({ thread_id: threadId, limit: 50 });
    if (!result.error) {
      setMessages(result.data);
    }
    setMessagesLoading(false);
    // Mark as read
    await markThreadRead(threadId);
    // Refresh threads to update unread badges
    loadThreads();
    loadUnreadCount();
  }, [loadThreads, loadUnreadCount]);

  useEffect(() => {
    if (activeThreadId) {
      loadMessages(activeThreadId);
    } else {
      setMessages([]);
    }
  }, [activeThreadId, loadMessages]);

  // ── Realtime subscriptions ──
  useRealtimeMessages(userId, {
    onNewMessage: useCallback(
      (payload: { thread_id: string; sender_id: string; body: string | null; message_type: string }) => {
        // If message is for the active thread, append it
        if (activeThreadId && payload.thread_id === activeThreadId) {
          loadMessages(activeThreadId);
        }
        // Always refresh thread list to update order/preview
        loadThreads();
        loadUnreadCount();
      },
      [activeThreadId, loadMessages, loadThreads, loadUnreadCount]
    ),
    onNewThread: useCallback(() => {
      loadThreads();
      loadUnreadCount();
    }, [loadThreads, loadUnreadCount]),
    onPoll: useCallback(() => {
      loadThreads();
      loadUnreadCount();
    }, [loadThreads, loadUnreadCount]),
  });

  // ── Handlers ──
  const handleSelectThread = useCallback((threadId: string) => {
    setActiveThreadId(threadId);
    // Update URL without full navigation
    const path = productTheme[product].inboxPath;
    window.history.replaceState(null, "", `${path}/${threadId}`);
  }, [product]);

  const handleBack = useCallback(() => {
    setActiveThreadId(null);
    setMessages([]);
    const path = productTheme[product].inboxPath;
    window.history.replaceState(null, "", path);
  }, [product]);

  const handleSendMessage = useCallback(
    async (body: string) => {
      if (!activeThreadId) return;
      const result = await sendMessage({ thread_id: activeThreadId, body });
      if (!result.error) {
        // Reload messages to get the new one
        loadMessages(activeThreadId);
      }
    },
    [activeThreadId, loadMessages]
  );

  const handleArchive = useCallback(
    async (threadId: string) => {
      await archiveThread(threadId);
      if (activeThreadId === threadId) {
        setActiveThreadId(null);
      }
      loadThreads();
    },
    [activeThreadId, loadThreads]
  );

  const handleMute = useCallback(
    async (threadId: string, muted: boolean) => {
      await muteThread(threadId, muted);
      loadThreads();
    },
    [loadThreads]
  );

  // ── Active thread data ──
  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

  // ── Layout ──
  // Mobile: show either list or conversation (not both)
  // Desktop: two-panel split
  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-[calc(100vh-1.5rem)] -m-4 md:-m-6 -mt-14 md:-mt-6">
      {/* Thread list panel */}
      <div
        className={`w-full md:w-80 lg:w-96 md:border-r border-edge-primary flex-shrink-0 flex flex-col bg-surface-primary ${
          activeThreadId ? "hidden md:flex" : "flex"
        }`}
      >
        <ThreadList
          threads={threads}
          activeThreadId={activeThreadId}
          filter={filter}
          onFilterChange={setFilter}
          onSelectThread={handleSelectThread}
          onArchive={handleArchive}
          onMute={handleMute}
          loading={loading}
          product={product}
          theme={theme}
          userId={userId}
        />
      </div>

      {/* Conversation panel */}
      <div
        className={`flex-1 flex flex-col bg-surface-primary ${
          activeThreadId ? "flex" : "hidden md:flex"
        }`}
      >
        {activeThread ? (
          <ConversationView
            thread={activeThread}
            messages={messages}
            loading={messagesLoading}
            userId={userId}
            product={product}
            theme={theme}
            onBack={handleBack}
            onSend={handleSendMessage}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-content-tertiary">
            <div className="text-center">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-content-quaternary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                />
              </svg>
              <p className="text-sm">{t("inbox.selectThread")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
