"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { InboxThread, ThreadMessage } from "@/lib/messaging/types";
import type { Product } from "./inbox-page";
import { productTheme } from "./inbox-page";

// ── Time formatting ──
function formatMessageTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateSeparator(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const dayMs = 86400_000;

  if (diff < dayMs && d.getDate() === now.getDate()) return "Today";
  if (diff < dayMs * 2) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function shouldShowDateSeparator(
  current: ThreadMessage,
  previous: ThreadMessage | undefined
): boolean {
  if (!previous) return true;
  const curr = new Date(current.created_at);
  const prev = new Date(previous.created_at);
  return curr.toDateString() !== prev.toDateString();
}

function shouldShowTimestamp(
  current: ThreadMessage,
  previous: ThreadMessage | undefined
): boolean {
  if (!previous) return true;
  if (previous.sender_id !== current.sender_id) return true;
  const diff =
    new Date(current.created_at).getTime() -
    new Date(previous.created_at).getTime();
  return diff > 900_000; // 15 min gap
}

interface ConversationViewProps {
  thread: InboxThread;
  messages: ThreadMessage[];
  loading: boolean;
  userId: string | undefined;
  product: Product;
  theme: (typeof productTheme)[Product];
  onBack: () => void;
  onSend: (body: string) => Promise<void>;
}

export function ConversationView({
  thread,
  messages,
  loading,
  userId,
  product,
  theme,
  onBack,
  onSend,
}: ConversationViewProps) {
  const t = useTranslations("messaging");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [body]);

  const handleSend = async () => {
    const trimmed = body.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setBody("");
    try {
      await onSend(trimmed);
    } catch {
      setBody(trimmed); // restore on error
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  // ── Other participants ──
  const otherParticipants = (thread.participants ?? []).filter(
    (p) => p.user_id !== userId
  );
  const displayName =
    otherParticipants.length > 0
      ? otherParticipants.map((p) => p.display_name || "Unknown").join(", ")
      : t("thread.you");

  // ── Linked item info ──
  const linkedItemRoute =
    thread.thread_type === "work_order" && thread.work_order_id
      ? `/${product === "home" ? "home/work-orders" : product === "pro" ? "pro/jobs" : "operate/work-orders/new"}/${thread.work_order_id}`
      : thread.thread_type === "estimate" && thread.estimate_id
      ? `/${product === "pro" ? "pro/estimates" : "operate/estimates"}/${thread.estimate_id}`
      : null;

  const linkedBadge =
    thread.thread_type === "work_order"
      ? t("thread.workOrder")
      : thread.thread_type === "estimate"
      ? t("thread.estimate")
      : thread.thread_type === "job"
      ? t("thread.job")
      : null;

  // Sorted oldest→newest for display
  const sortedMessages = [...messages].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-edge-primary bg-surface-primary flex-shrink-0">
        {/* Back button (mobile) */}
        <button
          onClick={onBack}
          className="md:hidden p-1 -ml-1 text-content-tertiary hover:text-content-primary"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </button>

        {/* Avatar */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${theme.avatarBg} ${theme.avatarText}`}
        >
          {(displayName[0] ?? "?").toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-content-primary truncate">
            {displayName}
          </h2>
          {thread.title && (
            <p className="text-xs text-content-tertiary truncate">
              {thread.title}
            </p>
          )}
        </div>
      </div>

      {/* ── Linked Item Card ── */}
      {linkedBadge && linkedItemRoute && (
        <Link
          href={linkedItemRoute}
          className="mx-4 mt-3 px-3 py-2.5 rounded-lg border border-edge-secondary bg-surface-secondary hover:bg-surface-tertiary transition-colors"
        >
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${theme.avatarBg} ${theme.avatarText}`}
            >
              {linkedBadge}
            </span>
            <span className="text-xs text-content-secondary truncate">
              {thread.title || t("thread.viewLinkedItem")}
            </span>
            <svg
              className="w-3.5 h-3.5 ml-auto text-content-quaternary flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 4.5l7.5 7.5-7.5 7.5"
              />
            </svg>
          </div>
        </Link>
      )}

      {/* ── Messages Area ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-content-quaternary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sortedMessages.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-content-tertiary">
            {t("thread.noMessages")}
          </div>
        ) : (
          sortedMessages.map((msg, idx) => {
            const prev = idx > 0 ? sortedMessages[idx - 1] : undefined;
            const isOwn = msg.sender_id === userId;
            const isSystem = msg.message_type === "system";
            const showDate = shouldShowDateSeparator(msg, prev);
            const showTime = shouldShowTimestamp(msg, prev);

            return (
              <div key={msg.id}>
                {/* Date separator */}
                {showDate && (
                  <div className="flex items-center justify-center py-3">
                    <span className="text-[11px] text-content-quaternary bg-surface-secondary px-3 py-1 rounded-full">
                      {formatDateSeparator(msg.created_at)}
                    </span>
                  </div>
                )}

                {/* System message */}
                {isSystem ? (
                  <div className="flex items-center justify-center py-1.5">
                    <span className="text-[11px] text-content-quaternary italic">
                      {msg.body}
                    </span>
                  </div>
                ) : (
                  /* Regular message bubble */
                  <div
                    className={`flex ${
                      isOwn ? "justify-end" : "justify-start"
                    } ${showTime ? "mt-3" : "mt-0.5"}`}
                  >
                    <div
                      className={`max-w-[80%] md:max-w-[60%] ${
                        isOwn ? "order-2" : "order-1"
                      }`}
                    >
                      {/* Sender name + time */}
                      {showTime && !isOwn && (
                        <p className="text-[11px] text-content-quaternary mb-0.5 ml-1">
                          {msg.sender_name || "Unknown"}
                        </p>
                      )}

                      <div
                        className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                          isOwn
                            ? `${theme.bubbleBg} ${theme.bubbleText} rounded-br-md`
                            : "bg-surface-tertiary text-content-primary rounded-bl-md"
                        }`}
                      >
                        {msg.is_deleted ? (
                          <span className="italic text-content-quaternary text-xs">
                            {t("thread.deleted")}
                          </span>
                        ) : (
                          <>
                            <p className="whitespace-pre-wrap break-words">
                              {msg.body}
                            </p>
                            {msg.edited_at && (
                              <span
                                className={`text-[10px] ${
                                  isOwn
                                    ? "text-white/60"
                                    : "text-content-quaternary"
                                }`}
                              >
                                {" "}
                                ({t("thread.edited")})
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {/* Timestamp */}
                      {showTime && (
                        <p
                          className={`text-[10px] text-content-quaternary mt-0.5 ${
                            isOwn ? "text-right mr-1" : "ml-1"
                          }`}
                        >
                          {formatMessageTime(msg.created_at)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Message Input ── */}
      <div className="flex-shrink-0 border-t border-edge-primary bg-surface-primary px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={t("thread.typeMessage")}
            rows={1}
            className="flex-1 resize-none bg-surface-secondary border border-edge-primary rounded-xl px-3 py-2 text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-1 focus:ring-content-tertiary max-h-[120px]"
          />
          <button
            onClick={handleSend}
            disabled={!body.trim() || sending}
            className={`p-2.5 rounded-xl ${theme.sendBg} text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
