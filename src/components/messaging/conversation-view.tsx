"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useFormatDate } from "@/hooks/use-format-date";
import type { InboxThread, ThreadMessage } from "@/lib/messaging/types";
import type { Product } from "./inbox-page";
import { productTheme } from "./inbox-page";
import { TypingIndicator, useTypingBroadcast } from "./typing-indicator";
import { AddParticipantModal } from "./add-participant-modal";

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

/** Check if message is within 15-min edit window */
function isEditable(msg: ThreadMessage, userId: string | undefined): boolean {
  if (msg.sender_id !== userId) return false;
  if (msg.is_deleted) return false;
  if (msg.message_type !== "text") return false;
  const createdAt = new Date(msg.created_at).getTime();
  return Date.now() - createdAt < 15 * 60 * 1000;
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
  onEdit?: (messageId: string, newBody: string) => Promise<{ error?: string }>;
  onDelete?: (messageId: string) => Promise<{ error?: string }>;
  onArchive?: () => void;
  onMute?: (muted: boolean) => void;
  onRefreshMessages?: () => void;
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
  onEdit,
  onDelete,
  onArchive,
  onMute,
  onRefreshMessages,
}: ConversationViewProps) {
  const t = useTranslations("messaging");
  const { formatDate: fmtDate, formatRelativeDate } = useFormatDate();

  const formatMessageTime = useCallback((dateStr: string): string => {
    const d = new Date(dateStr);
    const hh = d.getHours();
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ampm = hh >= 12 ? "PM" : "AM";
    const h12 = hh % 12 || 12;
    return `${h12}:${mm} ${ampm}`;
  }, []);

  const formatDateSeparator = useCallback(
    (dateStr: string): string => {
      const d = new Date(dateStr);
      const now = new Date();
      const diff = now.getTime() - d.getTime();
      const dayMs = 86400_000;

      if (diff < dayMs && d.getDate() === now.getDate())
        return formatRelativeDate(d);
      if (diff < dayMs * 2) return formatRelativeDate(d);
      return fmtDate(d);
    },
    [fmtDate, formatRelativeDate]
  );

  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Edit state
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  // Context menu for message actions
  const [contextMsgId, setContextMsgId] = useState<string | null>(null);

  // Add participant modal
  const [showAddParticipant, setShowAddParticipant] = useState(false);

  // Thread actions dropdown
  const [showActions, setShowActions] = useState(false);

  // Typing broadcast
  const { startTyping, stopTyping } = useTypingBroadcast(
    thread.id,
    userId
  );

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
    stopTyping();
    try {
      await onSend(trimmed);
    } catch {
      setBody(trimmed); // restore on error
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleStartEdit = (msg: ThreadMessage) => {
    setEditingMsgId(msg.id);
    setEditBody(msg.body || "");
    setContextMsgId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingMsgId || !onEdit) return;
    const trimmed = editBody.trim();
    if (!trimmed) return;
    const result = await onEdit(editingMsgId, trimmed);
    if (!result.error) {
      setEditingMsgId(null);
      setEditBody("");
    }
  };

  const handleCancelEdit = () => {
    setEditingMsgId(null);
    setEditBody("");
  };

  const handleDelete = async (msgId: string) => {
    if (!onDelete) return;
    setContextMsgId(null);
    await onDelete(msgId);
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

        {/* Header actions */}
        <div className="flex items-center gap-1 relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-1.5 text-content-tertiary hover:text-content-primary rounded-lg hover:bg-surface-secondary"
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
                d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
              />
            </svg>
          </button>

          {/* Actions dropdown */}
          {showActions && (
            <div className="absolute top-full right-0 mt-1 w-48 bg-surface-primary border border-edge-primary rounded-lg shadow-lg z-10 py-1">
              <button
                onClick={() => {
                  setShowAddParticipant(true);
                  setShowActions(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-content-primary hover:bg-surface-secondary"
              >
                {t("thread.addParticipant")}
              </button>
              <button
                onClick={() => {
                  setShowActions(false);
                  // Show participants
                }}
                className="w-full text-left px-4 py-2 text-sm text-content-primary hover:bg-surface-secondary"
              >
                {t("thread.participants")} ({(thread.participants ?? []).length})
              </button>
              <hr className="my-1 border-edge-secondary" />
              {onMute && (
                <button
                  onClick={() => {
                    onMute(!thread.is_muted);
                    setShowActions(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-content-primary hover:bg-surface-secondary"
                >
                  {thread.is_muted ? t("thread.unmute") : t("thread.mute")}
                </button>
              )}
              {onArchive && (
                <button
                  onClick={() => {
                    onArchive();
                    setShowActions(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-surface-secondary"
                >
                  {t("thread.archive")}
                </button>
              )}
            </div>
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
            const isCallLog = msg.message_type === "call_log";
            const showDate = shouldShowDateSeparator(msg, prev);
            const showTime = shouldShowTimestamp(msg, prev);
            const canEdit = isEditable(msg, userId);
            const isBeingEdited = editingMsgId === msg.id;
            const showContext = contextMsgId === msg.id;

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
                ) : isCallLog ? (
                  /* Call log entry — rendered inline */
                  <div className="flex items-center justify-center py-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-secondary text-xs text-content-tertiary">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                      </svg>
                      <span>
                        {msg.call_duration_seconds
                          ? `${Math.floor(msg.call_duration_seconds / 60)}:${(msg.call_duration_seconds % 60).toString().padStart(2, "0")}`
                          : t("calls.missed")}
                      </span>
                      <span className="text-content-quaternary">
                        {formatMessageTime(msg.created_at)}
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Regular message bubble */
                  <div
                    className={`flex ${
                      isOwn ? "justify-end" : "justify-start"
                    } ${showTime ? "mt-3" : "mt-0.5"} group`}
                  >
                    <div
                      className={`max-w-[80%] md:max-w-[60%] relative ${
                        isOwn ? "order-2" : "order-1"
                      }`}
                    >
                      {/* Sender name + time */}
                      {showTime && !isOwn && (
                        <p className="text-[11px] text-content-quaternary mb-0.5 ml-1">
                          {msg.sender_name || "Unknown"}
                        </p>
                      )}

                      {/* Edit mode */}
                      {isBeingEdited ? (
                        <div className="space-y-2">
                          <textarea
                            value={editBody}
                            onChange={(e) => setEditBody(e.target.value)}
                            className="w-full px-3 py-2 bg-surface-secondary border border-edge-primary rounded-xl text-sm text-content-primary focus:outline-none focus:ring-1 focus:ring-content-tertiary resize-none"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={handleCancelEdit}
                              className="px-2 py-1 text-xs text-content-tertiary hover:text-content-primary"
                            >
                              {t("thread.cancelEdit")}
                            </button>
                            <button
                              onClick={handleSaveEdit}
                              className={`px-2 py-1 text-xs text-white rounded-md ${theme.sendBg}`}
                            >
                              {t("thread.saveEdit")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div
                            className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                              isOwn
                                ? `${theme.bubbleBg} ${theme.bubbleText} rounded-br-md`
                                : "bg-surface-tertiary text-content-primary rounded-bl-md"
                            }`}
                            onContextMenu={(e) => {
                              if (isOwn && (canEdit || !msg.is_deleted)) {
                                e.preventDefault();
                                setContextMsgId(
                                  showContext ? null : msg.id
                                );
                              }
                            }}
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

                          {/* Context menu for edit/delete */}
                          {showContext && isOwn && !msg.is_deleted && (
                            <div
                              className={`absolute ${
                                isOwn ? "right-0" : "left-0"
                              } top-full mt-1 bg-surface-primary border border-edge-primary rounded-lg shadow-lg z-10 py-1 min-w-[120px]`}
                            >
                              {canEdit && onEdit && (
                                <button
                                  onClick={() => handleStartEdit(msg)}
                                  className="w-full text-left px-3 py-1.5 text-xs text-content-primary hover:bg-surface-secondary"
                                >
                                  {t("thread.editMessage")}
                                </button>
                              )}
                              {onDelete && (
                                <button
                                  onClick={() => handleDelete(msg.id)}
                                  className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-surface-secondary"
                                >
                                  {t("thread.deleteMessage")}
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {/* Timestamp */}
                      {showTime && !isBeingEdited && (
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

      {/* ── Typing Indicator ── */}
      <TypingIndicator threadId={thread.id} userId={userId} product={product} />

      {/* ── Message Input ── */}
      <div className="flex-shrink-0 border-t border-edge-primary bg-surface-primary px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              startTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            onBlur={stopTyping}
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

      {/* ── Add Participant Modal ── */}
      {showAddParticipant && (
        <AddParticipantModal
          threadId={thread.id}
          existingParticipantIds={(thread.participants ?? []).map(
            (p) => p.user_id
          )}
          product={product}
          onAdded={() => {
            onRefreshMessages?.();
          }}
          onClose={() => setShowAddParticipant(false)}
        />
      )}
    </div>
  );
}
