"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { VendorMessage } from "@/lib/vendor/types";
import {
  getMessageThread,
  sendMessage,
  markMessagesRead,
} from "@/app/actions/vendor-messages";

interface MessageThreadProps {
  workOrderId: string;
  tenantName?: string | null;
  tenantPhone?: string | null;
  propertyName?: string | null;
  onBack?: () => void;
}

export function MessageThread({
  workOrderId,
  tenantName,
  tenantPhone,
  propertyName,
  onBack,
}: MessageThreadProps) {
  const t = useTranslations("vendor.messages");
  const [messages, setMessages] = useState<VendorMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  const loadMessages = useCallback(async () => {
    const result = await getMessageThread(workOrderId);
    if (!result.error) {
      setMessages(result.data);
      // Mark inbound as read
      const hasUnread = result.data.some(
        (m) => m.direction === "inbound" && !m.read_at
      );
      if (hasUnread) {
        await markMessagesRead(workOrderId);
      }
    }
    setLoading(false);
  }, [workOrderId]);

  // Initial load + scroll
  useEffect(() => {
    loadMessages().then(() => {
      setTimeout(scrollToBottom, 100);
    });
  }, [loadMessages, scrollToBottom]);

  // Poll for new messages every 10s
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      const result = await getMessageThread(workOrderId);
      if (!result.error && result.data.length !== messages.length) {
        setMessages(result.data);
        scrollToBottom();
        const hasUnread = result.data.some(
          (m) => m.direction === "inbound" && !m.read_at
        );
        if (hasUnread) {
          await markMessagesRead(workOrderId);
        }
      }
    }, 10000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [workOrderId, messages.length, scrollToBottom]);

  const handleSend = useCallback(async () => {
    const trimmed = body.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError(null);

    const result = await sendMessage(workOrderId, trimmed);
    if (result.error && !result.data) {
      setError(result.error);
    } else {
      setBody("");
      await loadMessages();
      setTimeout(scrollToBottom, 100);
    }
    setSending(false);
    inputRef.current?.focus();
  }, [body, sending, workOrderId, loadMessages, scrollToBottom]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    }
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-content-quaternary text-sm">{t("loading")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-edge-primary bg-surface-primary">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-content-tertiary hover:text-content-primary -ml-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-content-primary truncate">
            {tenantName || tenantPhone || t("unknownContact")}
          </h3>
          {propertyName && (
            <p className="text-xs text-content-quaternary truncate">{propertyName}</p>
          )}
        </div>
        {tenantPhone && (
          <span className="text-xs font-mono text-content-quaternary">{tenantPhone}</span>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-content-quaternary">{t("noMessages")}</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOutbound = msg.direction === "outbound";
            const isCall = msg.message_type === "call";
            const isFailed = msg.status === "failed";

            // Call log entry — centered
            if (isCall) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-secondary rounded-full">
                    <svg className="w-3.5 h-3.5 text-content-quaternary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                    <span className="text-xs text-content-quaternary">
                      {isOutbound ? t("callOutbound") : t("callInbound")}
                      {msg.duration_seconds != null && ` · ${Math.ceil(msg.duration_seconds / 60)} min`}
                    </span>
                    <span className="text-[10px] text-content-muted">{formatTime(msg.created_at)}</span>
                  </div>
                </div>
              );
            }

            // SMS bubble
            return (
              <div
                key={msg.id}
                className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                    isOutbound
                      ? isFailed
                        ? "bg-red-600/20 text-red-300"
                        : "bg-brand-600 text-white"
                      : "bg-surface-secondary text-content-primary"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                  <div className={`flex items-center gap-1 mt-0.5 ${isOutbound ? "justify-end" : "justify-start"}`}>
                    <span className={`text-[10px] ${isOutbound ? (isFailed ? "text-red-400" : "text-white/60") : "text-content-muted"}`}>
                      {formatTime(msg.created_at)}
                    </span>
                    {isFailed && (
                      <span className="text-[10px] text-red-400 font-medium">{t("failed")}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-red-600/10 border-t border-red-600/20">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="px-3 py-2 border-t border-edge-primary bg-surface-primary">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={t("typeMessage")}
            rows={1}
            className="flex-1 px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-xl text-content-primary placeholder:text-content-muted resize-none max-h-24 focus:outline-none focus:border-brand-500"
            style={{ minHeight: "38px" }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!body.trim() || sending}
            className="flex-shrink-0 p-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-500 disabled:opacity-40 transition-colors"
          >
            {sending ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
